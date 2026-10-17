-- Phase 2: membership only. No referral tracking or financial balances enabled.
begin;
create table public.affiliate_levels (
  id text primary key,
  name text not null,
  minimum_sales integer not null unique check (minimum_sales >= 0),
  commission_bps integer not null check (commission_bps between 0 and 10000)
);
insert into public.affiliate_levels values
 ('initial','Inicial',0,2500),('bronze','Bronze',10,3000),('silver','Prata',30,3500),('gold','Ouro',60,4000);
create table public.affiliate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 2 and 100),
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  code text unique,
  level_id text not null default 'initial' references public.affiliate_levels(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('approved','suspended') or code is not null)
);
create table public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.affiliate_profiles(id) on delete restrict,
  channel text not null check (char_length(channel) between 5 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id) on delete restrict,
  decision_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create table public.affiliate_audit_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.affiliate_profiles(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  reason text,
  previous_status text,
  next_status text not null,
  created_at timestamptz not null default now()
);
create index affiliate_profiles_status_created_idx on public.affiliate_profiles(status,created_at desc,id);
create index affiliate_audit_actor_time_idx on public.affiliate_audit_logs(actor_id,created_at desc);
create index affiliate_audit_profile_time_idx on public.affiliate_audit_logs(profile_id,created_at desc);

create function public.affiliate_is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
 select coalesce(public.has_role(auth.uid(),'admin'::public.app_role),false)
     or coalesce(public.has_role(auth.uid(),'developer'::public.app_role),false)
$$;
revoke all on function public.affiliate_is_admin() from public,anon;
grant execute on function public.affiliate_is_admin() to authenticated;

alter table public.affiliate_levels enable row level security;
alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_applications enable row level security;
alter table public.affiliate_audit_logs enable row level security;
revoke all on public.affiliate_levels,public.affiliate_profiles,public.affiliate_applications,public.affiliate_audit_logs from anon,authenticated,service_role;
grant select on public.affiliate_levels,public.affiliate_profiles,public.affiliate_applications,public.affiliate_audit_logs to authenticated;
create policy affiliate_levels_read on public.affiliate_levels for select to authenticated using (true);
create policy affiliate_profiles_read on public.affiliate_profiles for select to authenticated
 using (user_id = auth.uid() or public.affiliate_is_admin());
create policy affiliate_applications_read on public.affiliate_applications for select to authenticated
 using (exists (select 1 from public.affiliate_profiles p where p.id = profile_id and (p.user_id = auth.uid() or public.affiliate_is_admin())));
create policy affiliate_audit_read on public.affiliate_audit_logs for select to authenticated using (public.affiliate_is_admin());

create function public.affiliate_apply(p_name text,p_channel text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_profile public.affiliate_profiles;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null) then
   raise exception 'email_confirmation_required' using errcode='42501';
 end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 100 or
    p_channel is null or char_length(trim(p_channel)) not between 5 and 500 then
   raise exception 'invalid_application' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('affiliate-apply:'||v_user::text,0));
 select * into v_profile from public.affiliate_profiles where user_id=v_user;
 -- At most one application per account in phase 2; repeats never reset a decision.
 if found then return jsonb_build_object('id',v_profile.id,'status',v_profile.status); end if;
 insert into public.affiliate_profiles(user_id,display_name) values(v_user,trim(p_name)) returning * into v_profile;
 insert into public.affiliate_applications(profile_id,channel) values(v_profile.id,trim(p_channel));
 insert into public.affiliate_audit_logs(profile_id,actor_id,action,next_status) values(v_profile.id,v_user,'application','pending');
 return jsonb_build_object('id',v_profile.id,'status',v_profile.status);
end $$;

create function public.affiliate_review(p_profile uuid,p_action text,p_reason text,p_version integer) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_profile public.affiliate_profiles; v_next text;
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_reason is null or char_length(trim(p_reason)) not between 3 and 1000 then
   raise exception 'reason_required' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('affiliate-admin:'||auth.uid()::text,0));
 if (select count(*) from public.affiliate_audit_logs where actor_id=auth.uid() and created_at>now()-interval '1 minute')>=60 then
   raise exception 'rate_limited' using errcode='P0001';
 end if;
 select * into v_profile from public.affiliate_profiles where id=p_profile for update;
 if not found then raise exception 'profile_not_found' using errcode='P0002'; end if;
 if p_version is null or v_profile.version<>p_version then raise exception 'stale_version' using errcode='40001'; end if;
 v_next := case
   when p_action='approve' and v_profile.status='pending' then 'approved'
   when p_action='reject' and v_profile.status='pending' then 'rejected'
   when p_action='suspend' and v_profile.status='approved' then 'suspended'
   when p_action='reactivate' and v_profile.status='suspended' then 'approved'
   else null end;
 if v_next is null then raise exception 'invalid_transition' using errcode='22023'; end if;
 update public.affiliate_profiles set status=v_next,
   code=case when v_next='approved' then coalesce(code,replace(gen_random_uuid()::text,'-','')) else code end,
   version=version+1,updated_at=now() where id=p_profile;
 if v_profile.status='pending' then
   update public.affiliate_applications set status=v_next,decided_by=auth.uid(),decision_reason=trim(p_reason),decided_at=now() where profile_id=p_profile;
 end if;
 insert into public.affiliate_audit_logs(profile_id,actor_id,action,reason,previous_status,next_status)
   values(p_profile,auth.uid(),p_action,trim(p_reason),v_profile.status,v_next);
 return jsonb_build_object('status',v_next);
end $$;

create function public.affiliate_dashboard() returns jsonb
language sql stable security invoker set search_path = public, pg_temp as $$
 select jsonb_build_object(
  'profile',(select to_jsonb(p) from public.affiliate_profiles p where user_id=auth.uid()),
  'application',(select jsonb_build_object('channel',a.channel,'status',a.status,'decision_reason',a.decision_reason,'created_at',a.created_at)
    from public.affiliate_applications a join public.affiliate_profiles p on p.id=a.profile_id where p.user_id=auth.uid()),
  'levels',(select jsonb_agg(to_jsonb(l) order by minimum_sales) from public.affiliate_levels l),
  'tracking_enabled',false,'finance_enabled',false)
$$;
create function public.affiliate_admin_list(p_status text default 'all',p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_page is null or p_page not between 0 and 100000 or p_status is null or p_status not in ('all','pending','approved','rejected','suspended') then
  raise exception 'invalid_filter' using errcode='22023'; end if;
 return jsonb_build_object('total',(select count(*) from public.affiliate_profiles where p_status='all' or status=p_status),
 'items',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id) from
  (select p.*,a.channel,a.decision_reason,
   coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at desc,h.id) from
     (select id,actor_id,action,reason,previous_status,next_status,created_at from public.affiliate_audit_logs
      where profile_id=p.id order by created_at desc,id limit 10) h),'[]'::jsonb) as history
   from public.affiliate_profiles p join public.affiliate_applications a on a.profile_id=p.id
   where p_status='all' or p.status=p_status order by p.created_at desc,p.id limit 25 offset p_page*25) t),'[]'::jsonb));
end $$;
revoke all on function public.affiliate_apply(text,text),public.affiliate_review(uuid,text,text,integer),public.affiliate_dashboard(),public.affiliate_admin_list(text,integer) from public,anon;
grant execute on function public.affiliate_apply(text,text),public.affiliate_review(uuid,text,text,integer),public.affiliate_dashboard(),public.affiliate_admin_list(text,integer) to authenticated;
commit;
