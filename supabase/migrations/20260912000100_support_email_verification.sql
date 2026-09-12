alter table public.support_messages add column email_verified_at timestamptz;

create table public.support_email_challenges (
  id uuid primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  email text not null check (length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  subject text check (length(btrim(subject)) between 3 and 120),
  description text check (length(btrim(description)) between 10 and 5000),
  origin_hash text not null check (origin_hash ~ '^[a-f0-9]{64}$'),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  attempts integer not null default 0 check (attempts between 0 and 5),
  message_id uuid references public.support_messages(id)
);
create index support_challenges_email_time on public.support_email_challenges(email, created_at desc);
create index support_challenges_origin_time on public.support_email_challenges(origin_hash, created_at desc);
alter table public.support_email_challenges enable row level security;
revoke all on public.support_email_challenges from public, anon, authenticated;

create function public.request_support_code(p_id uuid, p_email text, p_subject text, p_description text, p_origin_hash text, p_code_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare email_key text := lower(btrim(p_email));
begin
  perform pg_advisory_xact_lock(729401923);
  delete from public.support_email_challenges where created_at < now() - interval '48 hours';
  update public.support_email_challenges set subject = null, description = null
    where expires_at <= now() and (subject is not null or description is not null);
  if p_subject is null or p_description is null then raise exception 'Invalid payload'; end if;
  if exists (select 1 from public.support_email_challenges where (email = email_key or origin_hash = p_origin_hash) and created_at > now() - interval '1 minute')
    or (select count(*) from public.support_email_challenges where email = email_key and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.support_email_challenges where origin_hash = p_origin_hash and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.support_email_challenges where email = email_key) >= 10
    or (select count(*) from public.support_email_challenges where origin_hash = p_origin_hash) >= 10
    or (select count(*) from public.support_messages where email = email_key and created_at > now() - interval '48 hours') >= 5
    or (select count(*) from public.support_messages where origin_hash = p_origin_hash and created_at > now() - interval '48 hours') >= 5 then
    return jsonb_build_object('error', 'rate_limit');
  end if;
  -- A resend invalidates every earlier code for this email.
  update public.support_email_challenges set expires_at = now(), subject = null, description = null
    where email = email_key and message_id is null;
  insert into public.support_email_challenges(id, email, subject, description, origin_hash, code_hash)
    values (p_id, email_key, btrim(p_subject), btrim(p_description), p_origin_hash, p_code_hash);
  return jsonb_build_object('id', p_id);
end;
$$;

create function public.confirm_support_code(p_id uuid, p_code_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare challenge public.support_email_challenges%rowtype; result uuid;
begin
  perform pg_advisory_xact_lock(729401923);
  select * into challenge from public.support_email_challenges where id = p_id for update;
  if not found then return jsonb_build_object('error','invalid_code'); end if;
  if challenge.expires_at <= now() then return jsonb_build_object('error','expired_code'); end if;
  if challenge.attempts >= 5 then return jsonb_build_object('error','locked_code'); end if;
  if p_code_hash is distinct from challenge.code_hash then
    update public.support_email_challenges set attempts = attempts + 1 where id = p_id;
    -- Return, don't raise: failed attempts must commit.
    return jsonb_build_object('error', case when challenge.attempts >= 4 then 'locked_code' else 'invalid_code' end);
  end if;
  if challenge.message_id is not null then return jsonb_build_object('id', challenge.message_id); end if;
  begin
    result := public.submit_support_message(challenge.email, challenge.subject, challenge.description, challenge.origin_hash);
  exception when raise_exception then
    if sqlerrm = 'support_rate_limit' then return jsonb_build_object('error','rate_limit'); end if;
    raise;
  end;
  update public.support_messages set email_verified_at = now() where id = result;
  update public.support_email_challenges set message_id = result, subject = null, description = null where id = p_id;
  return jsonb_build_object('id', result);
end;
$$;
revoke all on function public.request_support_code(uuid,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.confirm_support_code(uuid,text) from public, anon, authenticated;
grant execute on function public.request_support_code(uuid,text,text,text,text,text) to service_role;
grant execute on function public.confirm_support_code(uuid,text) to service_role;
-- Keep the trusted server helper for rolling deployments. No public role can
-- invoke it; the new API only calls request_support_code/confirm_support_code.
