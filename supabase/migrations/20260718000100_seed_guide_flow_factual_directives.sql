-- Seed core guide-flow directives that keep AI generations grounded in the
-- selected Biblioteca context instead of inventing unsupported facts.

INSERT INTO public.guide_flow_knowledge (
  title,
  content,
  category,
  is_active,
  sort_order,
  source_type,
  source_bucket,
  source_path,
  extraction_status
)
SELECT
  'Regra de fidelidade factual',
  '# Regra de fidelidade factual

A geração deve usar apenas informações presentes nas referências, contextos ou fontes fornecidas no fluxo.

Não invente dados, números, benefícios, requisitos, instituições, promessas, certificações, preços, prazos, funcionalidades ou condições que não estejam explicitamente presentes no contexto.

Quando uma informação importante não estiver disponível, faça uma das seguintes opções:

1. omita a informação;
2. diga que não foi possível confirmar;
3. recomende que o usuário verifique no site oficial ou regulamento da fonte.

Não transforme suposições em afirmações.
Não complete lacunas com conhecimento geral.
Não use linguagem de certeza quando o contexto não sustentar a informação.

Se houver conflito entre referências, informe a divergência de forma neutra e priorize a fonte oficial.',
  'editorial',
  true,
  -100,
  'manual',
  'guide-structure',
  null,
  'not_applicable'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.guide_flow_knowledge
  WHERE title = 'Regra de fidelidade factual'
);

INSERT INTO public.guide_flow_knowledge (
  title,
  content,
  category,
  is_active,
  sort_order,
  source_type,
  source_bucket,
  source_path,
  extraction_status
)
SELECT
  'Como usar contextos da Biblioteca',
  '# Como usar contextos da Biblioteca

Os contextos da Biblioteca servem como base factual do conteúdo.

Use as diretrizes para decidir forma, linguagem, estrutura e organização.

Use os contextos para decidir fatos, exemplos, requisitos, benefícios, limitações e orientações.

Se um contexto estiver selecionado, ele deve ser tratado como a principal fonte de informação factual da geração.

Se nenhum contexto factual estiver selecionado, gere apenas estrutura genérica e deixe claro que as informações precisam ser confirmadas antes da publicação.',
  'editorial',
  true,
  -99,
  'manual',
  'guide-structure',
  null,
  'not_applicable'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.guide_flow_knowledge
  WHERE title = 'Como usar contextos da Biblioteca'
);
