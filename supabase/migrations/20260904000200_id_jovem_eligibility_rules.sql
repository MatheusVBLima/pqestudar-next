-- Block 4 / Part B2 (1 of 7): audited ID Jovem eligibility rules.
-- Sources verified on 2026-09-04. The 2026 income ceiling expires with the
-- reference year so a future minimum-wage change cannot silently reuse it.

WITH benefit AS (
  SELECT id
  FROM public.premium_items
  WHERE slug = 'id-jovem-identidade-jovem'
), criteria (
  benefit_id, rule_key, route_key, applies_to_routes, criterion_key, operator,
  expected_value, group_key, group_operator, importance, match_message,
  unknown_message, mismatch_message, source_url, verified_at, effective_from,
  effective_to, reference_period, rule_version, sort_order, is_active
) AS (
  SELECT id, 'id-jovem-age-min', 'default', NULL::text[], 'age',
    'greater_than_or_equal', '15'::jsonb, 'id-jovem-requirements', 'and', 'required',
    'A idade informada atende à idade mínima prevista para a ID Jovem.',
    'Não foi informada a idade deste perfil.',
    'A idade informada está abaixo da idade mínima prevista para a ID Jovem.',
    'https://www.gov.br/pt-br/servicos/obter-a-carteira-de-identidade-jovem',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Requisitos vigentes auditados em 2026', 1, 10, true FROM benefit
  UNION ALL
  SELECT id, 'id-jovem-age-max', 'default', NULL::text[], 'age',
    'less_than_or_equal', '29'::jsonb, 'id-jovem-requirements', 'and', 'required',
    'A idade informada não ultrapassa a idade máxima prevista para a ID Jovem.',
    'Não foi informada a idade deste perfil.',
    'A idade informada ultrapassa a idade máxima prevista para a ID Jovem.',
    'https://www.gov.br/pt-br/servicos/obter-a-carteira-de-identidade-jovem',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Requisitos vigentes auditados em 2026', 1, 20, true FROM benefit
  UNION ALL
  SELECT id, 'id-jovem-family-income-max', 'default', NULL::text[],
    'household_monthly_income', 'less_than_or_equal', '3242'::jsonb,
    'id-jovem-requirements', 'and', 'required',
    'A renda familiar informada está dentro do limite considerado para a ID Jovem.',
    'Não foi informada a renda mensal do grupo familiar.',
    'A renda familiar informada ultrapassa o limite considerado para a ID Jovem.',
    'https://www.gov.br/pt-br/servicos/obter-a-carteira-de-identidade-jovem',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'salario_minimo_2026: 2 x R$ 1.621,00 = R$ 3.242,00; Decreto nº 12.797/2025',
    1, 30, true FROM benefit
  UNION ALL
  SELECT id, 'id-jovem-cadunico', 'default', NULL::text[], 'cadunico_status',
    'equals', '"yes"'::jsonb, 'id-jovem-requirements', 'and', 'required',
    'A inscrição informada no Cadastro Único é compatível com a ID Jovem.',
    'Não foi informada a situação no Cadastro Único.',
    'A ID Jovem exige inscrição no Cadastro Único.',
    'https://www.gov.br/pt-br/servicos/obter-a-carteira-de-identidade-jovem',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Requisitos vigentes auditados em 2026', 1, 40, true FROM benefit
)
INSERT INTO public.benefit_eligibility_criteria (
  benefit_id, rule_key, route_key, applies_to_routes, criterion_key, operator,
  expected_value, group_key, group_operator, importance, match_message,
  unknown_message, mismatch_message, source_url, verified_at, effective_from,
  effective_to, reference_period, rule_version, sort_order, is_active
)
SELECT * FROM criteria
ON CONFLICT (benefit_id, rule_key, rule_version) DO NOTHING;

WITH benefit AS (
  SELECT id
  FROM public.premium_items
  WHERE slug = 'id-jovem-identidade-jovem'
)
INSERT INTO public.benefit_eligibility_verifications (
  benefit_id, route_key, applies_to_routes, verification_key, message,
  source_url, verified_at, effective_from, effective_to, reference_period,
  rule_version, sort_order, is_active
)
SELECT id, 'default', NULL, 'id-jovem-cadunico-updated-24-months',
  'O Cadastro Único precisa ter sido atualizado nos últimos 24 meses.',
  'https://www.gov.br/pt-br/servicos/obter-a-carteira-de-identidade-jovem',
  DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
  'Requisito cadastral vigente auditado em 2026', 1, 50, true
FROM benefit
ON CONFLICT (benefit_id, verification_key, route_key, rule_version) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.premium_items
    WHERE slug = 'id-jovem-identidade-jovem'
  ) THEN
    RAISE EXCEPTION 'ID Jovem premium item was not found';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
