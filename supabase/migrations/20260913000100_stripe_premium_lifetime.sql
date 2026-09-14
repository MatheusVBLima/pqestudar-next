-- Ensure the existing Stripe revocation prerequisites are present.
ALTER TABLE public.product_purchases
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_product_purchases_stripe_charge_id
  ON public.product_purchases(stripe_charge_id);

CREATE INDEX IF NOT EXISTS idx_product_purchases_product_status
  ON public.product_purchases(product_key, status);

-- Stripe purchases augment existing access; they never overwrite subscriptions.
create table if not exists public.stripe_payment_revocations (
  payment_intent_id text primary key,
  reason text not null check (reason in ('refund','dispute')),
  created_at timestamptz not null default now()
);
alter table public.stripe_payment_revocations enable row level security;
revoke all on public.stripe_payment_revocations from anon, authenticated;
grant all on public.stripe_payment_revocations to service_role;

create or replace function public.record_stripe_premium_purchase(p_purchase jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_existing public.product_purchases%rowtype;
  v_status text := p_purchase->>'status';
  v_intent text := p_purchase->>'payment_intent';
  v_user uuid := nullif(p_purchase->>'user_id','')::uuid;
  v_reason text;
begin
  if p_purchase->>'product_key' is distinct from 'pqestudar-premium-lifetime'
     or (p_purchase->>'amount_total')::integer is distinct from 5990
     or p_purchase->>'currency' is distinct from 'brl'
     or coalesce(p_purchase->>'session_id','') not like 'cs_%'
     or coalesce(p_purchase->>'verified_price_id','') not like 'price_%'
     or v_status is null or v_status not in ('pending','paid','failed','canceled') then
    raise exception 'invalid_premium_purchase';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_intent,p_purchase->>'session_id'), 13092026));
  select * into v_existing from public.product_purchases
    where stripe_checkout_session_id=p_purchase->>'session_id' for update;
  select reason into v_reason from public.stripe_payment_revocations where payment_intent_id=v_intent;
  if v_reason is not null then
    v_status := case when v_reason='refund' then 'refunded' else 'canceled' end;
  elsif v_existing.revoked_at is not null then
    return; -- Replayed payment events cannot restore revoked access.
  elsif v_existing.status='paid' then
    return; -- A delayed pending/failed/expired event cannot undo payment.
  end if;
  if v_existing.user_id is not null then v_user := v_existing.user_id; end if;
  if v_user is not null and not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null) then
    v_user := null;
  end if;
  if v_user is null then
    select id into v_user from auth.users
      where lower(email)=lower(p_purchase->>'email') and email_confirmed_at is not null
      order by created_at limit 1;
  end if;
  insert into public.product_purchases (
    product_key,user_id,customer_email,status,amount_total,currency,provider,
    stripe_checkout_session_id,stripe_payment_intent_id,stripe_customer_id,metadata,revoked_at,revoked_reason
  ) values (
    'pqestudar-premium-lifetime',v_user,lower(p_purchase->>'email'),v_status,5990,'brl','stripe',
    p_purchase->>'session_id',v_intent,p_purchase->>'customer_id',
    jsonb_build_object('verified_price_id',p_purchase->>'verified_price_id','plan_type','lifetime','plan_tier','premium'),
    case when v_status in ('canceled','refunded') then now() else null end,
    case when v_status in ('canceled','refunded') then coalesce(v_reason,'canceled') else null end
  ) on conflict (stripe_checkout_session_id) do update set
    user_id=excluded.user_id,status=excluded.status,customer_email=excluded.customer_email,
    stripe_payment_intent_id=excluded.stripe_payment_intent_id,metadata=excluded.metadata,
    revoked_at=excluded.revoked_at,revoked_reason=excluded.revoked_reason,updated_at=now();
end;
$$;
revoke all on function public.record_stripe_premium_purchase(jsonb) from public,anon,authenticated;
grant execute on function public.record_stripe_premium_purchase(jsonb) to service_role;

create or replace function public.revoke_stripe_premium_payment(p_payment_intent text,p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_payment_intent is null or p_payment_intent not like 'pi_%' or p_reason not in ('refund','dispute') then
    raise exception 'invalid_revocation';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_payment_intent,13092026));
  insert into public.stripe_payment_revocations(payment_intent_id,reason) values(p_payment_intent,p_reason)
    on conflict(payment_intent_id) do nothing;
  update public.product_purchases set
    status=case when p_reason='refund' then 'refunded' else 'canceled' end,
    revoked_at=now(),revoked_reason=p_reason,updated_at=now()
    where product_key='pqestudar-premium-lifetime' and stripe_payment_intent_id=p_payment_intent;
end;
$$;
revoke all on function public.revoke_stripe_premium_payment(text,text) from public,anon,authenticated;
grant execute on function public.revoke_stripe_premium_payment(text,text) to service_role;

create or replace function public.get_effective_subscription()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid := auth.uid(); v_email text; v_purchase public.product_purchases%rowtype; v_sub jsonb;
begin
  if v_uid is null then return null; end if;
  select lower(email) into v_email from auth.users where id=v_uid and email_confirmed_at is not null;
  -- Bind only unclaimed purchases to the authenticated, verified email owner.
  if v_email is not null then
    update public.product_purchases set user_id=v_uid,updated_at=now()
      where user_id is null and lower(customer_email)=v_email
      and product_key='pqestudar-premium-lifetime' and status='paid' and revoked_at is null;
  end if;
  select * into v_purchase from public.product_purchases
    where user_id=v_uid and product_key='pqestudar-premium-lifetime' and status='paid'
    and revoked_at is null and amount_total=5990 and currency='brl'
    and metadata->>'verified_price_id' like 'price_%'
    order by created_at limit 1;
  if found then
    return jsonb_build_object('id',v_purchase.id,'user_id',v_uid,'status','active',
      'plan_type','lifetime','plan_tier','premium','starts_at',v_purchase.created_at,
      'ends_at','9999-12-31T23:59:59Z','created_at',v_purchase.created_at,'updated_at',v_purchase.updated_at);
  end if;
  select to_jsonb(s) into v_sub from public.subscriptions s where user_id=v_uid limit 1;
  return v_sub;
end;
$$;
revoke all on function public.get_effective_subscription() from public,anon;
grant execute on function public.get_effective_subscription() to authenticated;

create or replace function public.has_active_subscription()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.subscriptions where user_id=auth.uid() and status='active' and ends_at>now())
  or exists(select 1 from public.product_purchases where user_id=auth.uid()
    and product_key='pqestudar-premium-lifetime' and status='paid' and revoked_at is null
    and amount_total=5990 and currency='brl' and metadata->>'verified_price_id' like 'price_%');
$$;
