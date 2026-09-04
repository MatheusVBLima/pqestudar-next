-- Block 4 / Part B2 (2 of 7): audited BPC/LOAS eligibility rules.
-- Model: COMMON AND (elderly OR disability).
--
-- household_monthly_income / household_size is only a preliminary signal. The
-- legal BPC family group and excluded income items are not equivalent to every
-- resident and every household income. The official calculation therefore
-- remains a mandatory external verification and the estimate cannot reject a
-- route by itself.

WITH benefit AS (
  SELECT id
  FROM public.premium_items
  WHERE slug = 'beneficio-de-prestacao-continuada-bpc-loas'
), criteria (
  benefit_id, rule_key, route_key, applies_to_routes, criterion_key, operator,
  expected_value, group_key, group_operator, importance, match_message,
  unknown_message, mismatch_message, source_url, verified_at, effective_from,
  effective_to, reference_period, rule_version, sort_order, is_active
) AS (
  SELECT id, 'bpc-cadunico', 'common', NULL::text[], 'cadunico_status',
    'equals', '"yes"'::jsonb, 'bpc-common', 'and', 'required',
    'A inscrição informada no Cadastro Único atende a um requisito do BPC.',
    'Não foi informada a situação deste perfil no Cadastro Único.',
    'O BPC exige inscrição no Cadastro Único.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/suas/beneficios-assistenciais/beneficio-assistencial-ao-idoso-e-a-pessoa-com-deficiencia-bpc',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Requisito constitutivo vigente auditado em 2026', 1, 10, true FROM benefit
  UNION ALL
  SELECT id, 'bpc-per-capita-income-basic-limit', 'common', NULL::text[],
    'per_capita_income', 'less_than_or_equal', '405.25'::jsonb,
    'bpc-common', 'and', 'supporting',
    'A estimativa simples de renda por pessoa está dentro do limite básico do BPC.',
    'Não há renda e composição domiciliar suficientes para uma estimativa preliminar.',
    'A estimativa simples ultrapassa o limite básico; o INSS ainda deve aplicar o grupo familiar e as exclusões de renda próprios do BPC.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/suas/beneficios-assistenciais/beneficio-assistencial-ao-idoso-e-a-pessoa-com-deficiencia-bpc',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'salario_minimo_2026: 1/4 de R$ 1.621,00 = R$ 405,25; Decreto nº 12.797/2025',
    1, 20, true FROM benefit
  UNION ALL
  SELECT id, 'bpc-elderly-age', 'elderly', NULL::text[], 'age',
    'greater_than_or_equal', '65'::jsonb, 'bpc-elderly', 'and', 'required',
    'A idade informada atende ao requisito da rota para pessoa idosa.',
    'Não foi informada a idade deste perfil.',
    'A idade informada não atende à rota do BPC para pessoa idosa.',
    'https://www.gov.br/inss/pt-br/direitos-e-deveres/beneficios-assistenciais/beneficio-assistencial-a-pessoa-idosa-bpc-loas',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Requisito etário vigente auditado em 2026', 1, 30, true FROM benefit
  UNION ALL
  SELECT id, 'bpc-disability-declared', 'disability', NULL::text[], 'disability',
    'is_true', 'true'::jsonb, 'bpc-disability', 'and', 'required',
    'A deficiência declarada permite analisar a rota para pessoa com deficiência.',
    'Não foi informado se a pessoa analisada possui deficiência.',
    'A ausência declarada de deficiência não atende a esta rota.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/suas/beneficios-assistenciais/beneficio-assistencial-ao-idoso-e-a-pessoa-com-deficiencia-bpc',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Autodeclaração é somente sinal preliminar; não substitui avaliação oficial',
    1, 40, true FROM benefit
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
  WHERE slug = 'beneficio-de-prestacao-continuada-bpc-loas'
), verifications (
  benefit_id, route_key, applies_to_routes, verification_key, message,
  source_url, verified_at, effective_from, effective_to, reference_period,
  rule_version, sort_order, is_active
) AS (
  SELECT id, 'common', NULL::text[], 'bpc-official-family-income-assessment',
    'O INSS precisa confirmar a renda com o grupo familiar e as exclusões legais próprios do BPC.',
    'https://www.planalto.gov.br/ccivil_03/leis/l8742compilado.htm',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'LOAS, art. 20, §§ 1º, 3º e 11; verificação vigente em 2026', 1, 50, true FROM benefit
  UNION ALL
  SELECT id, 'common', NULL::text[], 'bpc-cadunico-current-and-complete',
    'O Cadastro Único deve estar atualizado há no máximo dois anos e conter o CPF de todos os integrantes da família.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/suas/beneficios-assistenciais/beneficio-assistencial-ao-idoso-e-a-pessoa-com-deficiencia-bpc',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Exigência cadastral vigente auditada em 2026', 1, 60, true FROM benefit
  UNION ALL
  SELECT id, 'common', NULL::text[], 'bpc-biometric-registration',
    'A concessão exige registro biométrico do requerente ou, nas hipóteses legais, do responsável.',
    'https://www.gov.br/governodigital/pt-br/identidade/cin/faq_biometria/',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Exigência biométrica vigente auditada em 2026', 1, 70, true FROM benefit
  UNION ALL
  SELECT id, 'common', NULL::text[], 'bpc-residence-in-brazil',
    'É necessário confirmar que a pessoa reside no Brasil.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/suas/beneficios-assistenciais/beneficio-assistencial-ao-idoso-e-a-pessoa-com-deficiencia-bpc',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Requisito de residência vigente auditado em 2026', 1, 80, true FROM benefit
  UNION ALL
  SELECT id, 'common', NULL::text[], 'bpc-benefit-non-accumulation',
    'É necessário verificar se não há acúmulo com benefício incompatível segundo as regras do BPC.',
    'https://www.gov.br/inss/pt-br/direitos-e-deveres/beneficios-assistenciais/beneficio-assistencial-a-pessoa-idosa-bpc-loas',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Regra de não acumulação vigente auditada em 2026', 1, 90, true FROM benefit
  UNION ALL
  SELECT id, 'disability', NULL::text[], 'bpc-biopsychosocial-assessment',
    'A deficiência e seu impedimento de longo prazo precisam ser confirmados pela avaliação biopsicossocial oficial.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/suas/beneficios-assistenciais/beneficio-assistencial-ao-idoso-e-a-pessoa-com-deficiencia-bpc',
    DATE '2026-09-04', DATE '2026-01-01', DATE '2026-12-31',
    'Verificação específica da rota disability vigente auditada em 2026', 1, 100, true FROM benefit
)
INSERT INTO public.benefit_eligibility_verifications (
  benefit_id, route_key, applies_to_routes, verification_key, message,
  source_url, verified_at, effective_from, effective_to, reference_period,
  rule_version, sort_order, is_active
)
SELECT * FROM verifications
ON CONFLICT (benefit_id, verification_key, route_key, rule_version) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.premium_items
    WHERE slug = 'beneficio-de-prestacao-continuada-bpc-loas'
  ) THEN
    RAISE EXCEPTION 'BPC/LOAS premium item was not found';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
