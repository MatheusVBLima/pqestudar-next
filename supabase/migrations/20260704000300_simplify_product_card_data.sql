UPDATE public.products
SET sales_page = jsonb_strip_nulls(
  jsonb_build_object(
    'priceLabel', NULLIF(sales_page->>'priceLabel', ''),
    'oldPriceLabel', NULLIF(sales_page->>'oldPriceLabel', ''),
    'ctaLabel', NULLIF(sales_page->>'ctaLabel', '')
  )
)
WHERE sales_page IS NOT NULL;

COMMENT ON COLUMN public.products.sales_page IS
  'Optional card presentation data: priceLabel, oldPriceLabel and ctaLabel.';
