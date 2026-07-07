CREATE TABLE IF NOT EXISTS public.certificate_course_ai_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'lovable' CHECK (provider IN ('lovable', 'openai')),
  lovable_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  openai_model TEXT NOT NULL DEFAULT 'gpt-5.4-mini',
  fallback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_input_chars INTEGER NOT NULL DEFAULT 12000 CHECK (max_input_chars BETWEEN 2000 AND 30000),
  max_output_tokens INTEGER NOT NULL DEFAULT 1800 CHECK (max_output_tokens BETWEEN 300 AND 4000),
  timeout_ms INTEGER NOT NULL DEFAULT 45000 CHECK (timeout_ms BETWEEN 5000 AND 120000),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.certificate_course_ai_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.certificate_course_ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_requested TEXT NOT NULL CHECK (provider_requested IN ('lovable', 'openai')),
  provider_used TEXT CHECK (provider_used IN ('lovable', 'openai')),
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'limited')),
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(14, 8),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  attempts JSONB NOT NULL DEFAULT '[]'::JSONB,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS certificate_course_ai_runs_created_at_idx
  ON public.certificate_course_ai_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS certificate_course_ai_runs_provider_idx
  ON public.certificate_course_ai_runs (provider_used, created_at DESC);

ALTER TABLE public.certificate_course_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_course_ai_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage certificate course AI settings" ON public.certificate_course_ai_settings;
CREATE POLICY "Admins manage certificate course AI settings"
  ON public.certificate_course_ai_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read certificate course AI runs" ON public.certificate_course_ai_runs;
CREATE POLICY "Admins read certificate course AI runs"
  ON public.certificate_course_ai_runs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.certificate_course_ai_settings FROM anon;
REVOKE ALL ON TABLE public.certificate_course_ai_runs FROM anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.certificate_course_ai_settings TO authenticated;
GRANT SELECT ON TABLE public.certificate_course_ai_runs TO authenticated;

COMMENT ON TABLE public.certificate_course_ai_settings IS
  'Singleton configuration for the admin-only Certificado que Conta AI laboratory.';

COMMENT ON TABLE public.certificate_course_ai_runs IS
  'Measured AI attempts made by the Certificado que Conta laboratory.';
