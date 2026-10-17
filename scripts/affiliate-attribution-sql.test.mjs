import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PGlite } from '../test-results/mercado-pago-sql/node_modules/@electric-sql/pglite/dist/index.js';
const db=new PGlite();
const owner=randomUUID(), second=randomUUID(), admin=randomUUID();
const hash=value=>createHash('sha256').update(value).digest('hex');
async function as(id,role='authenticated') { await db.exec(`reset role; set role ${role}`); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']); }
async function rpc(name,args=[]) {return (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value;}
async function user() {const id=randomUUID(); await as(null,'service_role'); await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`${id}@test.invalid`]);return id;}
async function prepare(token, buyer, live=true,id=randomUUID()) {
 const who=buyer||await user(); await as(null,'service_role');
 await rpc('prepare_affiliate_mercado_pago_order',[id,who,`${who}@test.invalid`,live,'123','https://example.test',token]);
 return {id,buyer:who,provider:`${live?'ORD':'ORDTST'}${id.replaceAll('-','').toUpperCase()}`};
}
async function record(order,status,key=hash(`${order.id}:${status}`)) {await as(null,'service_role'); await rpc('record_affiliate_mercado_pago_order',[order.id,order.provider,status,'2026-10-11T12:00:00Z',key,{status}]);}
try {
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now());
 grant all on auth.users to service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
 create function public.is_admin() returns boolean language sql stable as $$select false$$;
 create type public.app_role as enum('admin','developer','moderator','user');
 create table public.test_roles(user_id uuid,role public.app_role);
 create function public.has_role(_user_id uuid,_role public.app_role) returns boolean language sql stable security definer as $$select exists(select 1 from public.test_roles where user_id=_user_id and role=_role)$$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 create table public.subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid,status text,plan_type text,plan_tier text,starts_at timestamptz default now(),ends_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());`);
 for(const file of ['20260708000100_stripe_product_purchases.sql','20260913000100_stripe_premium_lifetime.sql','20260914000100_mercado_pago_premium.sql','20261011000100_affiliate_membership.sql','20261011000200_affiliate_attribution.sql']) await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));
 for(const id of [owner,second,admin]) await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,`${id}@test.invalid`]);
 await db.query("insert into public.test_roles values($1,'admin')",[admin]);
 await as(owner); const a=await rpc('affiliate_apply',['Owner','Educational channel']);
 await as(second); const b=await rpc('affiliate_apply',['Second','Educational channel']);
 await as(admin); await rpc('affiliate_review',[a.id,'approve','Reviewed channel',1]); await rpc('affiliate_review',[b.id,'approve','Reviewed channel',1]);
 await as(null,'service_role');assert.equal((await rpc('affiliate_capture',['invalid',hash('disabled'),hash('subject')])).accepted,false);
 await as(admin);
 await rpc('affiliate_tracking_settings',[true,30]);
 await as(owner); const codeA=(await rpc('affiliate_dashboard')).profile.code;
 await assert.rejects(()=>rpc('affiliate_tracking_settings',[false,1]),/admin_required/);
 await as(second); const codeB=(await rpc('affiliate_dashboard')).profile.code;
 // Upgrade existing profiles and prove that historical links remain owned and active.
 await db.exec('reset role');
 await db.exec(fs.readFileSync('supabase/migrations/20261016000100_affiliate_custom_codes.sql','utf8'));
 await as(null,'anon'); await assert.rejects(()=>rpc('affiliate_code_available',['alice']),/permission denied/);
 await as(owner);
 assert.equal((await rpc('affiliate_code_available',[' Meu-Canal '])).available,true);
 await assert.rejects(()=>rpc('affiliate_change_code',['bad code',2]),/invalid_affiliate_code/);
 await assert.rejects(()=>rpc('affiliate_change_code',['meu-canal',1]),/stale_version/);
 assert.equal((await rpc('affiliate_change_code',[' Meu-Canal ',2])).code,'meu-canal');
 await assert.rejects(()=>db.exec("update public.affiliate_profiles set code='bypass'"),/permission denied/);
 await assert.rejects(()=>db.exec('select * from public.affiliate_codes'),/permission denied/);
 await as(second);
 assert.equal((await rpc('affiliate_code_available',['MEU-CANAL'])).available,false);
 assert.equal((await rpc('affiliate_code_available',[codeA])).available,false);
 await assert.rejects(()=>rpc('affiliate_change_code',['meu-canal',2]),/affiliate_code_taken/);
 assert.equal((await rpc('affiliate_dashboard')).profile.code,codeB);
 await as(null,'service_role');
 assert.equal((await rpc('affiliate_capture',['MEU-CANAL',hash('custom-token'),hash('custom-subject')])).accepted,true);
 await as(null,'service_role');
 assert.equal((await rpc('affiliate_capture',[codeA,hash('tokenA'),hash('subject')])).accepted,true);
 assert.equal((await rpc('affiliate_capture',['invalid',hash('invalid'),hash('subject')])).accepted,false);
 await rpc('affiliate_capture',[codeB,hash('tokenB'),hash('subject')]);
 await rpc('affiliate_capture',[codeA,hash('expired'),hash('subject')]);
 await db.exec('reset role');await db.query("update public.affiliate_referrals set expires_at=now()-interval '1 second' where token_hash=$1",[hash('expired')]);
 const expired=await prepare(hash('expired'));await record(expired,'paid');
 await as(owner);assert.equal((await rpc('affiliate_sales',[0])).total,0);
 const self=await prepare(hash('tokenA'),owner); await record(self,'paid');
 await as(owner); assert.equal((await rpc('affiliate_sales',[0])).total,0);
 const test=await prepare(hash('tokenA'),undefined,false); await record(test,'paid');
 await as(owner); assert.equal((await rpc('affiliate_sales',[0])).total,0);
 const plain=await prepare(null); await prepare(hash('tokenA'),plain.buyer,true,plain.id); await record(plain,'paid');
 await as(owner); assert.equal((await rpc('affiliate_sales',[0])).total,0);
 const order=await prepare(hash('tokenA'));
 await prepare(hash('tokenB'),order.buyer,true,order.id);
 await record(order,'paid'); await record(order,'paid');
 await as(owner); let sales=await rpc('affiliate_sales',[0]);
 assert.equal(sales.total,1); assert.equal(sales.valid_sales,1); assert.equal(sales.items[0].rate_bps,2500);
 assert.equal(sales.items[0].net_cents,null); assert.equal(sales.items[0].status,'pending_calculation');
 assert.equal(Object.hasOwn(sales.items[0],'buyer_id'),false); assert.equal(Object.hasOwn(sales.items[0],'order_id'),false);
 await assert.rejects(()=>db.exec('select * from public.affiliate_referrals'),/permission denied/);
 await assert.rejects(()=>db.exec('select * from public.affiliate_payment_events'),/permission denied/);
 await assert.rejects(()=>rpc('affiliate_reconcile_net',[order.id,5500,'settlement-1',hash('proof')]),/permission denied/);
 await as(second); assert.equal((await rpc('affiliate_sales',[0])).total,0);
 await as(null,'service_role');
 await assert.rejects(()=>rpc('affiliate_reconcile_net',[order.id,6000,'settlement-1',hash('proof')]),/invalid_settlement/);
 await rpc('affiliate_reconcile_net',[order.id,5555,'settlement-1',hash('proof')]);
 await rpc('affiliate_reconcile_net',[order.id,5555,'settlement-1',hash('proof')]);
 await assert.rejects(()=>rpc('affiliate_reconcile_net',[order.id,5500,'settlement-1',hash('proof')]),/reconciliation_conflict/);
 await as(owner); sales=await rpc('affiliate_sales',[0]); assert.equal(sales.items[0].commission_cents,1389); assert.equal(sales.items[0].status,'in_security');
 await record(order,'refunded'); await record(order,'paid'); await record(order,'refunded');
 await as(owner); sales=await rpc('affiliate_sales',[0]); assert.equal(sales.valid_sales,0); assert.equal(sales.items[0].status,'canceled');
 // A failed capture/revoked token must not create a new attribution.
 await as(null,'service_role'); await rpc('affiliate_revoke',[hash('tokenA')]);
 const revoked=await prepare(hash('tokenA')); await record(revoked,'paid');
 await as(owner); assert.equal((await rpc('affiliate_sales',[0])).total,1);
 // Cross thresholds with serial confirmations; prior rates never change.
 const orders=[];
 for(let i=0;i<11;i++){const value=await prepare(hash('tokenB'));await record(value,'paid');orders.push(value);}
 await as(second); sales=await rpc('affiliate_sales',[0]); assert.equal(sales.valid_sales,11);
 assert.equal(sales.items.filter(c=>c.rate_bps===2500).length,10); assert.equal(sales.items.filter(c=>c.rate_bps===3000).length,1);
 assert.equal((await rpc('affiliate_dashboard')).profile.level_id,'bronze');
 for(let i=11;i<61;i++){const value=await prepare(hash('tokenB'));await record(value,'paid');orders.push(value);}
 await as(second);sales=await rpc('affiliate_sales',[0]);assert.equal(sales.valid_sales,61);assert.equal((await rpc('affiliate_dashboard')).profile.level_id,'gold');
 assert.equal(sales.items.filter(c=>c.rate_bps===4000).length,1);
 await record(orders[0],'refunded');await record(orders[1],'canceled');await record(orders[1],'canceled');
 await as(second); assert.equal((await rpc('affiliate_sales',[0])).valid_sales,59);assert.equal((await rpc('affiliate_dashboard')).profile.level_id,'gold');
 const pending=await prepare(hash('tokenB'));
 await as(admin); const target=(await rpc('affiliate_admin_list',['approved',0])).items.find(p=>p.id===b.id); await rpc('affiliate_review',[b.id,'suspend','Suspension test',target.version]);
 await record(pending,'paid');
 await as(second); assert.equal((await rpc('affiliate_sales',[0])).valid_sales,59);
 const suspended=await prepare(hash('tokenB')); await record(suspended,'paid');
 await as(second); assert.equal((await rpc('affiliate_sales',[0])).total,62);
 await as(null,'service_role');
 for(let i=0;i<30;i++) await rpc('affiliate_capture',['invalid',hash(`limited${i}`),hash('limited')]);
 assert.equal((await rpc('affiliate_capture',[codeA,hash('limited31'),hash('limited')])).limited,true);
 await db.exec('reset role');
 assert.equal(Number((await db.query('select count(*) as n from public.affiliate_level_history')).rows[0].n),3);
 assert.equal(Number((await db.query('select count(*) as n from public.affiliate_payment_events where order_id=$1',[order.id])).rows[0].n),2);
 // Existing Premium / Stripe SQL regression suite after both new migrations.
 await db.exec('begin'); await db.exec(fs.readFileSync('supabase/tests/mercado_pago_premium.sql','utf8')); await db.exec('rollback');
 console.log('PASS: attribution immutability, no self/test commissions, token revocation, private sales, exact cents, pending net, reconciliation retries, refunds, permanent levels, future rates, suspension, rate limits and existing Premium regression. PGlite only; real concurrency/provider not verified.');
} finally {await db.close();}
