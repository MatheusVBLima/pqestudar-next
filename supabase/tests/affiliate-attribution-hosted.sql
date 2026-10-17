-- Hosted attribution rehearsal. No provider calls; every write rolls back.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $setup$
declare affiliate record; buyer record;
begin
 select p.id,p.code,u.id as user_id,u.email into strict affiliate
 from public.affiliate_profiles p join auth.users u on u.id=p.user_id
 where p.status='approved' and u.email_confirmed_at is not null order by p.created_at limit 1;
 select u.id,u.email into strict buyer from auth.users u
 where u.email_confirmed_at is not null and u.id<>affiliate.user_id
 order by u.id limit 1;
 perform set_config('test.profile',affiliate.id::text,true);
 perform set_config('test.code',affiliate.code,true);
 perform set_config('test.owner',affiliate.user_id::text,true);
 perform set_config('test.owner_email',affiliate.email,true);
 perform set_config('test.buyer',buyer.id::text,true);
 perform set_config('test.buyer_email',buyer.email,true);
 perform set_config('test.order',gen_random_uuid()::text,true);
 perform set_config('test.plain',gen_random_uuid()::text,true);
 perform set_config('test.self',gen_random_uuid()::text,true);
 perform set_config('test.revoked',gen_random_uuid()::text,true);
 perform set_config('test.expired',gen_random_uuid()::text,true);
 perform set_config('test.token',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),true);
 perform set_config('test.token2',replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),true);
 -- Visible only to this transaction; concurrent visitors still see tracking disabled.
 update public.affiliate_settings set tracking_enabled=true where id;
end $setup$;
set local role service_role;
do $flow$
declare result jsonb; token text:=current_setting('test.token'); token2 text:=current_setting('test.token2');
 buyer uuid:=current_setting('test.buyer')::uuid; email text:=current_setting('test.buyer_email');
begin
 result:=public.affiliate_capture('invalid',token,token);
 if result->>'accepted'<>'false' then raise exception 'Invalid code accepted'; end if;
 result:=public.affiliate_capture(current_setting('test.code'),token,token);
 if result->>'accepted'<>'true' then raise exception 'Active referral not captured'; end if;
 perform public.affiliate_capture(current_setting('test.code'),token2,token2);
 perform public.prepare_affiliate_mercado_pago_order(current_setting('test.order')::uuid,buyer,email,true,'123','https://example.test',token);
 perform public.prepare_affiliate_mercado_pago_order(current_setting('test.order')::uuid,buyer,email,true,'123','https://example.test',token2);
 perform public.prepare_affiliate_mercado_pago_order(current_setting('test.plain')::uuid,buyer,email,true,'123','https://example.test',null);
 perform public.prepare_affiliate_mercado_pago_order(current_setting('test.plain')::uuid,buyer,email,true,'123','https://example.test',token);
 perform public.prepare_affiliate_mercado_pago_order(current_setting('test.self')::uuid,current_setting('test.owner')::uuid,current_setting('test.owner_email'),true,'123','https://example.test',token);
 perform public.affiliate_revoke(token2);
 perform public.prepare_affiliate_mercado_pago_order(current_setting('test.revoked')::uuid,buyer,email,true,'123','https://example.test',token2);
end $flow$;
reset role;
update public.affiliate_referrals set expires_at=now()-interval '1 second' where token_hash=current_setting('test.token');
set local role service_role;
select public.prepare_affiliate_mercado_pago_order(current_setting('test.expired')::uuid,current_setting('test.buyer')::uuid,current_setting('test.buyer_email'),true,'123','https://example.test',current_setting('test.token')) is not null as prepared;
reset role;
do $verify$
begin
 if not exists(select 1 from public.affiliate_order_attributions a join public.affiliate_referrals r on r.id=a.referral_id
 where a.order_id=current_setting('test.order')::uuid and a.profile_id=current_setting('test.profile')::uuid and r.token_hash=current_setting('test.token')) then raise exception 'Immutable attribution mismatch'; end if;
 if exists(select 1 from public.affiliate_order_attributions where order_id in
 (current_setting('test.plain')::uuid,current_setting('test.self')::uuid,current_setting('test.revoked')::uuid,current_setting('test.expired')::uuid)) then raise exception 'Ineligible attribution'; end if;
 if (select count(*) from public.affiliate_commissions where order_id=current_setting('test.order')::uuid and status='awaiting_payment' and net_cents is null and commission_cents is null)<>1 then raise exception 'Commission placeholder mismatch'; end if;
end $verify$;
rollback;
select 'PASS: hosted capture, invalid code, immutable attribution, immutable unattributed order, self purchase exclusion, revoked/expired token exclusion, single unpaid commission; all writes rolled back; no payment initiated' as result;
