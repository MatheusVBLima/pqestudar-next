-- Hosted authorization/lifecycle check. Always rolls back; no lasting test records.
-- This exercises database roles, not browser authentication or HTTP cookies.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $setup$
declare ids uuid[]; administrator uuid;
begin
 select array_agg(id) into ids from (
  select u.id from auth.users u where u.email_confirmed_at is not null
  and not exists(select 1 from public.user_roles r where r.user_id=u.id and r.role in ('admin','developer','moderator'))
  and not exists(select 1 from public.affiliate_profiles p where p.user_id=u.id)
  order by u.id limit 2
 ) candidates;
 select u.id into administrator from auth.users u
 where u.email='pqestudar.suporte@gmail.com' and public.has_role(u.id,'admin') limit 1;
 if cardinality(ids)<>2 or ids is null or administrator is null then raise exception 'Missing eligible test identities'; end if;
 perform set_config('test.affiliate_a',ids[1]::text,true);
 perform set_config('test.affiliate_b',ids[2]::text,true);
 perform set_config('test.affiliate_admin',administrator::text,true);
end $setup$;
set local role authenticated;
do $lifecycle$
declare a jsonb; b jsonb; dashboard jsonb; code text; blocked boolean;
begin
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_a'),true);
 a:=public.affiliate_apply('Rollback verification A','Internal rollback verification');
 if a->>'status'<>'pending' then raise exception 'Expected pending'; end if;
 if public.affiliate_apply('Repeated request','Internal repeated request')->>'id'<>a->>'id' then raise exception 'Duplicate application'; end if;
 blocked:=false;
 begin perform public.affiliate_review((a->>'id')::uuid,'approve','Self approval attempt',1);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Self approval allowed'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_b'),true);
 b:=public.affiliate_apply('Rollback verification B','Internal rollback verification');
 if exists(select 1 from public.affiliate_profiles where id=(a->>'id')::uuid) then raise exception 'Cross-account profile leak'; end if;
 if exists(select 1 from public.affiliate_applications where profile_id=(a->>'id')::uuid) then raise exception 'Cross-account application leak'; end if;
 if public.affiliate_dashboard()->'profile'->>'id'<>b->>'id' then raise exception 'Dashboard ownership'; end if;
 blocked:=false;
 begin perform public.affiliate_admin_list('all',0);
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Ordinary account reached admin'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_admin'),true);
 perform public.affiliate_review((a->>'id')::uuid,'approve','Internal rollback approval',1);
 blocked:=false;
 begin perform public.affiliate_review((a->>'id')::uuid,'reject','Stale decision',1);
 exception when serialization_failure then blocked:=true; end;
 if not blocked then raise exception 'Stale decision accepted'; end if;
 perform public.affiliate_review((b->>'id')::uuid,'reject','Internal rollback rejection',1);
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_a'),true);
 dashboard:=public.affiliate_dashboard();
 code:=dashboard->'profile'->>'code';
 if dashboard->'profile'->>'status'<>'approved' or code is null or code !~ '^[a-f0-9]{32}$' then raise exception 'Approved dashboard missing code'; end if;
 if (public.affiliate_sales(0)->>'total')::integer<>0 then raise exception 'Unexpected initial sales'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_admin'),true);
 perform public.affiliate_review((a->>'id')::uuid,'suspend','Internal rollback suspension',2);
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_a'),true);
 if public.affiliate_apply('Repeated request','Internal repeated request')->>'status'<>'suspended' then raise exception 'Suspension reset'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_admin'),true);
 perform public.affiliate_review((a->>'id')::uuid,'reactivate','Internal rollback reactivation',3);
 if (select count(*) from public.affiliate_audit_logs where profile_id=(a->>'id')::uuid)<>4 then raise exception 'Audit history mismatch'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_a'),true);
 if public.affiliate_dashboard()->'profile'->>'code'<>code then raise exception 'Code changed'; end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.affiliate_b'),true);
 if public.affiliate_dashboard()->'application'->>'decision_reason'<>'Internal rollback rejection' then raise exception 'Missing rejection reason'; end if;
end $lifecycle$;
rollback;
select 'PASS: hosted lifecycle, idempotency, approval, ownership, denial, stale decisions, rejection, suspension, reactivation, audit; transaction rolled back' as result;
