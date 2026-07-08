CREATE TABLE IF NOT EXISTS public.product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'canceled')),
  amount_total INTEGER,
  currency TEXT NOT NULL DEFAULT 'brl',
  provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe')),
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_purchases_user_id_idx
  ON public.product_purchases (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS product_purchases_customer_email_idx
  ON public.product_purchases (LOWER(customer_email), created_at DESC)
  WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_purchases_product_status_idx
  ON public.product_purchases (product_key, status, created_at DESC);

ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage product purchases" ON public.product_purchases;
CREATE POLICY "Admins manage product purchases"
  ON public.product_purchases
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users read own product purchases" ON public.product_purchases;
CREATE POLICY "Users read own product purchases"
  ON public.product_purchases
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      customer_email IS NOT NULL
      AND LOWER(customer_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

REVOKE ALL ON TABLE public.product_purchases FROM anon;
GRANT SELECT ON TABLE public.product_purchases TO authenticated;

COMMENT ON TABLE public.product_purchases IS
  'One-time product purchases and access grants generated from Stripe Checkout.';

COMMENT ON COLUMN public.product_purchases.product_key IS
  'Internal product identifier, e.g. certificado-que-conta.';
