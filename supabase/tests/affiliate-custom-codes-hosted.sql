-- Installed RPC/permissions check; all edits and audit events are rolled back.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $setup$
declare p public.affiliate_profiles;
begin
 select * into strict p from public.affiliate_profiles where status='approved' order by created_at limit 1;
 perform set_config('test.code_owner',p.user_id::text,true);
 perform set_config('test.original_code',p.code,true);
 perform set_config('test.custom_code','test-'||substr(replace(gen_random_uuid()::text,'-',''),1,24),true);
end $setup$;
set local role authenticated;
do $test$
declare p jsonb; result jsonb; denied boolean:=false;
begin
 perform set_config('request.jwt.claim.sub',current_setting('test.code_owner'),true);
 p:=public.affiliate_dashboard()->'profile';
 if not (public.affiliate_code_available(current_setting('test.custom_code'))->>'available')::boolean then raise exception 'Expected available'; end if;
 result:=public.affiliate_change_code(upper(current_setting('test.custom_code')),(p->>'version')::integer);
 if result->>'code'<>current_setting('test.custom_code') then raise exception 'Normalization failed'; end if;
 if public.affiliate_dashboard()->'profile'->>'code'<>current_setting('test.custom_code') then raise exception 'Persisted code mismatch'; end if;
 begin perform public.affiliate_change_code(current_setting('test.original_code'),(p->>'version')::integer);
 exception when serialization_failure then denied:=true; end;
 if not denied then raise exception 'Stale update accepted'; end if;
 denied:=false;
 begin perform code from public.affiliate_codes limit 1;
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Registry exposed'; end if;
end $test$;
reset role;
do $verify$
begin
 if (select count(*) from public.affiliate_codes where code in (current_setting('test.original_code'),current_setting('test.custom_code'))
 and profile_id=(select id from public.affiliate_profiles where user_id=current_setting('test.code_owner')::uuid))<>2 then raise exception 'Historical ownership lost'; end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261016000100') then raise exception 'Migration not recorded'; end if;
 if has_function_privilege('anon','public.affiliate_change_code(text,integer)','execute') then raise exception 'Anonymous access'; end if;
end $verify$;
rollback;
select 'PASS: installed code RPCs, normalization, version conflict, private registry and historical ownership; all test changes rolled back' as result;
