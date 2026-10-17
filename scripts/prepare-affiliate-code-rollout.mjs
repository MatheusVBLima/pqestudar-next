import fs from 'node:fs';
import { createHash } from 'node:crypto';
const file='20261016000100_affiliate_custom_codes.sql';
const source=fs.readFileSync(`supabase/migrations/${file}`,'utf8').replaceAll('\r\n','\n');
const previous=fs.readFileSync('supabase/migrations/20261011000200_affiliate_attribution.sql','utf8').replaceAll('\r\n','\n');
const body=previous.match(/create function public\.affiliate_capture\([\s\S]*?as \$\$([\s\S]*?)\$\$;/)?.[1];
if(!body)throw new Error('Missing capture dependency');
const hash=createHash('md5').update(body).digest('hex');
const sql=`begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(hashtextextended('affiliate-custom-codes-20261016',0));
do $guard$ begin
 if to_regclass('public.affiliate_codes') is not null then raise exception 'Custom codes already installed'; end if;
 if not exists(select 1 from pg_proc where oid=to_regprocedure('public.affiliate_capture(text,text,text)') and md5(replace(prosrc,chr(13),''))='${hash}' and prosecdef) then raise exception 'Capture dependency changed'; end if;
end $guard$;
${source.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')}
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261016000100','affiliate_custom_codes',array[$migration$${source}$migration$]);
do $verify$ begin
 if exists(select 1 from public.affiliate_profiles p where p.code is not null and not exists(select 1 from public.affiliate_codes c where c.code=p.code and c.profile_id=p.id)) then raise exception 'Missing code reservation'; end if;
 if has_table_privilege('authenticated','public.affiliate_codes','select') or has_table_privilege('authenticated','public.affiliate_profiles','update') then raise exception 'Unexpected table privileges'; end if;
 if has_function_privilege('anon','public.affiliate_change_code(text,integer)','execute') or has_function_privilege('authenticated','public.affiliate_capture(text,text,text)','execute') then raise exception 'Unexpected function privileges'; end if;
end $verify$;
notify pgrst, 'reload schema';
`;
fs.mkdirSync('test-results/affiliates',{recursive:true});
fs.writeFileSync('test-results/affiliates/custom-codes-dry-run.sql',sql+'rollback;\n');
fs.writeFileSync('test-results/affiliates/custom-codes-rollout.sql',sql+'commit;\n');
console.log('Prepared one guarded migration, with separate rollback rehearsal. No SQL executed.');
