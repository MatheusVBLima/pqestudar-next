begin;
create table public.affiliate_settings (
 id boolean primary key default true check(id), tracking_enabled boolean not null default false,
 attribution_days integer not null default 30 check(attribution_days between 1 and 90),
 security_days integer not null default 30 check(security_days between 1 and 365)
);
insert into public.affiliate_settings(id) values(true);
create table public.affiliate_referrals (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.affiliate_profiles(id),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 consent_version text not null check(consent_version='marketing-v1'),
 created_at timestamptz not null default now(), expires_at timestamptz not null, revoked_at timestamptz
);
create index affiliate_referrals_profile_idx on public.affiliate_referrals(profile_id,created_at);
create table public.affiliate_rate_limits (
 subject_hash text not null, window_start timestamptz not null, attempts integer not null,
 primary key(subject_hash,window_start)
);
create index affiliate_rate_limits_window_idx on public.affiliate_rate_limits(window_start);
create table public.affiliate_order_attributions (
 order_id uuid primary key references public.mercado_pago_orders(id) on delete restrict,
 profile_id uuid not null references public.affiliate_profiles(id),
 referral_id uuid not null references public.affiliate_referrals(id), created_at timestamptz not null default now()
);
create table public.affiliate_commissions (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.affiliate_order_attributions(order_id),
 profile_id uuid not null references public.affiliate_profiles(id),
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','pending_calculation','in_security','canceled')),
 rate_bps integer check(rate_bps between 0 and 10000),
 net_cents bigint check(net_cents between 0 and 5990), commission_cents bigint check(commission_cents between 0 and 5990),
 counted boolean not null default false, confirmed_at timestamptz, available_after timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((net_cents is null)=(commission_cents is null)),
 check(status<>'in_security' or (rate_bps is not null and net_cents is not null and available_after is not null))
);
create index affiliate_commissions_profile_idx on public.affiliate_commissions(profile_id,created_at desc,id);
create table public.affiliate_level_history (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.affiliate_profiles(id),
 commission_id uuid not null unique references public.affiliate_commissions(id), previous_level text not null,
 next_level text not null, rate_bps integer not null, valid_sales integer not null, created_at timestamptz not null default now()
);
create table public.affiliate_payment_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.affiliate_order_attributions(order_id),
 provider_event_key text not null unique, details jsonb not null, created_at timestamptz not null default now()
);
create table public.affiliate_reconciliations (
 id uuid primary key default gen_random_uuid(), commission_id uuid not null unique references public.affiliate_commissions(id),
 evidence_reference text not null unique, evidence_hash text not null check(evidence_hash ~ '^[a-f0-9]{64}$'),
 net_cents bigint not null check(net_cents between 0 and 5990), created_at timestamptz not null default now()
);
-- Raw payment/referral data is never SELECTable by affiliate browser sessions.
do $$ declare t text; begin
 foreach t in array array['affiliate_settings','affiliate_referrals','affiliate_rate_limits','affiliate_order_attributions','affiliate_commissions','affiliate_level_history','affiliate_payment_events','affiliate_reconciliations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

create function public.affiliate_capture(p_code text,p_token_hash text,p_subject_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.affiliate_settings; p uuid; n integer; w timestamptz := date_trunc('hour',now());
begin
 select * into strict s from public.affiliate_settings where id;
 if not s.tracking_enabled then return jsonb_build_object('accepted',false); end if;
 delete from public.affiliate_rate_limits where window_start < now()-interval '2 days';
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_subject_hash is null or p_subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_referral'; end if;
 insert into public.affiliate_rate_limits values(p_subject_hash,w,1)
 on conflict(subject_hash,window_start) do update set attempts=affiliate_rate_limits.attempts+1 returning attempts into n;
 -- Return instead of raising so the increment remains committed.
 if n>30 then return jsonb_build_object('limited',true); end if;
 select id into p from public.affiliate_profiles where code=p_code and status='approved';
 if p is null then return jsonb_build_object('accepted',false); end if;
 insert into public.affiliate_referrals(profile_id,token_hash,consent_version,expires_at)
 values(p,p_token_hash,'marketing-v1',now()+make_interval(days=>s.attribution_days));
 return jsonb_build_object('accepted',true,'max_age',s.attribution_days*86400);
end $$;
create function public.affiliate_revoke(p_token_hash text) returns void
language sql security definer set search_path=public,pg_temp as $$
 update public.affiliate_referrals set revoked_at=coalesce(revoked_at,now()) where token_hash=p_token_hash
$$;

-- Wrapper retains the existing checkout's checks and freezes even an unattributed order.
create function public.prepare_affiliate_mercado_pago_order(p_reference uuid,p_user uuid,p_email text,p_live boolean,p_seller text,p_site text,p_referral_hash text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb; r public.affiliate_referrals; p public.affiliate_profiles;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,14092026));
 if exists(select 1 from public.mercado_pago_orders where id=p_reference) then
  return public.prepare_mercado_pago_order(p_reference,p_user,p_email,p_live,p_seller,p_site);
 end if;
 result:=public.prepare_mercado_pago_order(p_reference,p_user,p_email,p_live,p_seller,p_site);
 if p_live and p_referral_hash is not null and (select tracking_enabled from public.affiliate_settings where id) then
  select * into r from public.affiliate_referrals where token_hash=p_referral_hash and revoked_at is null and expires_at>now() for share;
  if found then
   select * into p from public.affiliate_profiles where id=r.profile_id for share;
   if p.status='approved' and p.user_id<>p_user then
    insert into public.affiliate_order_attributions(order_id,profile_id,referral_id) values(p_reference,p.id,r.id);
    insert into public.affiliate_commissions(order_id,profile_id) values(p_reference,p.id);
   end if;
  end if;
 end if;
 return result;
end $$;

create function public.affiliate_order_status_changed() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.affiliate_commissions; p public.affiliate_profiles; l public.affiliate_levels; next_l public.affiliate_levels; total integer;
begin
 if new.status=old.status or not new.live_mode then return new; end if;
 select * into c from public.affiliate_commissions where order_id=new.id;
 if not found then return new; end if;
 -- Serialize confirmations for one affiliate; rate is frozen before this sale's promotion.
 select * into strict p from public.affiliate_profiles where id=c.profile_id for update;
 select * into strict c from public.affiliate_commissions where id=c.id for update;
 if new.status in ('refunded','canceled') then
  update public.affiliate_commissions set status='canceled',counted=false,updated_at=now() where id=c.id;
 elsif new.status='paid' and c.status='awaiting_payment' then
  if p.status<>'approved' then
   update public.affiliate_commissions set status='canceled',updated_at=now() where id=c.id;
   return new;
  end if;
  select * into strict l from public.affiliate_levels where id=p.level_id;
  update public.affiliate_commissions set status='pending_calculation',rate_bps=l.commission_bps,counted=true,
   confirmed_at=now(),available_after=now()+make_interval(days=>(select security_days from public.affiliate_settings where id)),updated_at=now() where id=c.id;
  select count(*) into total from public.affiliate_commissions where profile_id=p.id and counted;
  select * into next_l from public.affiliate_levels where minimum_sales<=total order by minimum_sales desc limit 1;
  if next_l.minimum_sales>l.minimum_sales then
   update public.affiliate_profiles set level_id=next_l.id,version=version+1,updated_at=now() where id=p.id;
   insert into public.affiliate_level_history(profile_id,commission_id,previous_level,next_level,rate_bps,valid_sales)
   values(p.id,c.id,l.id,next_l.id,next_l.commission_bps,total);
  end if;
 end if;
 return new;
end $$;
create trigger affiliate_order_status after update of status on public.mercado_pago_orders for each row execute function public.affiliate_order_status_changed();

create function public.record_affiliate_mercado_pago_order(p_reference uuid,p_order_id text,p_status text,p_updated_at timestamptz,p_event_key text,p_details jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- Same transaction: authoritative order update, commission transition, immutable evidence.
 perform public.record_mercado_pago_order(p_reference,p_order_id,p_status,p_updated_at);
 if exists(select 1 from public.affiliate_order_attributions where order_id=p_reference) then
  if p_event_key is null or p_event_key !~ '^[a-f0-9]{64}$' or p_details is null or jsonb_typeof(p_details)<>'object' then raise exception 'invalid_evidence'; end if;
  insert into public.affiliate_payment_events(order_id,provider_event_key,details) values(p_reference,p_event_key,p_details) on conflict(provider_event_key) do nothing;
 end if;
end $$;

-- Only an eventual verified server-side settlement adapter may invoke this.
-- No browser/admin form accepts an arbitrary net amount as proof.
create function public.affiliate_reconcile_net(p_order uuid,p_net_cents bigint,p_evidence_reference text,p_evidence_hash text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.affiliate_commissions; o public.mercado_pago_orders; existing public.affiliate_reconciliations;
begin
 select * into strict o from public.mercado_pago_orders where id=p_order for update;
 select * into strict c from public.affiliate_commissions where order_id=p_order for update;
 select * into existing from public.affiliate_reconciliations where commission_id=c.id;
 if found then
  if existing.net_cents=p_net_cents and existing.evidence_reference=p_evidence_reference and existing.evidence_hash=p_evidence_hash then return; end if;
  raise exception 'reconciliation_conflict';
 end if;
 if not o.live_mode or o.status<>'paid' or o.revoked_at is not null or c.status<>'pending_calculation' then raise exception 'ineligible_commission'; end if;
 if p_net_cents is null or p_net_cents not between 0 and o.amount_total or p_evidence_reference is null or char_length(p_evidence_reference) not between 5 and 200
  or p_evidence_hash is null or p_evidence_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_settlement'; end if;
 insert into public.affiliate_reconciliations(commission_id,evidence_reference,evidence_hash,net_cents) values(c.id,p_evidence_reference,p_evidence_hash,p_net_cents);
 update public.affiliate_commissions set net_cents=p_net_cents,commission_cents=(p_net_cents*c.rate_bps+5000)/10000,status='in_security',updated_at=now() where id=c.id;
end $$;

create function public.affiliate_sales(p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p uuid;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_page is null or p_page not between 0 and 100000 then raise exception 'invalid_filter'; end if;
 select id into p from public.affiliate_profiles where user_id=auth.uid();
 return jsonb_build_object('total',(select count(*) from public.affiliate_commissions where profile_id=p),
  'valid_sales',(select count(*) from public.affiliate_commissions where profile_id=p and counted),
  'pending_sales',(select count(*) from public.affiliate_commissions where profile_id=p and status='awaiting_payment'),
  'unreconciled_sales',(select count(*) from public.affiliate_commissions where profile_id=p and status='pending_calculation'),
  'commissions_cents',(select coalesce(sum(commission_cents),0) from public.affiliate_commissions where profile_id=p and status='in_security'),
  'clicks',(select count(*) from public.affiliate_referrals where profile_id=p),
  'performance',coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from (
   select (confirmed_at at time zone 'America/Sao_Paulo')::date as day,count(*) as sales
   from public.affiliate_commissions where profile_id=p and counted
    and confirmed_at >= ((now() at time zone 'America/Sao_Paulo')::date-29) at time zone 'America/Sao_Paulo'
   group by 1
  )d),'[]'::jsonb),
  'items',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc,id) from (
   select id,status,rate_bps,net_cents,commission_cents,created_at,confirmed_at from public.affiliate_commissions where profile_id=p order by created_at desc,id limit 20 offset p_page*20
  )t),'[]'::jsonb));
