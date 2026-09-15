-- Orders are created server-side and belong to an authenticated, verified account.
create table public.mercado_pago_orders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  seller_id text not null,
  site_url text not null,
  live_mode boolean not null default false,
  order_id text unique,
  amount_total integer not null default 5990 check (amount_total = 5990),
  currency text not null default 'brl' check (currency = 'brl'),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','canceled')),
  revoked_at timestamptz,
  provider_updated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mercado_pago_orders_user_idx on public.mercado_pago_orders(user_id,created_at);
alter table public.mercado_pago_orders enable row level security;
revoke all on public.mercado_pago_orders from public,anon,authenticated;
grant select on public.mercado_pago_orders to authenticated;
grant all on public.mercado_pago_orders to service_role;
create policy "Owner reads Mercado Pago orders" on public.mercado_pago_orders
  for select to authenticated using (user_id=auth.uid());

create function public.prepare_mercado_pago_order(p_reference uuid,p_user uuid,p_email text,p_live boolean,p_seller text,p_site text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.mercado_pago_orders%rowtype;
begin
  if p_live is null or p_seller is null or p_seller !~ '^\d+$' or p_site is null or p_site not like 'https://%'
    or not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and lower(email)=lower(p_email)) then
    raise exception 'invalid_checkout_owner';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,14092026));
  select * into v_order from public.mercado_pago_orders where id=p_reference;
  if found then
    if v_order.user_id<>p_user or v_order.live_mode<>p_live or v_order.seller_id<>p_seller or v_order.site_url<>p_site then
      raise exception 'checkout_owner_mismatch';
    end if;
    if v_order.created_at<now()-interval '23 hours' and v_order.status='pending' then raise exception 'checkout_expired'; end if;
    return to_jsonb(v_order);
  end if;
  if (select count(*) from public.mercado_pago_orders where user_id=p_user and created_at>now()-interval '1 hour')>=10 then
    raise exception 'checkout_rate_limit';
  end if;
  insert into public.mercado_pago_orders(id,user_id,customer_email,live_mode,seller_id,site_url)
    values(p_reference,p_user,lower(p_email),p_live,p_seller,p_site) returning * into v_order;
  return to_jsonb(v_order);
end;
$$;
revoke all on function public.prepare_mercado_pago_order(uuid,uuid,text,boolean,text,text) from public,anon,authenticated;
grant execute on function public.prepare_mercado_pago_order(uuid,uuid,text,boolean,text,text) to service_role;

create function public.record_mercado_pago_order(p_reference uuid,p_order_id text,p_status text,p_updated_at timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.mercado_pago_orders%rowtype;
begin
  if p_order_id is null or p_order_id !~ '^ORD[A-Z0-9]{10,60}$' or p_updated_at is null
    or p_status is null or p_status not in ('pending','paid','failed','refunded','canceled') then raise exception 'invalid_order'; end if;
  select * into strict v_order from public.mercado_pago_orders where id=p_reference for update;
  if (v_order.order_id is not null and v_order.order_id<>p_order_id)
    or (p_order_id like 'ORDTST%')=v_order.live_mode then raise exception 'order_mismatch'; end if;
  -- Revocations are terminal, including a refund received before a delayed paid event.
  if v_order.revoked_at is not null then return; end if;
  if p_status not in ('refunded','canceled') then
    if v_order.provider_updated_at>p_updated_at then return; end if;
    if v_order.status='paid' and p_status<>'paid' then return; end if;
  end if;
  update public.mercado_pago_orders set order_id=p_order_id,status=p_status,
    revoked_at=case when p_status in ('refunded','canceled') then now() else null end,
    provider_updated_at=p_updated_at,last_synced_at=now(),updated_at=now()
    where id=p_reference;
end;
$$;
revoke all on function public.record_mercado_pago_order(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_mercado_pago_order(uuid,text,text,timestamptz) to service_role;

create or replace function public.get_effective_subscription()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid := auth.uid(); v_email text; v_purchase public.product_purchases%rowtype;
  v_mp public.mercado_pago_orders%rowtype; v_sub jsonb;
begin
  if v_uid is null then return null; end if;
  select * into v_mp from public.mercado_pago_orders where user_id=v_uid and live_mode=true
    and status='paid' and revoked_at is null and order_id is not null and provider_updated_at is not null
    and amount_total=5990 and currency='brl' order by created_at limit 1;
  if found then
    return jsonb_build_object('id',v_mp.id,'user_id',v_uid,'status','active',
      'plan_type','lifetime','plan_tier','premium','starts_at',v_mp.created_at,
      'ends_at','9999-12-31T23:59:59Z','created_at',v_mp.created_at,'updated_at',v_mp.updated_at);
  end if;
  -- Preserve existing Stripe purchases, verified guest claims and subscription fallback.
  select lower(email) into v_email from auth.users where id=v_uid and email_confirmed_at is not null;
  if v_email is not null then
    update public.product_purchases set user_id=v_uid,updated_at=now()
      where user_id is null and lower(customer_email)=v_email
      and product_key='pqestudar-premium-lifetime' and status='paid' and revoked_at is null;
  end if;
  select * into v_purchase from public.product_purchases
    where user_id=v_uid and product_key='pqestudar-premium-lifetime' and status='paid'
    and revoked_at is null and amount_total=5990 and currency='brl'
    and metadata->>'verified_price_id' like 'price_%' order by created_at limit 1;
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
    and amount_total=5990 and currency='brl' and metadata->>'verified_price_id' like 'price_%')
  or exists(select 1 from public.mercado_pago_orders where user_id=auth.uid() and live_mode=true
    and status='paid' and revoked_at is null and order_id is not null and provider_updated_at is not null
    and amount_total=5990 and currency='brl');
$$;
