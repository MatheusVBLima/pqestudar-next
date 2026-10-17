begin;
alter table public.affiliate_settings add column minimum_payout_cents bigint not null default 5000 check(minimum_payout_cents between 100 and 10000000);

create table public.affiliate_payout_requests (
 id uuid primary key, profile_id uuid not null references public.affiliate_profiles(id),
 amount_cents bigint not null check(amount_cents between 1 and 100000000),
 pix_ciphertext text not null check(length(pix_ciphertext) between 40 and 2000), pix_mask text not null check(length(pix_mask) between 4 and 50),
 status text not null default 'requested' check(status in ('requested','reviewing','approved','processing','paid','rejected','failed')),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index affiliate_payout_profile_idx on public.affiliate_payout_requests(profile_id,created_at desc);
create table public.affiliate_payout_attempts (
 id uuid primary key default gen_random_uuid(), payout_id uuid not null references public.affiliate_payout_requests(id),
 actor_id uuid references auth.users(id), previous_status text not null, next_status text not null,
 reason text not null check(length(reason) between 3 and 1000), transfer_reference text unique,
 proof bytea, proof_type text, created_at timestamptz not null default now(),
 check(next_status <> 'paid' or (length(transfer_reference) between 6 and 150 and proof is not null and octet_length(proof) between 8 and 2097152 and proof_type in ('image/png','image/jpeg','application/pdf')))
);
create table public.affiliate_ledger (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.affiliate_profiles(id),
 commission_id uuid references public.affiliate_commissions(id), payout_id uuid references public.affiliate_payout_requests(id),
 event_key text not null unique, kind text not null check(kind in ('release','reserve','unreserve','payment','reversal')),
 available_delta bigint not null default 0, reserved_delta bigint not null default 0, paid_delta bigint not null default 0,
 created_at timestamptz not null default now(),
 check((kind='release' and available_delta>=0 and reserved_delta=0 and paid_delta=0 and commission_id is not null)
 or (kind='reversal' and available_delta<=0 and reserved_delta=0 and paid_delta=0 and commission_id is not null)
 or (kind='reserve' and available_delta<0 and reserved_delta=-available_delta and paid_delta=0 and payout_id is not null)
 or (kind='unreserve' and available_delta>0 and reserved_delta=-available_delta and paid_delta=0 and payout_id is not null)
 or (kind='payment' and available_delta=0 and reserved_delta<0 and paid_delta=-reserved_delta and payout_id is not null))
);
create index affiliate_ledger_profile_idx on public.affiliate_ledger(profile_id,created_at desc);
create unique index affiliate_ledger_release_idx on public.affiliate_ledger(commission_id) where kind='release';
create unique index affiliate_ledger_reversal_idx on public.affiliate_ledger(commission_id) where kind='reversal';
create function public.affiliate_finance_immutable() returns trigger language plpgsql as $$ begin raise exception 'immutable_financial_record'; end $$;
create trigger affiliate_ledger_immutable before update or delete on public.affiliate_ledger for each row execute function public.affiliate_finance_immutable();
create trigger affiliate_attempts_immutable before update or delete on public.affiliate_payout_attempts for each row execute function public.affiliate_finance_immutable();
do $$ declare t text; begin
 foreach t in array array['affiliate_ledger','affiliate_payout_requests','affiliate_payout_attempts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

-- Every wallet mutation serializes on the affiliate profile. Raw tables are never exposed.
create function public.affiliate_wallet(p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p public.affiliate_profiles; result jsonb;
begin
 select * into p from public.affiliate_profiles where user_id=auth.uid();
 if p.id is null then raise exception 'profile_not_found'; end if;
 if p_page is null or p_page not between 0 and 100000 then raise exception 'invalid_page'; end if;
 select jsonb_build_object('available_cents',coalesce(sum(available_delta),0),'reserved_cents',coalesce(sum(reserved_delta),0),'paid_cents',coalesce(sum(paid_delta),0)) into result from public.affiliate_ledger where profile_id=p.id;
 return result || jsonb_build_object('approved',p.status='approved',
 'minimum_cents',(select minimum_payout_cents from public.affiliate_settings where id),
 'security_days',(select security_days from public.affiliate_settings where id),
 'pending_cents',(select coalesce(sum(commission_cents),0) from public.affiliate_commissions c where profile_id=p.id and status='in_security' and not exists(select 1 from public.affiliate_ledger l where l.commission_id=c.id and l.kind='release')),
 'unreconciled',(select count(*) from public.affiliate_commissions where profile_id=p.id and status='pending_calculation'),
 'total',(select count(*) from public.affiliate_ledger where profile_id=p.id),
 'entries',coalesce((select jsonb_agg(x order by created_at desc,id desc) from (select id,kind,available_delta,reserved_delta,paid_delta,created_at from public.affiliate_ledger where profile_id=p.id order by created_at desc,id desc limit 20 offset p_page*20)x),'[]'),
 'payout_total',(select count(*) from public.affiliate_payout_requests where profile_id=p.id),
 'payouts',coalesce((select jsonb_agg(x order by created_at desc,id desc) from (select id,amount_cents,pix_mask,status,created_at from public.affiliate_payout_requests where profile_id=p.id order by created_at desc,id desc limit 20 offset p_page*20)x),'[]'));
end $$;

create function public.affiliate_request_payout(p_id uuid,p_amount bigint,p_cipher text,p_mask text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.affiliate_profiles; existing public.affiliate_payout_requests; balance bigint;
begin
 select * into p from public.affiliate_profiles where user_id=auth.uid() for update;
 if p.id is null or p.status<>'approved' then raise exception 'affiliate_approval_required'; end if;
 select * into existing from public.affiliate_payout_requests where id=p_id;
 if existing.id is not null then
 if existing.profile_id<>p.id or existing.amount_cents<>p_amount or existing.pix_mask<>p_mask then raise exception 'payout_conflict'; end if;
 return jsonb_build_object('id',existing.id,'status',existing.status);
 end if;
 if p_id is null or p_amount is null or p_amount < (select minimum_payout_cents from public.affiliate_settings where id) or p_amount>100000000 then raise exception 'invalid_payout_amount'; end if;
 if (select count(*) from public.affiliate_payout_requests where profile_id=p.id and created_at>now()-interval '1 hour')>=5 then raise exception 'rate_limited'; end if;
 -- A single outstanding request prevents accidental double clicks with new request ids.
 if exists(select 1 from public.affiliate_payout_requests where profile_id=p.id and status in ('requested','reviewing','approved','processing')) then raise exception 'payout_pending'; end if;
 select coalesce(sum(available_delta),0) into balance from public.affiliate_ledger where profile_id=p.id;
 if balance < p_amount then raise exception 'insufficient_balance'; end if;
 insert into public.affiliate_payout_requests(id,profile_id,amount_cents,pix_ciphertext,pix_mask) values(p_id,p.id,p_amount,p_cipher,p_mask);
 insert into public.affiliate_ledger(profile_id,payout_id,event_key,kind,available_delta,reserved_delta) values(p.id,p_id,'reserve:'||p_id,'reserve',-p_amount,p_amount);
 insert into public.affiliate_audit_logs(profile_id,actor_id,action,reason,previous_status,next_status) values(p.id,auth.uid(),'request_payout',p_id::text,p.status,p.status);
 return jsonb_build_object('id',p_id,'status','requested');
end $$;

-- Release requires a freshly synchronized official order and a previously verified settlement.
-- The HTTP administrator route performs the official sync first.
create function public.affiliate_release_commission(p_commission uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.affiliate_commissions; o public.mercado_pago_orders; p public.affiliate_profiles;
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required'; end if;
 select * into c from public.affiliate_commissions where id=p_commission;
 if c.id is null then raise exception 'commission_not_found'; end if;
 select * into o from public.mercado_pago_orders where id=c.order_id for update;
 select * into p from public.affiliate_profiles where id=c.profile_id for update;
 select * into c from public.affiliate_commissions where id=p_commission for update;
 if exists(select 1 from public.affiliate_ledger where commission_id=c.id and kind='release') then return; end if;
 if p.status<>'approved' or c.status<>'in_security' or c.available_after is null or c.available_after>now() or not c.counted
 or c.commission_cents is null or o.status<>'paid' or not o.live_mode or o.revoked_at is not null or o.last_synced_at is null or o.last_synced_at<now()-interval '2 minutes'
 or not exists(select 1 from public.affiliate_reconciliations where commission_id=c.id and net_cents=c.net_cents) then raise exception 'commission_not_eligible'; end if;
 insert into public.affiliate_ledger(profile_id,commission_id,event_key,kind,available_delta) values(p.id,c.id,'release:'||c.id,'release',c.commission_cents);
 insert into public.affiliate_audit_logs(profile_id,actor_id,action,reason,previous_status,next_status) values(p.id,auth.uid(),'release_commission',c.id::text,p.status,p.status);
end $$;

-- Conservatively stop all unpaid withdrawals on a reversal; no money is recovered externally.
create function public.affiliate_wallet_reversal() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.affiliate_payout_requests; released bigint;
begin
 if new.status<>'canceled' or old.status='canceled' then return new; end if;
 perform 1 from public.affiliate_profiles where id=new.profile_id for update;
 select available_delta into released from public.affiliate_ledger where commission_id=new.id and kind='release';
 if released is null then return new; end if;
 for r in select * from public.affiliate_payout_requests where profile_id=new.profile_id and status in ('requested','reviewing','approved','processing') for update loop
 update public.affiliate_payout_requests set status='rejected',version=version+1,updated_at=now() where id=r.id;
 insert into public.affiliate_ledger(profile_id,payout_id,event_key,kind,available_delta,reserved_delta) values(r.profile_id,r.id,'unreserve:'||r.id,'unreserve',r.amount_cents,-r.amount_cents);
 insert into public.affiliate_payout_attempts(payout_id,previous_status,next_status,reason) values(r.id,r.status,'rejected','Bloqueado automaticamente por estorno de comissão.');
 end loop;
 insert into public.affiliate_ledger(profile_id,commission_id,event_key,kind,available_delta) values(new.profile_id,new.id,'reversal:'||new.id,'reversal',-released) on conflict(event_key) do nothing;
 return new;
end $$;
create trigger affiliate_wallet_reversal after update of status on public.affiliate_commissions for each row execute function public.affiliate_wallet_reversal();

create function public.affiliate_finance_admin(p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required'; end if;
 if p_page is null or p_page not between 0 and 100000 then raise exception 'invalid_page'; end if;
 return jsonb_build_object('minimum_cents',(select minimum_payout_cents from public.affiliate_settings where id),'security_days',(select security_days from public.affiliate_settings where id),
 'total',(select count(*) from public.affiliate_payout_requests),
 'items',coalesce((select jsonb_agg(x order by created_at desc,id desc) from (select r.id,r.profile_id,p.display_name,r.amount_cents,r.pix_mask,r.status,r.version,r.created_at from public.affiliate_payout_requests r join public.affiliate_profiles p on p.id=r.profile_id order by r.created_at desc,r.id desc limit 20 offset p_page*20)x),'[]'),
 'eligible',coalesce((select jsonb_agg(x) from (select c.id,c.commission_cents,c.available_after from public.affiliate_commissions c join public.affiliate_profiles p on p.id=c.profile_id where p.status='approved' and c.status='in_security' and c.available_after<=now() and exists(select 1 from public.affiliate_reconciliations where commission_id=c.id) and not exists(select 1 from public.affiliate_ledger where commission_id=c.id and kind='release') order by c.available_after limit 20)x),'[]'),
 'recoveries',coalesce((select jsonb_agg(x) from (select l.profile_id,p.display_name,sum(l.available_delta) as debt_cents from public.affiliate_ledger l join public.affiliate_profiles p on p.id=l.profile_id group by l.profile_id,p.display_name having sum(l.available_delta)<0 order by sum(l.available_delta) limit 100)x),'[]'));
end $$;

create function public.affiliate_finance_settings(p_minimum bigint,p_days integer) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare previous jsonb; next_value jsonb;
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required'; end if;
 select to_jsonb(s) into previous from public.affiliate_settings s where id for update;
 if p_minimum is null or p_minimum not between 100 and 10000000 or p_days is null or p_days not between 1 and 365 then raise exception 'invalid_settings'; end if;
 if (select count(*) from public.affiliate_settings_history where actor_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'rate_limited'; end if;
 update public.affiliate_settings set minimum_payout_cents=p_minimum,security_days=p_days where id returning to_jsonb(affiliate_settings) into next_value;
 if previous<>next_value then insert into public.affiliate_settings_history(actor_id,previous_settings,next_settings) values(auth.uid(),previous,next_value); end if;
end $$;

-- Sensitive detail is returned only to administrators, with an audit entry for every view.
create function public.affiliate_payout_detail(p_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.affiliate_payout_requests; p public.affiliate_profiles;
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required'; end if;
 select * into r from public.affiliate_payout_requests where id=p_id;
 if r.id is null then raise exception 'profile_not_found'; end if;
 select * into p from public.affiliate_profiles where id=r.profile_id;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,17102026));
 if (select count(*) from public.affiliate_audit_logs where actor_id=auth.uid() and action='view_payout' and created_at>now()-interval '1 minute')>=30 then raise exception 'rate_limited'; end if;
 insert into public.affiliate_audit_logs(profile_id,actor_id,action,reason,previous_status,next_status) values(p.id,auth.uid(),'view_payout',r.id::text,p.status,p.status);
 return to_jsonb(r)||jsonb_build_object('user_id',p.user_id,'attempts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'previous_status',previous_status,'next_status',next_status,'reason',reason,'transfer_reference',transfer_reference,'created_at',created_at,'has_proof',proof is not null) order by created_at desc) from public.affiliate_payout_attempts where payout_id=r.id),'[]'));
end $$;

create function public.affiliate_review_payout(p_id uuid,p_version integer,p_status text,p_reason text,p_reference text default null,p_proof bytea default null,p_type text default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.affiliate_payout_requests; p public.affiliate_profiles;
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required'; end if;
 select * into r from public.affiliate_payout_requests where id=p_id;
 if r.id is null then raise exception 'profile_not_found'; end if;
 select * into p from public.affiliate_profiles where id=r.profile_id for update;
 select * into r from public.affiliate_payout_requests where id=p_id for update;
 if p_version is null or r.version<>p_version then raise exception 'stale_version'; end if;
 if p_reason is null or length(trim(p_reason)) not between 3 and 1000 then raise exception 'invalid_reason'; end if;
 if (select count(*) from public.affiliate_payout_attempts where actor_id=auth.uid() and created_at>now()-interval '1 minute')>=20 then raise exception 'rate_limited'; end if;
 if p_status is null or not ((r.status='requested' and p_status in ('reviewing','rejected')) or (r.status='reviewing' and p_status in ('approved','rejected')) or (r.status='approved' and p_status in ('processing','rejected')) or (r.status='processing' and p_status in ('paid','failed','rejected'))) then raise exception 'invalid_transition'; end if;
 if p_status not in ('rejected','failed') and p.status<>'approved' then raise exception 'affiliate_approval_required'; end if;
 if p_status='paid' and (p_reference is null or length(trim(p_reference)) not between 6 and 150 or p_proof is null or octet_length(p_proof) not between 8 and 2097152 or p_type is null or p_type not in ('image/png','image/jpeg','application/pdf')) then raise exception 'payment_proof_required'; end if;
 if p_status='paid' and exists(select 1 from public.affiliate_commissions c join public.affiliate_ledger l on l.commission_id=c.id and l.kind='release' join public.mercado_pago_orders o on o.id=c.order_id where c.profile_id=p.id and c.status<>'canceled' and (o.status<>'paid' or o.revoked_at is not null or o.last_synced_at is null or o.last_synced_at<now()-interval '2 minutes')) then raise exception 'reconciliation_required'; end if;
 insert into public.affiliate_payout_attempts(payout_id,actor_id,previous_status,next_status,reason,transfer_reference,proof,proof_type) values(r.id,auth.uid(),r.status,p_status,trim(p_reason),case when p_status='paid' then trim(p_reference) end,case when p_status='paid' then p_proof end,case when p_status='paid' then p_type end);
 if p_status in ('rejected','failed') then
 insert into public.affiliate_ledger(profile_id,payout_id,event_key,kind,available_delta,reserved_delta) values(p.id,r.id,'unreserve:'||r.id,'unreserve',r.amount_cents,-r.amount_cents);
 elsif p_status='paid' then
 insert into public.affiliate_ledger(profile_id,payout_id,event_key,kind,reserved_delta,paid_delta) values(p.id,r.id,'payment:'||r.id,'payment',-r.amount_cents,r.amount_cents);
 end if;
 update public.affiliate_payout_requests set status=p_status,version=version+1,updated_at=now() where id=r.id;
end $$;

create function public.affiliate_payout_proof(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.affiliate_is_admin() then raise exception 'admin_required'; end if;
 return (select jsonb_build_object('base64',encode(proof,'base64'),'type',proof_type) from public.affiliate_payout_attempts where id=p_attempt and proof is not null);
end $$;

-- Server-only helper obtains the provider identifiers to synchronize before releases/payments.
create function public.affiliate_wallet_orders(p_commission uuid default null,p_payout uuid default null) returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(distinct o.order_id),'[]') from public.affiliate_commissions c join public.mercado_pago_orders o on o.id=c.order_id
 where (c.id=p_commission or (c.profile_id=(select profile_id from public.affiliate_payout_requests where id=p_payout) and c.status<>'canceled' and exists(select 1 from public.affiliate_ledger l where l.commission_id=c.id and l.kind='release'))) and o.order_id is not null
$$;

revoke all on function public.affiliate_finance_immutable(),public.affiliate_wallet_reversal() from public,anon,authenticated,service_role;
revoke all on function public.affiliate_release_commission(uuid) from public,anon,service_role;
grant execute on function public.affiliate_release_commission(uuid) to authenticated;
revoke all on function public.affiliate_wallet_orders(uuid,uuid) from public,anon,authenticated;
grant execute on function public.affiliate_wallet_orders(uuid,uuid) to service_role;
revoke all on function public.affiliate_wallet(integer),public.affiliate_request_payout(uuid,bigint,text,text),public.affiliate_finance_admin(integer),public.affiliate_finance_settings(bigint,integer),public.affiliate_payout_detail(uuid),public.affiliate_review_payout(uuid,integer,text,text,text,bytea,text),public.affiliate_payout_proof(uuid) from public,anon,service_role;
grant execute on function public.affiliate_wallet(integer),public.affiliate_request_payout(uuid,bigint,text,text),public.affiliate_finance_admin(integer),public.affiliate_finance_settings(bigint,integer),public.affiliate_payout_detail(uuid),public.affiliate_review_payout(uuid,integer,text,text,text,bytea,text),public.affiliate_payout_proof(uuid) to authenticated;
alter function public.affiliate_sales(integer) rename to affiliate_sales_before_wallet;
revoke all on function public.affiliate_sales_before_wallet(integer) from public,anon,authenticated,service_role;
create function public.affiliate_sales(p_page integer default 0) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; p uuid;
begin
 result:=public.affiliate_sales_before_wallet(p_page);
 select id into p from public.affiliate_profiles where user_id=auth.uid();
 return result||jsonb_build_object('commissions_cents',(select coalesce(sum(c.commission_cents),0) from public.affiliate_commissions c where c.profile_id=p and c.status='in_security' and not exists(select 1 from public.affiliate_ledger l where l.commission_id=c.id and l.kind='release')),
 'items',coalesce((select jsonb_agg(case when item->>'status'='in_security' and exists(select 1 from public.affiliate_ledger l where l.profile_id=p and l.commission_id=(item->>'id')::uuid and l.kind='release') then item||jsonb_build_object('status','released') else item end order by ordinal) from jsonb_array_elements(result->'items') with ordinality x(item,ordinal)),'[]'));
end $$;
revoke all on function public.affiliate_sales(integer) from public,anon,service_role;
grant execute on function public.affiliate_sales(integer) to authenticated;
create or replace function public.affiliate_dashboard() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select public.affiliate_membership_dashboard() || jsonb_build_object('tracking_enabled',(select tracking_enabled from public.affiliate_settings where id),'finance_enabled',true)
$$;
notify pgrst,'reload schema';
commit;
