create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null check (length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  subject text not null check (length(btrim(subject)) between 3 and 120),
  description text not null check (length(btrim(description)) between 10 and 5000),
  origin_hash text not null check (length(origin_hash) = 64)
);
create index support_messages_email_time on public.support_messages(email, created_at desc);
create index support_messages_origin_time on public.support_messages(origin_hash, created_at desc);
alter table public.support_messages enable row level security;
revoke all on public.support_messages from anon, authenticated;
grant select on public.support_messages to authenticated;
create policy support_admin_read on public.support_messages for select to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'developer'));

create function public.submit_support_message(p_email text, p_subject text, p_description text, p_origin_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; email_key text := lower(btrim(p_email));
begin
  -- One lock covers both limits, including concurrent submissions from different servers.
  perform pg_advisory_xact_lock(729401923);
  if exists (select 1 from public.support_messages where (email = email_key or origin_hash = p_origin_hash) and created_at > now() - interval '1 minute')
    or (select count(*) from public.support_messages where email = email_key and created_at > now() - interval '48 hours') >= 5
    or (select count(*) from public.support_messages where origin_hash = p_origin_hash and created_at > now() - interval '48 hours') >= 5 then
    raise exception 'support_rate_limit' using errcode = 'P0001';
  end if;
  insert into public.support_messages(email, subject, description, origin_hash)
  values (email_key, btrim(p_subject), btrim(p_description), p_origin_hash) returning id into result;
  return result;
end;
$$;
revoke all on function public.submit_support_message(text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_support_message(text,text,text,text) to service_role;
