-- Editorial migration for the former Auxilio Gas entry.
-- The canonical slug must move before the alias is inserted because the alias
-- collision trigger intentionally forbids an alias equal to a current slug.
-- Supabase migrations are transactional, so the old URL has no observable gap.
DO $$
DECLARE
  target_id CONSTANT uuid := 'a715c384-a5ff-4cf4-8d35-2d47af5da813';
  official_url CONSTANT text := 'https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.premium_items
    WHERE id = target_id
      AND slug IN ('auxilio-gas-vale-gas', 'gas-do-povo')
  ) THEN
    RAISE EXCEPTION 'Expected Premium benefit was not found for the Gás do Povo editorial migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.premium_items
    WHERE slug = 'gas-do-povo'
      AND id <> target_id
  ) THEN
    RAISE EXCEPTION 'Canonical slug gas-do-povo belongs to another Premium item';
  END IF;

  UPDATE public.premium_items
  SET
    title = 'Gás do Povo',
    slug = 'gas-do-povo',
    description_short = 'O Gás do Povo oferece recarga gratuita do botijão de gás de cozinha de 13 kg a famílias selecionadas, em revendas credenciadas.',
    description_full = E'## Como funciona\n\nO Gás do Povo oferece um vale para a recarga gratuita do botijão de gás de cozinha de 13 kg em revendas credenciadas. O programa substituiu o antigo Auxílio Gás dos Brasileiros, que fazia pagamento em dinheiro.\n\n## Quem pode participar\n\nPara participar, a família precisa estar inscrita no Cadastro Único, manter os dados atualizados nos últimos 24 meses e ter renda mensal por pessoa de até meio salário mínimo. O governo também verifica a regularidade do CPF do responsável familiar, indício de falecimento e pendências de averiguação cadastral.\n\nA regra geral e as prioridades consideram a composição familiar. Há exceções normativas para situações específicas, por isso a situação de cada família deve ser consultada nos canais oficiais.\n\n## Seleção\n\nA seleção é feita automaticamente pelo governo e considera os critérios do programa, suas prioridades e o orçamento disponível. Famílias beneficiárias do Bolsa Família têm prioridade. Cumprir os requisitos não garante entrada imediata.\n\n## Como usar\n\nA família selecionada pode consultar o benefício pelos canais oficiais e utilizar o vale em uma revenda credenciada. A recarga pode ser autorizada pelos meios habilitados pelo programa, como cartão, CPF com código enviado ao celular ou aplicativo oficial.\n\n## Atenção\n\nO benefício é nacional, mas depende de seleção oficial. Consulte a situação da família e as orientações atualizadas na página oficial do programa.',
    external_url = official_url,
    updated_at = now()
  WHERE id = target_id;

  INSERT INTO public.premium_item_slug_aliases (premium_item_id, old_slug, is_active)
  VALUES (target_id, 'auxilio-gas-vale-gas', true)
  ON CONFLICT (old_slug) DO UPDATE
  SET is_active = true
  WHERE public.premium_item_slug_aliases.premium_item_id = EXCLUDED.premium_item_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.premium_item_slug_aliases
    WHERE premium_item_id = target_id
      AND old_slug = 'auxilio-gas-vale-gas'
      AND is_active
  ) THEN
    RAISE EXCEPTION 'The legacy slug is already assigned elsewhere or could not be activated';
  END IF;

  UPDATE public.benefit_coverages
  SET
    source_url = official_url,
    verified_at = DATE '2026-09-04',
    updated_at = now()
  WHERE benefit_id = target_id
    AND coverage_level = 'national'
    AND country_code = 'BR';

  IF NOT EXISTS (
    SELECT 1
    FROM public.benefit_coverages
    WHERE benefit_id = target_id
      AND coverage_level = 'national'
      AND country_code = 'BR'
      AND is_active
  ) THEN
    RAISE EXCEPTION 'Active national coverage was not preserved';
  END IF;
END $$;

