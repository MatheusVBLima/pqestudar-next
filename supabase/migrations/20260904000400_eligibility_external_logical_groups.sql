-- Block 4 / Part B1.1: allow external requirements to participate in route
-- logical groups. Existing rows keep both columns NULL and preserve the legacy
-- mandatory-verification behavior.

ALTER TABLE public.benefit_eligibility_verifications
  ADD COLUMN IF NOT EXISTS group_key text,
  ADD COLUMN IF NOT EXISTS group_operator text;

ALTER TABLE public.benefit_eligibility_verifications
  DROP CONSTRAINT IF EXISTS benefit_eligibility_verifications_group_pair_check,
  ADD CONSTRAINT benefit_eligibility_verifications_group_pair_check
    CHECK (
      (group_key IS NULL AND group_operator IS NULL)
      OR (
        group_key IS NOT NULL
        AND group_key ~ '^[a-z0-9][a-z0-9_-]*$'
        AND group_operator IN ('and', 'or')
      )
    );

CREATE INDEX IF NOT EXISTS benefit_eligibility_verifications_group_idx
  ON public.benefit_eligibility_verifications
  (benefit_id, route_key, group_key, is_active);

NOTIFY pgrst, 'reload schema';
