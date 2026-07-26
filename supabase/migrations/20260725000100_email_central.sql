CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  email TEXT PRIMARY KEY,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'newsletter',
  subject TEXT NOT NULL,
  preheader TEXT,
  html_body TEXT NOT NULL,
  text_body TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'newsletter',
  status TEXT NOT NULL DEFAULT 'draft',
  subject TEXT NOT NULL,
  preheader TEXT,
  html_body TEXT NOT NULL,
  text_body TEXT,
  audience_filter JSONB NOT NULL DEFAULT '{}'::JSONB,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by UUID,
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID,
  name TEXT,
  contact_source TEXT NOT NULL DEFAULT 'manual',
  recipient_type TEXT NOT NULL DEFAULT 'selected',
  status TEXT NOT NULL DEFAULT 'pending',
  resend_email_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES public.email_campaign_recipients(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_event_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_templates_created_at_idx
  ON public.email_templates (created_at DESC);

CREATE INDEX IF NOT EXISTS email_campaigns_created_at_idx
  ON public.email_campaigns (created_at DESC);

CREATE INDEX IF NOT EXISTS email_campaign_recipients_campaign_id_idx
  ON public.email_campaign_recipients (campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS email_campaign_recipients_email_idx
  ON public.email_campaign_recipients (LOWER(email));

CREATE INDEX IF NOT EXISTS email_events_campaign_id_idx
  ON public.email_events (campaign_id, created_at DESC);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email unsubscribes" ON public.email_unsubscribes;
CREATE POLICY "Admins manage email unsubscribes"
  ON public.email_unsubscribes
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage email templates" ON public.email_templates;
CREATE POLICY "Admins manage email templates"
  ON public.email_templates
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage email campaigns" ON public.email_campaigns;
CREATE POLICY "Admins manage email campaigns"
  ON public.email_campaigns
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage email campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins manage email campaign recipients"
  ON public.email_campaign_recipients
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage email events" ON public.email_events;
CREATE POLICY "Admins manage email events"
  ON public.email_events
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.email_templates (
  name,
  description,
  category,
  subject,
  preheader,
  html_body,
  text_body
)
SELECT
  'Newsletter simples',
  'Modelo inicial para curadorias, novidades e avisos do PqEstudar.',
  'newsletter',
  'Novidades úteis do PqEstudar',
  'Uma seleção rápida para estudar melhor e perder menos tempo.',
  '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f1f24;line-height:1.6"><h1 style="font-size:28px;color:#97008f">Novidades úteis do PqEstudar</h1><p>Olá! Separei uma curadoria rápida com conteúdos e ferramentas que podem ajudar na sua rotina de estudos.</p><p><a href="https://www.pqestudar.com.br" style="display:inline-block;background:#d936d0;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">Ver no PqEstudar</a></p><p style="font-size:12px;color:#777">Você está recebendo este e-mail porque se cadastrou no PqEstudar.</p></div>',
  'Novidades úteis do PqEstudar. Veja no site: https://www.pqestudar.com.br'
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE name = 'Newsletter simples'
);
