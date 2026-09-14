-- Run after the migration in a transaction. All fixtures are rolled back.
do $$
declare
  u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); unverified uuid:=gen_random_uuid();
  email text:='stripe-test-'||u||'@example.test'; payload jsonb; result jsonb; session text:='cs_test_'||replace(u::text,'-','');
begin
  insert into auth.users(id,email,email_confirmed_at) values(u,email,now()),(other_user,'stripe-other-'||u||'@example.test',now()),(unverified,'stripe-unverified-'||u||'@example.test',null);
  insert into public.subscriptions(user_id,status,plan_type,plan_tier,starts_at,ends_at)
    values(u,'active','annual','basic',now(),now()+interval '1 year');
  perform set_config('request.jwt.claim.sub',u::text,true);
  payload:=jsonb_build_object('product_key','pqestudar-premium-lifetime','session_id',session,'payment_intent','pi_'||u,
    'email',email,'status','pending','amount_total',5990,'currency','brl','verified_price_id','price_test');
  perform public.record_stripe_premium_purchase(payload);
  result:=public.get_effective_subscription();
  if result->>'plan_type'<>'annual' then raise exception 'Pending granted access'; end if;
  perform public.record_stripe_premium_purchase(payload||'{"status":"paid"}'::jsonb);
  perform public.record_stripe_premium_purchase(payload||'{"status":"paid"}'::jsonb);
  result:=public.get_effective_subscription();
  if result->>'plan_type'<>'lifetime' or result->>'plan_tier'<>'premium' or not public.has_active_subscription() then raise exception 'Paid access missing'; end if;
  perform public.record_stripe_premium_purchase(payload||'{"status":"failed"}'::jsonb);
  if (select status from public.product_purchases where stripe_checkout_session_id=session)<>'paid' then raise exception 'Late failure downgraded paid'; end if;
  perform set_config('request.jwt.claim.sub',other_user::text,true);
  if public.get_effective_subscription() is not null or public.has_active_subscription() then raise exception 'Access leaked to another user'; end if;
  perform public.revoke_stripe_premium_payment('pi_'||u,'refund');
  perform public.record_stripe_premium_purchase(payload||'{"status":"paid"}'::jsonb);
  perform set_config('request.jwt.claim.sub',u::text,true);
  result:=public.get_effective_subscription();
  if result->>'plan_type'<>'annual' or result->>'plan_tier'<>'basic' then raise exception 'Refund did not preserve previous subscription'; end if;
  perform public.revoke_stripe_premium_payment('pi_early_'||u,'dispute');
  perform public.record_stripe_premium_purchase(payload||jsonb_build_object('status','paid','session_id',session||'early','payment_intent','pi_early_'||u));
  if (select status from public.product_purchases where stripe_checkout_session_id=session||'early')<>'canceled' then raise exception 'Out-of-order dispute granted access'; end if;
  perform public.record_stripe_premium_purchase(payload||jsonb_build_object('status','paid','session_id',session||'guest','payment_intent','pi_guest_'||u,'email','stripe-unverified-'||u||'@example.test'));
  perform set_config('request.jwt.claim.sub',unverified::text,true);
  if public.get_effective_subscription() is not null then raise exception 'Unverified email claimed purchase'; end if;
  update auth.users set email_confirmed_at=now() where id=unverified;
  if public.get_effective_subscription()->>'plan_type'<>'lifetime' then raise exception 'Verified guest claim failed'; end if;
  if has_function_privilege('authenticated','public.record_stripe_premium_purchase(jsonb)','execute') then raise exception 'Public fulfillment exposed'; end if;
  if has_function_privilege('anon','public.get_effective_subscription()','execute') then raise exception 'Anonymous access exposed'; end if;
  raise notice 'PASS: pending, paid, idempotency, late events, cross-user isolation, refund, dispute ordering, guest verification, permissions';
end;
$$;

set local role authenticated;
do $$
begin
  if public.get_effective_subscription()->>'plan_type' is distinct from 'lifetime' then
    raise exception 'Authenticated RPC did not return the paid lifetime entitlement';
  end if;
  if not public.has_active_subscription() then raise exception 'RLS helper denied paid user'; end if;
  if exists(select 1 from public.product_purchases where user_id is distinct from auth.uid()) then
    raise exception 'Purchase RLS leaked another account';
  end if;
  begin
    perform public.record_stripe_premium_purchase('{}'::jsonb);
    raise exception 'Authenticated user could write fulfillment';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  if public.has_active_subscription() then raise exception 'Unpaid user received access'; end if;
  if exists(select 1 from public.premium_items where status='published' and item_type<>'course') then
    raise exception 'Unpaid user bypassed Premium RLS';
  end if;
end;
$$;
reset role;
