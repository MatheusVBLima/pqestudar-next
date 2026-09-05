-- Block 4 / Part B2: audited Gás do Povo eligibility triage.
-- Consolidated normative state verified through 2026-09-05.
--
-- This models current-entry triage as one default route. Bolsa Família and
-- official CadÚnico data remain external checks because the profile cannot
-- distinguish initial concession, review, or the monetary-benefit migration.
-- Household-derived per-capita income is supporting only and can never reject.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.premium_items
    WHERE id = 'a715c384-a5ff-4cf4-8d35-2d47af5da813'
      AND slug = 'gas-do-povo'
  ) THEN
    RAISE EXCEPTION 'Canonical Gás do Povo premium item was not found';
  END IF;
END $$;

WITH rules (
  benefit_id, rule_key, route_key, applies_to_routes, criterion_key, operator,
  expected_value, group_key, group_operator, importance, match_message,
  unknown_message, mismatch_message, source_url, verified_at, effective_from,
  effective_to, reference_period, rule_version, sort_order, is_active
) AS (
  VALUES
  (
    'a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid,
    'gas-do-povo-cadunico', 'default', NULL::text[], 'cadunico_status',
    'equals', '"yes"'::jsonb, 'gas-do-povo-core', 'and', 'required',
    'O perfil informa inscrição no Cadastro Único.',
    'Informe a situação no Cadastro Único para completar esta parte da avaliação.',
    'Este requisito não parece compatível: a modalidade exige inscrição no Cadastro Único.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
    DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
    'Portaria MDS 1.124/2025 consolidada pelas Portarias MDS 1.171/2026 e 1.208/2026',
    1, 10, true
  ),
  (
    'a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid,
    'gas-do-povo-cadunico-family-size', 'default', NULL::text[],
    'cadunico_family_size', 'greater_than_or_equal', '2'::jsonb,
    'gas-do-povo-core', 'and', 'required',
    'A família informada no Cadastro Único possui pelo menos duas pessoas.',
    'Informe quantas pessoas estão cadastradas na mesma família do Cadastro Único.',
    'Este requisito não parece compatível: a modalidade exige pelo menos duas pessoas na família cadastrada no Cadastro Único.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
    DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
    'Portaria MDS 1.124/2025, art. 3, IV, redação vigente em 2026',
    1, 20, true
  ),
  (
    'a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid,
    'gas-do-povo-income-estimate', 'default', NULL::text[],
    'per_capita_income', 'less_than_or_equal', '810.50'::jsonb,
    'gas-do-povo-income-estimate', 'and', 'supporting',
    'A estimativa domiciliar está dentro de meio salário mínimo por pessoa.',
    'Não há renda e composição domiciliar suficientes para uma estimativa auxiliar.',
    'A estimativa domiciliar supera meio salário mínimo por pessoa, mas isso não determina incompatibilidade: a composição e a renda oficiais do Cadastro Único precisam ser confirmadas.',
    'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
    DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
    'salario_minimo_2026: 1/2 de R$ 1.621,00 = R$ 810,50',
    1, 30, true
  )
)
INSERT INTO public.benefit_eligibility_criteria (
  benefit_id, rule_key, route_key, applies_to_routes, criterion_key, operator,
  expected_value, group_key, group_operator, importance, match_message,
  unknown_message, mismatch_message, source_url, verified_at, effective_from,
  effective_to, reference_period, rule_version, sort_order, is_active
)
SELECT * FROM rules
ON CONFLICT (benefit_id, rule_key, rule_version) DO UPDATE SET
  route_key = EXCLUDED.route_key,
  applies_to_routes = EXCLUDED.applies_to_routes,
  criterion_key = EXCLUDED.criterion_key,
  operator = EXCLUDED.operator,
  expected_value = EXCLUDED.expected_value,
  group_key = EXCLUDED.group_key,
  group_operator = EXCLUDED.group_operator,
  importance = EXCLUDED.importance,
  match_message = EXCLUDED.match_message,
  unknown_message = EXCLUDED.unknown_message,
  mismatch_message = EXCLUDED.mismatch_message,
  source_url = EXCLUDED.source_url,
  verified_at = EXCLUDED.verified_at,
  effective_from = EXCLUDED.effective_from,
  effective_to = EXCLUDED.effective_to,
  reference_period = EXCLUDED.reference_period,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

