CREATE TABLE IF NOT EXISTS public.site_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_feature_flags_public_read" ON public.site_feature_flags;
CREATE POLICY "site_feature_flags_public_read"
  ON public.site_feature_flags
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "site_feature_flags_admin_manage" ON public.site_feature_flags;
CREATE POLICY "site_feature_flags_admin_manage"
  ON public.site_feature_flags
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.site_feature_flags (key, enabled, description)
VALUES (
  'premium_courses_public_access',
  false,
  'Libera a lista e os detalhes dos cursos Premium para todos e exibe Cursos no menu público.'
)
ON CONFLICT (key) DO NOTHING;

-- Enquanto a campanha estiver ativa, visitantes também podem ler somente
-- os cursos já publicados. Rascunhos continuam protegidos pelas políticas
-- administrativas existentes.
DROP POLICY IF EXISTS "premium_courses_campaign_public_read" ON public.premium_items;
CREATE POLICY "premium_courses_campaign_public_read"
  ON public.premium_items
  FOR SELECT
  TO anon, authenticated
  USING (
    item_type = 'course'
    AND status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.site_feature_flags flag
      WHERE flag.key = 'premium_courses_public_access'
        AND flag.enabled = true
    )
  );
