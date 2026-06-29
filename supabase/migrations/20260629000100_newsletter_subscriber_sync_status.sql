-- Keep a recoverable, service-role-only copy of every valid newsletter signup
-- before attempting to synchronize it with Brevo.

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS sync_status TEXT,
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS sync_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS brevo_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS page_slug TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

-- Rows created by the previous implementation have no trustworthy Brevo state.
UPDATE public.newsletter_subscribers
SET sync_status = 'unknown'
WHERE sync_status IS NULL;

ALTER TABLE public.newsletter_subscribers
  ALTER COLUMN sync_status SET DEFAULT 'pending',
  ALTER COLUMN sync_status SET NOT NULL;

ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_sync_status_check;

ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_sync_status_check
  CHECK (sync_status IN ('pending', 'synced', 'failed', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_sync_status
  ON public.newsletter_subscribers (sync_status, last_sync_attempt_at DESC);

-- The deployed function has used both the legacy and current event names.
ALTER TABLE public.newsletter_events
  DROP CONSTRAINT IF EXISTS newsletter_events_event_type_check;

ALTER TABLE public.newsletter_events
  ADD CONSTRAINT newsletter_events_event_type_check
  CHECK (event_type IN (
    'newsletter_submit',
    'newsletter_valid',
    'newsletter_listed',
    'newsletter_subscribed',
    'newsletter_already_subscribed',
    'newsletter_confirmed',
    'newsletter_error',
    'newsletter_resend'
  ));

COMMENT ON COLUMN public.newsletter_subscribers.sync_status IS
  'Brevo synchronization state: pending, synced, failed, or unknown for legacy rows.';

COMMENT ON COLUMN public.newsletter_subscribers.sync_error IS
  'Sanitized last synchronization error; never stores API keys or raw provider responses.';
