-- Expands the map with benefits whose legal or operational reach is national.
-- Territory-dependent programs are intentionally left for state/municipal coverage.

WITH national_benefits(slug) AS (
  VALUES
    ('abono-salarial-pis-pasep'),
    ('atendimento-preferencial'),
    ('auxilio-gas-vale-gas'),
    ('auxilio-reclusao'),
    ('beneficio-de-prestacao-continuada-bpc-loas'),
    ('cadastro-positivo-serasa-spc'),
    ('carteira-de-trabalho-digital'),
    ('carteira-do-artesao-pab'),
    ('casamento-civil-gratuito'),
    ('centros-de-referencia-de-assistencia-social-cras'),
    ('certidao-de-antecedentes-criminais'),
    ('cnh-digital-cdt'),
    ('defensoria-publica'),
    ('direito-de-arrependimento-cdc'),
    ('escola-do-trabalhador-4-0'),
    ('fundo-de-financiamento-estudantil-fies'),
    ('id-jovem-identidade-jovem'),
    ('isencao-de-ipi-na-compra-de-veiculos-pcd'),
    ('justica-gratuita'),
    ('lei-de-acesso-a-informacao-lai'),
    ('lei-do-acompanhante'),
    ('meu-inss'),
    ('passe-livre-interestadual'),
    ('pensao-por-morte'),
    ('plataforma-nao-me-perturbe'),
    ('plataforma-consumidor-gov-br'),
    ('plataforma-sougov-br'),
    ('portal-da-transparencia'),
    ('portal-de-empreendedorismo'),
    ('programa-farmacia-popular'),
    ('programa-minha-casa-minha-vida'),
    ('programa-nacional-de-credito-fundiario'),
    ('programa-universidade-para-todos-prouni'),
    ('pronatec-qualifica-mais'),
    ('registrato-banco-central'),
    ('salario-maternidade'),
    ('saque-aniversario-do-fgts'),
    ('seguro-defeso-pescador-artesanal'),
    ('seguro-desemprego'),
    ('sistema-de-selecao-unificada-sisu'),
    ('tarifa-social-de-agua'),
    ('tarifa-social-de-energia-eletrica'),
    ('titulo-de-eleitor-digital-e-titulo'),
    ('valores-a-receber-banco-central')
)
INSERT INTO public.benefit_coverages (
  benefit_id,
  coverage_level,
  country_code,
  label,
  boundary_path,
  center_lat,
  center_lng,
  default_zoom,
  is_active,
  verified_at,
  source_url
)
SELECT
  item.id,
  'national',
  'BR',
  'Brasil',
  '/data/brasil-limite.geojson',
  -14.2,
  -51.9,
  4,
  true,
  CURRENT_DATE,
  item.external_url
FROM national_benefits candidate
JOIN public.premium_items item ON item.slug = candidate.slug
WHERE item.status = 'published'
  AND item.tags @> ARRAY['__benefit']::text[]
ON CONFLICT (benefit_id, label) DO UPDATE SET
  coverage_level = EXCLUDED.coverage_level,
  boundary_path = EXCLUDED.boundary_path,
  center_lat = EXCLUDED.center_lat,
  center_lng = EXCLUDED.center_lng,
  default_zoom = EXCLUDED.default_zoom,
  is_active = true,
  verified_at = EXCLUDED.verified_at,
  source_url = COALESCE(EXCLUDED.source_url, public.benefit_coverages.source_url),
  updated_at = now();

NOTIFY pgrst, 'reload schema';