end $$;

-- Extend the existing membership response without granting raw-table reads.
alter function public.affiliate_dashboard() rename to affiliate_membership_dashboard;
create function public.affiliate_dashboard() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select public.affiliate_membership_dashboard() || jsonb_build_object('tracking_enabled',(select tracking_enabled from public.affiliate_settings where id))
$$;
-- Service-only mutation surface; no generic UPDATE grants, including audit/evidence tables.
revoke all on function public.affiliate_capture(text,text,text),public.affiliate_revoke(text),public.prepare_affiliate_mercado_pago_order(uuid,uuid,text,boolean,text,text,text),
 public.affiliate_order_status_changed(),public.record_affiliate_mercado_pago_order(uuid,text,text,timestamptz,text,jsonb),public.affiliate_reconcile_net(uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function public.affiliate_capture(text,text,text),public.affiliate_revoke(text),public.prepare_affiliate_mercado_pago_order(uuid,uuid,text,boolean,text,text,text),
 public.record_affiliate_mercado_pago_order(uuid,text,text,timestamptz,text,jsonb),public.affiliate_reconcile_net(uuid,bigint,text,text) to service_role;
revoke all on function public.affiliate_sales(integer),public.affiliate_dashboard() from public,anon;
grant execute on function public.affiliate_sales(integer),public.affiliate_dashboard() to authenticated;

create table public.affiliate_settings_history (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id),
 previous_settings jsonb not null, next_settings jsonb not null, created_at timestamptz not null default now()
);
alter table public.affiliate_settings_history enable row level security;
revoke all on public.affiliate_settings_history from public,anon,authenticated,service_role;
create function public.affiliate_tracking_settings(p_enabled boolean default null,p_days integer default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare previous jsonb; result jsonb;
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 select to_jsonb(s) into previous from public.affiliate_settings s where id for update;
 if p_enabled is not null then
  if p_days is null or p_days not between 1 and 90 then raise exception 'invalid_filter'; end if;
  if (select count(*) from public.affiliate_settings_history where actor_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'rate_limited'; end if;
  update public.affiliate_settings set tracking_enabled=p_enabled,attribution_days=p_days where id;
 end if;
 select to_jsonb(s) into result from public.affiliate_settings s where id;
 if result<>previous then insert into public.affiliate_settings_history(actor_id,previous_settings,next_settings) values(auth.uid(),previous,result); end if;
 return result;
end $$;
revoke all on function public.affiliate_tracking_settings(boolean,integer) from public,anon;
grant execute on function public.affiliate_tracking_settings(boolean,integer) to authenticated;
commit;
