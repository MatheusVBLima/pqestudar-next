UPDATE public.products
SET
  description = 'Guia digital com mais de 50 benefícios, auxílios, descontos, cursos e direitos organizados em linguagem simples. Escolha entre o acesso básico ou o plano Premium com 3 bônus e atualizações por 1 ano.',
  sales_page = jsonb_build_object(
    'priceLabel', 'A partir de R$ 10,00',
    'ctaLabel', 'Conhecer os planos'
  ),
  updated_at = NOW()
WHERE title = 'Mapa dos Benefícios Ocultos';
