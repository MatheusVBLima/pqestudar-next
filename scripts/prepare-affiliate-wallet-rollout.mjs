import fs from 'node:fs';
import { createHash } from 'node:crypto';
const file='20261017000100_affiliate_wallet.sql';
const source=fs.readFileSync('supabase/migrations/'+file,'utf8').replaceAll('\r\n','\n');
const phase3=fs.readFileSync('supabase/migrations/20261011000200_affiliate_attribution.sql','utf8').replaceAll('\r\n','\n');
const dependencies=[['affiliate_order_status_changed',''],['affiliate_sales','integer'],['affiliate_dashboard','']].map(([name,args])=>{
 const body=phase3.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`))?.[1];
 if(!body)throw new Error('Missing dependency '+name);
 return `if not exists(select 1 from pg_proc where oid=to_regprocedure('public.${name}(${args})') and md5(replace(prosrc,chr(13),''))='${createHash('md5').update(body).digest('hex')}' and prosecdef) then raise exception 'Changed dependency: ${name}'; end if;`;
}).join('\n');
const sql=`begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(hashtextextended('affiliate-wallet-20261017',0));
do $guard$ begin
 if to_regclass('public.affiliate_ledger') is not null then raise exception 'Wallet already installed'; end if;
 ${dependencies}
end $guard$;
${source.replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'')}
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261017000100','affiliate_wallet',array[$migration$${source}$migration$]);
do $verify$ declare t text; begin
 foreach t in array array['affiliate_ledger','affiliate_payout_requests','affiliate_payout_attempts'] loop
 if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) or has_table_privilege('authenticated','public.'||t,'select') or has_table_privilege('service_role','public.'||t,'insert') then raise exception 'Unsafe wallet grants'; end if;
 end loop;
 if has_function_privilege('anon','public.affiliate_wallet(integer)','execute') or has_function_privilege('authenticated','public.affiliate_wallet_orders(uuid,uuid)','execute') then raise exception 'Unsafe wallet functions'; end if;
 if exists(select 1 from public.affiliate_ledger) or exists(select 1 from public.affiliate_payout_requests) then raise exception 'Unexpected financial writes'; end if;
end $verify$;
`;
fs.mkdirSync('test-results/affiliates',{recursive:true});
fs.writeFileSync('test-results/affiliates/wallet-dry-run.sql',sql+'rollback;\n');
fs.writeFileSync('test-results/affiliates/wallet-rollout.sql',sql+'commit;\n');
console.log('Prepared one guarded wallet migration and rollback rehearsal; no database changes executed.');