WITH checks (
  benefit_id, route_key, applies_to_routes, verification_key, message,
  source_url, verified_at, effective_from, effective_to, reference_period,
  rule_version, sort_order, is_active
) AS (
  VALUES
  ('a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid, 'default', NULL::text[],
   'gas-do-povo-official-family-income',
   'É necessário confirmar a renda e a composição familiar registradas oficialmente no Cadastro Único.',
   'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
   DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
   'Portaria MDS 1.124/2025, art. 3, II', 1, 40, true),
  ('a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid, 'default', NULL::text[],
   'gas-do-povo-cadunico-current',
   'É necessário que o Cadastro Único esteja atualizado há, no máximo, 24 meses.',
   'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
   DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
   'Portaria MDS 1.124/2025, art. 3, III', 1, 50, true),
  ('a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid, 'default', NULL::text[],
   'gas-do-povo-bolsa-familia-context',
   'É necessário confirmar nos registros oficiais o requisito do Bolsa Família e se o caso é de concessão inicial, revisão ou migração, pois há exceções específicas para esses contextos.',
   'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
   DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
   'Portaria MDS 1.124/2025, arts. 3, X, 7, §3, e 20', 1, 60, true),
  ('a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid, 'default', NULL::text[],
   'gas-do-povo-responsible-cpf',
   'É necessário confirmar que o CPF do responsável familiar está cadastrado conforme as normas do Cadastro Único.',
   'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
   DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
   'Portaria MDS 1.124/2025, art. 3, VI', 1, 70, true),
  ('a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid, 'default', NULL::text[],
   'gas-do-povo-registration-impediments',
   'É necessário confirmar que o responsável familiar não possui impedimentos cadastrais vigentes, como indício de óbito, multiplicidade, cancelamento ou suspensão de CPF.',
   'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
   DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
   'Portaria MDS 1.124/2025, art. 3, VII', 1, 80, true),
  ('a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid, 'default', NULL::text[],
   'gas-do-povo-cadastral-verification',
   'É necessário confirmar que a família não possui situação pendente nos processos vigentes de Averiguação Cadastral.',
   'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
   DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
   'Portaria MDS 1.124/2025, art. 3, V', 1, 90, true),
  ('a715c384-a5ff-4cf4-8d35-2d47af5da813'::uuid, 'default', NULL::text[],
   'gas-do-povo-administrative-selection',
   'Mesmo com requisitos compatíveis, a seleção é administrativa e depende do processamento oficial e da disponibilidade orçamentária e financeira.',
   'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo',
   DATE '2026-09-05', DATE '2026-03-20', DATE '2026-12-31',
   'Portaria MDS 1.124/2025, arts. 3, §1, e 4', 1, 100, true)
)
INSERT INTO public.benefit_eligibility_verifications (
  benefit_id, route_key, applies_to_routes, verification_key, message,
  source_url, verified_at, effective_from, effective_to, reference_period,
  rule_version, sort_order, is_active
)
SELECT * FROM checks
ON CONFLICT (benefit_id, verification_key, route_key, rule_version) DO UPDATE SET
  applies_to_routes = EXCLUDED.applies_to_routes,
  message = EXCLUDED.message,
  source_url = EXCLUDED.source_url,
  verified_at = EXCLUDED.verified_at,
  effective_from = EXCLUDED.effective_from,
  effective_to = EXCLUDED.effective_to,
  reference_period = EXCLUDED.reference_period,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

NOTIFY pgrst, 'reload schema';
