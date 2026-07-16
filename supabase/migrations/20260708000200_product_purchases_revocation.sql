ALTER TABLE public.product_purchases
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_product_purchases_stripe_charge_id
  ON public.product_purchases(stripe_charge_id);

CREATE INDEX IF NOT EXISTS idx_product_purchases_product_status
  ON public.product_purchases(product_key, status);
