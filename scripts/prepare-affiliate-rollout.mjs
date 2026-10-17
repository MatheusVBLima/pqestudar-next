import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Generate a narrowly scoped, atomic rollout; never runs SQL itself.
const files = ['20261011000100_affiliate_membership.sql', '20261011000200_affiliate_attribution.sql'];
const payment = fs.readFileSync('supabase/migrations/20260914000100_mercado_pago_premium.sql', 'utf8').replaceAll('\r\n', '\n');
const signatures = {
  prepare_mercado_pago_order: 'uuid,uuid,text,boolean,text,text',
  record_mercado_pago_order: 'uuid,text,text,timestamp with time zone',
};
const guards = Object.entries(signatures).map(([name, signature]) => {
  const body = payment.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`))?.[1];
  if (!body) throw new Error(`Cannot extract ${name}`);
  const hash = createHash('md5').update(body).digest('hex');
  return `if not exists(select 1 from pg_proc where oid=to_regprocedure('public.${name}(${signature})') and md5(replace(prosrc,chr(13),''))='${hash}' and prosecdef) then raise exception 'Payment dependency changed: ${name}'; end if;`;
}).join('\n');
let sql = `begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(hashtextextended('mbo-partners-rollout-20261011',0));
do $guard$ begin
if to_regclass('public.affiliate_profiles') is not null then raise exception 'Partners already exists; inspect before applying'; end if;
${guards}
end $guard$;
`;
for (const file of files) {
  const original = fs.readFileSync(`supabase/migrations/${file}`, 'utf8').replaceAll('\r\n', '\n');
  const body = original.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, '');
  if (/^\s*(begin|commit|rollback);/m.test(body)) throw new Error('Unexpected transaction boundary');
  if (original.includes('$migration_source$')) throw new Error('Unsafe SQL delimiter');
  const version = file.split('_')[0];
  const name = file.slice(version.length + 1, -4);
  sql += `\n-- Source: ${file}\n${body}\n`;
  sql += `insert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[$migration_source$${original}$migration_source$]);\n`;
}
sql += `
do $verify$ begin
if (select tracking_enabled from public.affiliate_settings where id) then raise exception 'Tracking must remain disabled'; end if;
if has_function_privilege('anon','public.affiliate_admin_list(text,integer)','execute') then raise exception 'Anonymous admin execution'; end if;
if has_function_privilege('authenticated','public.prepare_affiliate_mercado_pago_order(uuid,uuid,text,boolean,text,text,text)','execute') then raise exception 'Public checkout mutation'; end if;
if has_table_privilege('authenticated','public.affiliate_commissions','select') then raise exception 'Raw financial data exposed'; end if;
${guards}
end $verify$;
notify pgrst, 'reload schema';
`;
fs.mkdirSync('test-results/affiliates', { recursive: true });
fs.writeFileSync('test-results/affiliates/rollout.sql', sql + 'commit;\n');
fs.writeFileSync('test-results/affiliates/rollout-dry-run.sql', sql + 'rollback;\n');
console.log('Generated atomic rollout and rollback rehearsal for exactly two Partners migrations. No database changes made.');
