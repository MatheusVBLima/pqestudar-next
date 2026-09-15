import fs from 'node:fs';
import { PGlite } from '../test-results/mercado-pago-sql/node_modules/@electric-sql/pglite/dist/index.js';
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create function public.is_admin() returns boolean language sql stable as $$ select false $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    create table public.subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid,status text,plan_type text,plan_tier text,
      starts_at timestamptz default now(),ends_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
  `);
  for (const file of ['20260708000100_stripe_product_purchases.sql', '20260913000100_stripe_premium_lifetime.sql', '20260914000100_mercado_pago_premium.sql']) {
    await db.exec(fs.readFileSync(`supabase/migrations/${file}`, 'utf8'));
  }
  // Minimal protected-content fixture exercises the same subscription helper used by content RLS.
  await db.exec(`create table public.premium_items(status text,item_type text);
    insert into public.premium_items values('published','benefit');
    alter table public.premium_items enable row level security;
    grant select on public.premium_items to authenticated;
    create policy premium_test_access on public.premium_items for select to authenticated using(public.has_active_subscription());`);
  await db.exec('begin');
  await db.exec(fs.readFileSync('supabase/tests/stripe_premium_lifetime.sql', 'utf8'));
  await db.exec('rollback');
  await db.exec('begin');
  await db.exec(fs.readFileSync('supabase/tests/mercado_pago_premium.sql', 'utf8'));
  await db.exec('rollback');
  console.log('PASS: PostgreSQL migrations, Stripe regression, Mercado Pago grants/revocations, idempotency, test isolation and RLS. In-memory database only.');
} catch (error) {
  console.error(error.message, error.where || '');
  process.exitCode = 1;
} finally { await db.close(); }
