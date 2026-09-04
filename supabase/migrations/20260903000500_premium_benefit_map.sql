-- Geographic availability for Premium benefits.
-- A benefit remains unique in premium_items and can have many coverages.

CREATE TABLE IF NOT EXISTS public.benefit_coverages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.premium_items(id) ON DELETE CASCADE,
  coverage_level text NOT NULL CHECK (coverage_level IN ('national', 'state', 'district', 'municipal')),
  country_code text NOT NULL DEFAULT 'BR',
  state_code text,
  municipality_name text,
  ibge_code text,
  label text NOT NULL,
  boundary_path text NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  default_zoom smallint NOT NULL DEFAULT 10 CHECK (default_zoom BETWEEN 2 AND 18),
  is_active boolean NOT NULL DEFAULT true,
  verified_at date,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (benefit_id, label)
);

CREATE TABLE IF NOT EXISTS public.benefit_service_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_id uuid NOT NULL REFERENCES public.benefit_coverages(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  verified_at date,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coverage_id, name)
);

CREATE INDEX IF NOT EXISTS benefit_coverages_benefit_id_idx
  ON public.benefit_coverages (benefit_id);
CREATE INDEX IF NOT EXISTS benefit_coverages_location_idx
  ON public.benefit_coverages (coverage_level, state_code, municipality_name)
  WHERE is_active;
CREATE INDEX IF NOT EXISTS benefit_service_points_coverage_id_idx
  ON public.benefit_service_points (coverage_id, sort_order)
  WHERE is_active;

ALTER TABLE public.benefit_coverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_service_points ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.benefit_coverages, public.benefit_service_points TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.benefit_coverages, public.benefit_service_points TO authenticated;

