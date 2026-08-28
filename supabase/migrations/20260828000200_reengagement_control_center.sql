CREATE TABLE IF NOT EXISTS public.reengagement_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('saved_inactive', 'user_inactive', 'related_content', 'long_inactive', 'manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'smart')),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  wait_days INTEGER NOT NULL DEFAULT 7 CHECK (wait_days >= 0),
  cooldown_days INTEGER NOT NULL DEFAULT 7 CHECK (cooldown_days >= 1),
  max_per_30_days INTEGER NOT NULL DEFAULT 4 CHECK (max_per_30_days BETWEEN 1 AND 30),
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 1 AND 100),
  email_template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reengagement_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.reengagement_journeys(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'cancelled', 'sending', 'sent', 'failed', 'opened', 'clicked', 'returned')),
  reason TEXT,
  recommendation JSONB NOT NULL DEFAULT '{}'::JSONB,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS reengagement_journeys_active_idx
  ON public.reengagement_journeys (is_active, priority DESC);
CREATE UNIQUE INDEX IF NOT EXISTS reengagement_journeys_name_idx
  ON public.reengagement_journeys (LOWER(name));
CREATE INDEX IF NOT EXISTS reengagement_deliveries_queue_idx
  ON public.reengagement_deliveries (status, scheduled_at);
CREATE INDEX IF NOT EXISTS reengagement_deliveries_user_idx
  ON public.reengagement_deliveries (user_id, created_at DESC);

ALTER TABLE public.reengagement_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reengagement_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage reengagement journeys" ON public.reengagement_journeys;
CREATE POLICY "Admins manage reengagement journeys"
  ON public.reengagement_journeys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role));

DROP POLICY IF EXISTS "Admins manage reengagement deliveries" ON public.reengagement_deliveries;
CREATE POLICY "Admins manage reengagement deliveries"
  ON public.reengagement_deliveries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role));

INSERT INTO public.reengagement_journeys
  (name, description, trigger_type, channel, wait_days, cooldown_days, max_per_30_days, priority, trigger_config)
VALUES
  ('Você salvou, mas ainda não voltou', 'Lembra o usuário de um conteúdo salvo que ainda pode ser útil.', 'saved_inactive', 'in_app', 3, 5, 4, 70, '{"recommendation_limit": 1}'::JSONB),
  ('Novidades no seu tema', 'Seleciona até três conteúdos relacionados aos interesses recentes.', 'user_inactive', 'smart', 7, 7, 4, 60, '{"recommendation_limit": 3}'::JSONB),
  ('Sentimos sua falta', 'Curadoria personalizada para usuários com inatividade prolongada.', 'long_inactive', 'email', 21, 14, 2, 40, '{"recommendation_limit": 3}'::JSONB)
ON CONFLICT DO NOTHING;
