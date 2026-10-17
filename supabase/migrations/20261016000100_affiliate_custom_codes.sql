begin;
-- Historical codes stay reserved to their original owner and continue resolving.
create table public.affiliate_codes (
 code text primary key check (code = lower(code) and code ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
 profile_id uuid not null references public.affiliate_profiles(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index affiliate_codes_profile_idx on public.affiliate_codes(profile_id);
alter table public.affiliate_codes enable row level security;
revoke all on public.affiliate_codes from public,anon,authenticated,service_role;
insert into public.affiliate_codes(code,profile_id)
 select lower(code),id from public.affiliate_profiles where code is not null;
create unique index affiliate_profiles_code_lower_key on public.affiliate_profiles(lower(code));

create function public.affiliate_reserve_code() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.code is null then return new; end if;
 if new.code <> lower(new.code) or new.code !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' then
  raise exception 'invalid_affiliate_code' using errcode='22023';
 end if;
 insert into public.affiliate_codes(code,profile_id) values(new.code,new.id) on conflict(code) do nothing;
 if not exists(select 1 from public.affiliate_codes where code=new.code and profile_id=new.id) then
  raise exception 'affiliate_code_taken' using errcode='23505';
 end if;
 return new;
end $$;
create trigger affiliate_reserve_code after insert or update of code on public.affiliate_profiles
 for each row execute function public.affiliate_reserve_code();
revoke all on function public.affiliate_reserve_code() from public,anon,authenticated,service_role;

create function public.affiliate_code_available(p_code text) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p public.affiliate_profiles; c text := lower(trim(p_code));
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into p from public.affiliate_profiles where user_id=auth.uid();
 if p.id is null or p.status<>'approved' then raise exception 'affiliate_approval_required' using errcode='42501'; end if;
 if c is null or c !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' then raise exception 'invalid_affiliate_code' using errcode='22023'; end if;
 return jsonb_build_object('code',c,'available',not exists(select 1 from public.affiliate_codes where code=c and profile_id<>p.id),'current',c=p.code);
end $$;

create function public.affiliate_change_code(p_code text,p_version integer) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.affiliate_profiles; c text := lower(trim(p_code));
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if c is null or c !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' then raise exception 'invalid_affiliate_code' using errcode='22023'; end if;
 select * into p from public.affiliate_profiles where user_id=auth.uid() for update;
 if p.id is null or p.status<>'approved' then raise exception 'affiliate_approval_required' using errcode='42501'; end if;
 if p_version is null or p.version<>p_version then raise exception 'stale_version' using errcode='40001'; end if;
 if p.code=c then return jsonb_build_object('code',c,'version',p.version); end if;
 if (select count(*) from public.affiliate_audit_logs where actor_id=auth.uid() and action='change_code' and created_at>now()-interval '1 minute')>=5 then
  raise exception 'rate_limited' using errcode='P0001';
 end if;
 -- The unique registry and trigger arbitrate concurrent claims, including old aliases.
 begin
  update public.affiliate_profiles set code=c,version=version+1,updated_at=now() where id=p.id;
 exception when unique_violation then raise exception 'affiliate_code_taken' using errcode='23505';
 end;
 insert into public.affiliate_audit_logs(profile_id,actor_id,action,reason,previous_status,next_status)
 values(p.id,auth.uid(),'change_code',p.code||' -> '||c,p.status,p.status);
 return jsonb_build_object('code',c,'version',p.version+1);
end $$;
revoke all on function public.affiliate_code_available(text),public.affiliate_change_code(text,integer) from public,anon,service_role;
grant execute on function public.affiliate_code_available(text),public.affiliate_change_code(text,integer) to authenticated;

create or replace function public.affiliate_capture(p_code text,p_token_hash text,p_subject_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.affiliate_settings; p uuid; n integer; w timestamptz := date_trunc('hour',now());
begin
 select * into strict s from public.affiliate_settings where id;
 if not s.tracking_enabled then return jsonb_build_object('accepted',false); end if;
 delete from public.affiliate_rate_limits where window_start < now()-interval '2 days';
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_referral'; end if;
 insert into public.affiliate_rate_limits values(p_subject_hash,w,1)
 on conflict(subject_hash,window_start) do update set attempts=affiliate_rate_limits.attempts+1 returning attempts into n;
 if n>30 then return jsonb_build_object('limited',true); end if;
 select a.id into p from public.affiliate_codes c join public.affiliate_profiles a on a.id=c.profile_id
 where c.code=lower(trim(p_code)) and a.status='approved';
 if p is null then return jsonb_build_object('accepted',false); end if;
 insert into public.affiliate_referrals(profile_id,token_hash,consent_version,expires_at)
 values(p,p_token_hash,'marketing-v1',now()+make_interval(days=>s.attribution_days));
 return jsonb_build_object('accepted',true,'max_age',s.attribution_days*86400);
end $$;
revoke all on function public.affiliate_capture(text,text,text) from public,anon,authenticated;
grant execute on function public.affiliate_capture(text,text,text) to service_role;
commit;