DROP POLICY IF EXISTS "benefit_coverages_premium_read" ON public.benefit_coverages;
CREATE POLICY "benefit_coverages_premium_read"
  ON public.benefit_coverages FOR SELECT TO authenticated
  USING (
    public.has_active_subscription()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

DROP POLICY IF EXISTS "benefit_coverages_editor_manage" ON public.benefit_coverages;
CREATE POLICY "benefit_coverages_editor_manage"
  ON public.benefit_coverages FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

DROP POLICY IF EXISTS "benefit_service_points_premium_read" ON public.benefit_service_points;
CREATE POLICY "benefit_service_points_premium_read"
  ON public.benefit_service_points FOR SELECT TO authenticated
  USING (
    public.has_active_subscription()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

DROP POLICY IF EXISTS "benefit_service_points_editor_manage" ON public.benefit_service_points;
CREATE POLICY "benefit_service_points_editor_manage"
  ON public.benefit_service_points FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

-- Local pilot benefits did not yet exist in the Premium catalogue.
INSERT INTO public.premium_items (
  title, slug, description_short, description_full, item_type, status,
  tags, sort_order, published_at
)
VALUES
  ('Passe Livre Todo Dia', 'passe-livre-todo-dia-fortaleza', 'Duas passagens gratuitas por dia para estudantes com carteira estudantil válida da Etufor.', 'Benefício municipal de transporte estudantil em Fortaleza. Consulte os requisitos vigentes antes de orientar o usuário.', 'course', 'published', ARRAY['Benefício', '__benefit', 'Educação'], 1001, now()),
  ('Passe Livre Estudantil do DF', 'passe-livre-estudantil-df', 'Gratuidade no transporte público do Distrito Federal para estudantes elegíveis.', 'Benefício distrital de transporte estudantil. A concessão depende de cadastro e dos critérios vigentes.', 'course', 'published', ARRAY['Benefício', '__benefit', 'Educação'], 1002, now()),
  ('Programa DF Social', 'programa-df-social', 'Transferência de renda para famílias de baixa renda inscritas no CadÚnico e selecionadas pelo programa.', 'Benefício de assistência social do Distrito Federal. A seleção é realizada conforme os critérios do programa.', 'course', 'published', ARRAY['Benefício', '__benefit', 'Assistência social'], 1003, now()),
  ('Cartão Gás do DF', 'cartao-gas-df', 'Benefício bimestral para famílias em situação de vulnerabilidade social selecionadas pelo programa.', 'Benefício de segurança alimentar do Distrito Federal, sujeito aos critérios e à seleção vigentes.', 'course', 'published', ARRAY['Benefício', '__benefit', 'Alimentação'], 1004, now())
ON CONFLICT (slug) DO NOTHING;

WITH coverage_seed(slug, coverage_level, state_code, municipality_name, ibge_code, label, boundary_path, center_lat, center_lng, default_zoom, source_url) AS (
  VALUES
    ('passe-livre-todo-dia-fortaleza', 'municipal', 'CE', 'Fortaleza', '2304400', 'Fortaleza, CE', '/data/fortaleza-limite.geojson', -3.755, -38.525, 11, 'https://www.fortaleza.ce.gov.br/'),
    ('passe-livre-estudantil-df', 'district', 'DF', NULL, '5300108', 'Distrito Federal', '/data/distrito-federal-limite.geojson', -15.790, -47.880, 9, 'https://www.semob.df.gov.br/'),
    ('programa-df-social', 'district', 'DF', NULL, '5300108', 'Distrito Federal', '/data/distrito-federal-limite.geojson', -15.790, -47.880, 9, 'https://www.sedes.df.gov.br/'),
    ('cartao-gas-df', 'district', 'DF', NULL, '5300108', 'Distrito Federal', '/data/distrito-federal-limite.geojson', -15.790, -47.880, 9, 'https://www.sedes.df.gov.br/'),
    ('tarifa-social-de-agua', 'national', NULL, NULL, NULL, 'Brasil', '/data/brasil-limite.geojson', -14.200, -51.900, 4, 'https://www.gov.br/ana/'),
    ('programa-farmacia-popular', 'national', NULL, NULL, NULL, 'Brasil', '/data/brasil-limite.geojson', -14.200, -51.900, 4, 'https://www.gov.br/saude/'),
    ('auxilio-gas-vale-gas', 'national', NULL, NULL, NULL, 'Brasil', '/data/brasil-limite.geojson', -14.200, -51.900, 4, 'https://www.gov.br/'),
    ('id-jovem-identidade-jovem', 'national', NULL, NULL, NULL, 'Brasil', '/data/brasil-limite.geojson', -14.200, -51.900, 4, 'https://www.gov.br/'),
    ('beneficio-de-prestacao-continuada-bpc-loas', 'national', NULL, NULL, NULL, 'Brasil', '/data/brasil-limite.geojson', -14.200, -51.900, 4, 'https://www.gov.br/inss/'),
    ('tarifa-social-de-energia-eletrica', 'national', NULL, NULL, NULL, 'Brasil', '/data/brasil-limite.geojson', -14.200, -51.900, 4, 'https://www.gov.br/aneel/'),
    ('programa-minha-casa-minha-vida', 'national', NULL, NULL, NULL, 'Brasil', '/data/brasil-limite.geojson', -14.200, -51.900, 4, 'https://www.gov.br/cidades/'),
    ('centros-de-referencia-de-assistencia-social-cras', 'municipal', 'CE', 'Fortaleza', '2304400', 'Fortaleza, CE', '/data/fortaleza-limite.geojson', -3.755, -38.525, 11, 'https://www.fortaleza.ce.gov.br/'),
    ('centros-de-referencia-de-assistencia-social-cras', 'district', 'DF', NULL, '5300108', 'Distrito Federal', '/data/distrito-federal-limite.geojson', -15.790, -47.880, 9, 'https://www.sedes.df.gov.br/')
)
INSERT INTO public.benefit_coverages (
  benefit_id, coverage_level, state_code, municipality_name, ibge_code,
  label, boundary_path, center_lat, center_lng, default_zoom, source_url, verified_at
)
SELECT item.id, seed.coverage_level, seed.state_code, seed.municipality_name, seed.ibge_code,
       seed.label, seed.boundary_path, seed.center_lat, seed.center_lng, seed.default_zoom,
       seed.source_url, CURRENT_DATE
FROM coverage_seed seed
JOIN public.premium_items item ON item.slug = seed.slug
ON CONFLICT (benefit_id, label) DO UPDATE SET
  coverage_level = EXCLUDED.coverage_level,
  state_code = EXCLUDED.state_code,
  municipality_name = EXCLUDED.municipality_name,
  ibge_code = EXCLUDED.ibge_code,
  boundary_path = EXCLUDED.boundary_path,
  center_lat = EXCLUDED.center_lat,
  center_lng = EXCLUDED.center_lng,
  default_zoom = EXCLUDED.default_zoom,
  source_url = EXCLUDED.source_url,
  verified_at = EXCLUDED.verified_at,
  updated_at = now();

WITH point_seed(slug, coverage_label, name, address, latitude, longitude, sort_order) AS (
  VALUES
    ('passe-livre-todo-dia-fortaleza', 'Fortaleza, CE', 'Central de Atendimento', 'Centro, Fortaleza – CE', -3.728, -38.527, 1),
    ('passe-livre-todo-dia-fortaleza', 'Fortaleza, CE', 'Posto Antônio Bezerra', 'Antônio Bezerra, Fortaleza – CE', -3.737, -38.591, 2),
    ('passe-livre-estudantil-df', 'Distrito Federal', 'Galeria dos Estados', 'Galeria dos Estados, Brasília – DF', -15.800, -47.890, 1),
    ('passe-livre-estudantil-df', 'Distrito Federal', 'Rodoviária do Plano Piloto', 'Estação Central, Brasília – DF', -15.794, -47.883, 2),
    ('passe-livre-estudantil-df', 'Distrito Federal', 'Na Hora Ceilândia', 'QNM 11, Área Especial 3, Ceilândia – DF', -15.815, -48.108, 3),
    ('programa-df-social', 'Distrito Federal', 'CRAS Brasília', 'Av. L2 Sul, SGAS 614/615, Brasília – DF', -15.829, -47.907, 1),
    ('programa-df-social', 'Distrito Federal', 'CRAS Ceilândia Norte', 'QNN 15, Área Especial Módulo A, Ceilândia – DF', -15.807, -48.116, 2),
    ('cartao-gas-df', 'Distrito Federal', 'CRAS Brasília', 'Av. L2 Sul, SGAS 614/615, Brasília – DF', -15.829, -47.907, 1),
    ('cartao-gas-df', 'Distrito Federal', 'CRAS Ceilândia Norte', 'QNN 15, Área Especial Módulo A, Ceilândia – DF', -15.807, -48.116, 2),
    ('centros-de-referencia-de-assistencia-social-cras', 'Distrito Federal', 'CRAS Brasília', 'Av. L2 Sul, SGAS 614/615, Brasília – DF', -15.829, -47.907, 1),
    ('centros-de-referencia-de-assistencia-social-cras', 'Distrito Federal', 'CRAS Ceilândia Norte', 'QNN 15, Área Especial Módulo A, Ceilândia – DF', -15.807, -48.116, 2)
)
INSERT INTO public.benefit_service_points (
  coverage_id, name, address, latitude, longitude, sort_order, verified_at
)
SELECT coverage.id, seed.name, seed.address, seed.latitude, seed.longitude, seed.sort_order, CURRENT_DATE
FROM point_seed seed
JOIN public.premium_items item ON item.slug = seed.slug
JOIN public.benefit_coverages coverage
  ON coverage.benefit_id = item.id AND coverage.label = seed.coverage_label
ON CONFLICT (coverage_id, name) DO UPDATE SET
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  sort_order = EXCLUDED.sort_order,
  verified_at = EXCLUDED.verified_at,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
