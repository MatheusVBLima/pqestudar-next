import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PGlite } from '../test-results/mercado-pago-sql/node_modules/@electric-sql/pglite/dist/index.js';
const db = new PGlite();
const owner = randomUUID(), other = randomUUID(), admin = randomUUID();
const hash = s => createHash('sha256').update(s).digest('hex');
async function as(id, role='authenticated') { await db.exec(`reset role; set role ${role}`); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id || '']); }
async function rpc(name,args=[]) { return (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value; }
const cipher='v1.'+'x'.repeat(60), mask='email: ****test';
let profile;
async function sale() {
  const buyer=randomUUID(), id=randomUUID(), provider='ORD'+id.replaceAll('-','').toUpperCase();
  await as(null,'service_role');
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[buyer,buyer+'@test.invalid']);
  await rpc('prepare_affiliate_mercado_pago_order',[id,buyer,buyer+'@test.invalid',true,'123','https://example.test',hash('ref')]);
  await rpc('record_affiliate_mercado_pago_order',[id,provider,'paid',new Date().toISOString(),hash(id+'paid'),{}]);
  await db.exec('reset role');
  const c=(await db.query('select id from public.affiliate_commissions where order_id=$1',[id])).rows[0].id;
  return {id,provider,c};
}
async function reconcile(s, mature=true) {
  await as(null,'service_role'); await rpc('affiliate_reconcile_net',[s.id,5555,'settlement-'+s.id,hash(s.id)]);
  if(mature) {await db.exec('reset role');await db.query("update public.affiliate_commissions set available_after=now()-interval '1 day' where id=$1",[s.c]);}
}
async function refund(s) { await as(null,'service_role'); await rpc('record_affiliate_mercado_pago_order',[s.id,s.provider,'refunded',new Date().toISOString(),hash(s.id+'refund'),{}]); }
async function request(amount=1000,id=randomUUID()) {await as(owner);await rpc('affiliate_request_payout',[id,amount,cipher,mask]);return id;}
async function advance(id,target,version,extra=[]) {await as(admin);return rpc('affiliate_review_payout',[id,version,target,'Verified operation',...extra]);}
try {
 await db.exec(fs.readFileSync('supabase/tests/affiliate-fixture.sql','utf8'));
 for(const file of ['20260708000100_stripe_product_purchases.sql','20260913000100_stripe_premium_lifetime.sql','20260914000100_mercado_pago_premium.sql','20261011000100_affiliate_membership.sql','20261011000200_affiliate_attribution.sql','20261016000100_affiliate_custom_codes.sql','20261017000100_affiliate_wallet.sql']) await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 for(const id of [owner,other,admin]) await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@test.invalid']);
 await db.query("insert into public.test_roles values($1,'admin')",[admin]);
 await as(owner); profile=await rpc('affiliate_apply',['Wallet owner','Educational videos']);
 await as(admin); await rpc('affiliate_review',[profile.id,'approve','Verified membership',1]); await rpc('affiliate_tracking_settings',[true,30]); await rpc('affiliate_finance_settings',[100,30]);
 await as(owner);const code=(await rpc('affiliate_dashboard')).profile.code;
 await as(null,'service_role');await rpc('affiliate_capture',[code,hash('ref'),hash('subject')]);
 await as(null,'anon');await assert.rejects(()=>rpc('affiliate_wallet'),/permission denied/);
 await as(owner);await assert.rejects(()=>rpc('affiliate_finance_admin'),/admin_required/);await assert.rejects(()=>rpc('affiliate_finance_settings',[100,1]),/admin_required/);
 await assert.rejects(()=>db.exec('select * from public.affiliate_payout_requests'),/permission denied/);
 await assert.rejects(()=>rpc('affiliate_release_commission',[randomUUID()]),/admin_required/);
 await assert.rejects(()=>request(100),/insufficient_balance/);
 const a=await sale();
 await as(admin);await assert.rejects(()=>rpc('affiliate_release_commission',[a.c]),/commission_not_eligible/);
 await reconcile(a,false);await as(admin);await assert.rejects(()=>rpc('affiliate_release_commission',[a.c]),/commission_not_eligible/);
 await db.exec('reset role');await db.query("update public.affiliate_commissions set available_after=now()-interval '1 day' where id=$1",[a.c]);
 await as(admin);await rpc('affiliate_release_commission',[a.c]);await rpc('affiliate_release_commission',[a.c]);
 await as(owner);let w=await rpc('affiliate_wallet');assert.equal(w.available_cents,1389);assert.equal(w.pending_cents,0);assert.equal(w.entries.length,1);
 const p=await request();await request(1000,p);await assert.rejects(()=>request(900,p),/payout_conflict/);await assert.rejects(()=>request(100),/payout_pending/);
 await as(owner);w=await rpc('affiliate_wallet');assert.equal(w.available_cents,389);assert.equal(w.reserved_cents,1000);assert.equal(w.payouts.length,1);assert.equal('pix_ciphertext' in w.payouts[0],false);
 await as(other);await assert.rejects(()=>rpc('affiliate_wallet'),/profile_not_found/);await assert.rejects(()=>rpc('affiliate_payout_detail',[p]),/admin_required/);await assert.rejects(()=>rpc('affiliate_review_payout',[p,1,'reviewing','Intrusion']),/admin_required/);
 await assert.rejects(()=>advance(p,'paid',1),/invalid_transition/);
 await advance(p,'reviewing',1);await assert.rejects(()=>advance(p,'approved',1),/stale_version/);await advance(p,'approved',2);await advance(p,'processing',3);
 await assert.rejects(()=>advance(p,'paid',4),/payment_proof_required/);
 await advance(p,'paid',4,['PIX-UNIQUE-1',Buffer.from('255044462d312e370a','hex'),'application/pdf']);
 await assert.rejects(()=>advance(p,'paid',4,['PIX-UNIQUE-1',Buffer.from('255044462d312e370a','hex'),'application/pdf']),/stale_version/);
 await as(owner);w=await rpc('affiliate_wallet');assert.equal(w.paid_cents,1000);assert.equal(w.reserved_cents,0);assert.equal(w.available_cents,389);
 await refund(a);await refund(a);
 await as(owner);w=await rpc('affiliate_wallet');assert.equal(w.available_cents,-1000);assert.equal(w.paid_cents,1000);assert.equal(w.entries.filter(e=>e.kind==='reversal').length,1);
 await as(admin);assert.equal((await rpc('affiliate_finance_admin')).recoveries[0].debt_cents,-1000);
 const b=await sale();await reconcile(b);await as(admin);await rpc('affiliate_release_commission',[b.c]);
 const p2=await request(300);await refund(b);
 await as(owner);w=await rpc('affiliate_wallet');assert.equal(w.available_cents,-1000);assert.equal(w.reserved_cents,0);assert.equal(w.payouts.find(p=>p.id===p2).status,'rejected');
 await assert.rejects(()=>advance(p2,'reviewing',1),/stale_version/);
 const c=await sale();await reconcile(c);await as(admin);await rpc('affiliate_release_commission',[c.c]);
 const p3=await request(200);await advance(p3,'rejected',1);await as(owner);assert.equal((await rpc('affiliate_wallet')).available_cents,389);
 await as(admin);const v=(await rpc('affiliate_admin_list',['all',0])).items.find(p=>p.id===profile.id).version;await rpc('affiliate_review',[profile.id,'suspend','Safety review',v]);
 await assert.rejects(()=>request(100),/affiliate_approval_required/);
 await as(owner);assert.equal((await rpc('affiliate_wallet')).approved,false);
 await db.exec('reset role');await assert.rejects(()=>db.exec('delete from public.affiliate_ledger'),/immutable_financial_record/);await assert.rejects(()=>db.exec("update public.affiliate_payout_attempts set reason='rewrite'"),/immutable_financial_record/);
 console.log('Wallet SQL: actual migrations passed isolation, precision, release eligibility, idempotency, reservations, paid evidence, refunds, recovery debt, suspension and immutable history.');
} finally {await db.close();}
