-- Read-only RPC checks with actual database roles; all session settings are rolled back.
begin;
set local statement_timeout='30s';
do $$ declare owner_id uuid; admin_id uuid; begin
 select p.user_id into owner_id from public.affiliate_profiles p where p.status='approved' and not public.has_role(p.user_id,'admin') and not public.has_role(p.user_id,'developer') limit 1;
 select u.id into admin_id from auth.users u where public.has_role(u.id,'admin') limit 1;
 if owner_id is null or admin_id is null then raise exception 'Missing approved normal affiliate or administrator'; end if;
 perform set_config('wallet.test.owner',owner_id::text,true);
 perform set_config('wallet.test.admin',admin_id::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('wallet.test.owner'),true) is not null as session_prepared;
set local role authenticated;
do $$ declare w jsonb; begin
 w:=public.affiliate_wallet(0);
 if w->>'approved'<>'true' or w->'available_cents' is null or w->'entries' is null then raise exception 'Invalid wallet response'; end if;
 if (public.affiliate_dashboard()->>'finance_enabled')::boolean is not true then raise exception 'Dashboard finance flag missing'; end if;
 begin perform public.affiliate_finance_admin(0); raise exception 'Admin isolation failed'; exception when others then if sqlerrm<>'admin_required' then raise; end if; end;
 begin perform public.affiliate_release_commission(gen_random_uuid()); raise exception 'Release isolation failed'; exception when others then if sqlerrm<>'admin_required' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('wallet.test.admin'),true) is not null as admin_session_prepared;
do $$ declare f jsonb; begin
 f:=public.affiliate_finance_admin(0);
 if f->'items' is null or f->'eligible' is null or f->'recoveries' is null then raise exception 'Invalid admin finance response'; end if;
end $$;
rollback;
select 'wallet_readonly_role_checks_passed' as result;
