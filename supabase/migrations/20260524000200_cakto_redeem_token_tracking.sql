alter table public.redeem_tokens
  add column if not exists cakto_order_id text,
  add column if not exists cakto_ref_id text,
  add column if not exists cakto_product_id text,
  add column if not exists cakto_offer_id text,
  add column if not exists cakto_subscription_id text,
  add column if not exists cakto_event text,
  add column if not exists email_sent_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text;

create unique index if not exists redeem_tokens_cakto_order_id_key
  on public.redeem_tokens (cakto_order_id)
  where cakto_order_id is not null;

create index if not exists redeem_tokens_buyer_email_idx
  on public.redeem_tokens (lower(buyer_email))
  where buyer_email is not null;

create index if not exists redeem_tokens_cakto_subscription_id_idx
  on public.redeem_tokens (cakto_subscription_id)
  where cakto_subscription_id is not null;
