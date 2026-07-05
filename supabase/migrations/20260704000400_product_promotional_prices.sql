UPDATE public.products
SET
  sales_page = COALESCE(sales_page, '{}'::JSONB) || jsonb_build_object(
    'priceLabel', 'R$ 10,00',
    'oldPriceLabel', 'R$ 47,00',
    'ctaLabel', COALESCE(NULLIF(sales_page->>'ctaLabel', ''), 'Conhecer os planos')
  ),
  updated_at = NOW()
WHERE title = 'Mapa dos Benefícios Ocultos';

COMMENT ON COLUMN public.products.sales_page IS
  'Optional card presentation data: priceLabel, oldPriceLabel and ctaLabel.';
