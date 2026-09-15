do $$
declare
  u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); test_ref uuid:=gen_random_uuid(); live_ref uuid:=gen_random_uuid();
  early_ref uuid:=gen_random_uuid(); mail text; result jsonb;
begin
  mail:='mp-test-'||u||'@example.test';
  insert into auth.users(id,email,email_confirmed_at) values(u,mail,now()),(other_user,'other-'||mail,now());
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform public.prepare_mercado_pago_order(test_ref,u,mail,false,'123','https://example.test');
  perform public.prepare_mercado_pago_order(test_ref,u,mail,false,'123','https://example.test');
  if (select count(*) from public.mercado_pago_orders where id=test_ref)<>1 then raise exception 'Duplicate order'; end if;
  begin
    perform public.prepare_mercado_pago_order(test_ref,other_user,'other-'||mail,false,'123','https://example.test');
    raise exception 'Cross user reuse allowed';
  exception when others then if sqlerrm<>'checkout_owner_mismatch' then raise; end if; end;
  perform public.record_mercado_pago_order(test_ref,'ORDTST01KS5AJ6HTK2HRQ3XJ3C2JCKP9','paid',now());
  if public.get_effective_subscription() is not null or public.has_active_subscription() then raise exception 'Test granted access'; end if;
  perform public.prepare_mercado_pago_order(live_ref,u,mail,true,'456','https://example.test');
  begin
    perform public.record_mercado_pago_order(live_ref,'ORDTST01KS5AJ6HTK2HRQ3XJ3C2JCKP8','paid',now());
    raise exception 'Test ID used in live mode';
  exception when others then if sqlerrm<>'order_mismatch' then raise; end if; end;
  perform public.record_mercado_pago_order(live_ref,'ORD01KS5AJ6HTK2HRQ3XJ3C2JCKP9','pending',now());
  if public.has_active_subscription() then raise exception 'Pending granted access'; end if;
  perform public.record_mercado_pago_order(live_ref,'ORD01KS5AJ6HTK2HRQ3XJ3C2JCKP9','paid',now());
  if public.get_effective_subscription()->>'plan_type' is distinct from 'lifetime' or not public.has_active_subscription() then raise exception 'Paid access missing'; end if;
  perform public.record_mercado_pago_order(live_ref,'ORD01KS5AJ6HTK2HRQ3XJ3C2JCKP9','failed',now()-interval '1 hour');
  if not public.has_active_subscription() then raise exception 'Delayed failure revoked paid access'; end if;
  perform set_config('request.jwt.claim.sub',other_user::text,true);
  if public.has_active_subscription() or public.get_effective_subscription() is not null then raise exception 'Cross-user access'; end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform public.record_mercado_pago_order(live_ref,'ORD01KS5AJ6HTK2HRQ3XJ3C2JCKP9','refunded',now()+interval '1 minute');
  perform public.record_mercado_pago_order(live_ref,'ORD01KS5AJ6HTK2HRQ3XJ3C2JCKP9','paid',now()+interval '2 minutes');
  if public.has_active_subscription() then raise exception 'Refund replay restored access'; end if;
  perform public.prepare_mercado_pago_order(early_ref,u,mail,true,'456','https://example.test');
  perform public.record_mercado_pago_order(early_ref,'ORD01KS5AJ6HTK2HRQ3XJ3C2JCKP8','canceled',now());
  perform public.record_mercado_pago_order(early_ref,'ORD01KS5AJ6HTK2HRQ3XJ3C2JCKP8','paid',now()-interval '1 hour');
  if public.has_active_subscription() then raise exception 'Early dispute bypassed'; end if;
  insert into public.subscriptions(user_id,status,plan_type,plan_tier,ends_at) values(u,'active','annual','basic',now()+interval '1 year');
  if public.get_effective_subscription()->>'plan_type' is distinct from 'annual' or not public.has_active_subscription() then raise exception 'Existing subscription lost'; end if;
  if has_function_privilege('authenticated','public.record_mercado_pago_order(uuid,text,text,timestamptz)','execute') then raise exception 'Fulfillment exposed'; end if;
  if has_function_privilege('authenticated','public.prepare_mercado_pago_order(uuid,uuid,text,boolean,text,text)','execute') then raise exception 'Order creation exposed'; end if;
  if has_table_privilege('authenticated','public.mercado_pago_orders','INSERT') then raise exception 'Client write exposed'; end if;
  perform public.prepare_mercado_pago_order(gen_random_uuid(),other_user,'other-'||mail,false,'123','https://example.test');
end;
$$;
set local role authenticated;
do $$
begin
  if exists(select 1 from public.mercado_pago_orders where user_id<>auth.uid()) then raise exception 'RLS leak'; end if;
  if (select count(*) from public.mercado_pago_orders)<>3 then raise exception 'Owner cannot read orders'; end if;
end;
$$;
reset role;
