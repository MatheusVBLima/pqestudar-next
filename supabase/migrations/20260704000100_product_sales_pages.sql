ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sales_page JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.products.sales_page IS
  'Optional card presentation data: priceLabel, oldPriceLabel and ctaLabel.';
