-- Sprint 1 / Block 4 B1: eligibility routes and mandatory external checks.
-- No real benefit rules are seeded by this migration.

ALTER TABLE public.benefit_eligibility_criteria
  ADD COLUMN IF NOT EXISTS route_key text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS applies_to_routes text[];

ALTER TABLE public.benefit_eligibility_criteria
  DROP CONSTRAINT IF EXISTS benefit_eligibility_criteria_route_key_check,
  ADD CONSTRAINT benefit_eligibility_criteria_route_key_check
    CHECK (route_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  DROP CONSTRAINT IF EXISTS benefit_eligibility_criteria_common_scope_check,
  ADD CONSTRAINT benefit_eligibility_criteria_common_scope_check
    CHECK (
      (route_key = 'common' AND (applies_to_routes IS NULL OR cardinality(applies_to_routes) > 0))
      OR (route_key <> 'common' AND applies_to_routes IS NULL)
    );

CREATE TABLE IF NOT EXISTS public.benefit_eligibility_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.premium_items(id) ON DELETE CASCADE,
  route_key text NOT NULL DEFAULT 'default'
    CHECK (route_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  applies_to_routes text[],
  verification_key text NOT NULL
    CHECK (verification_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  source_url text NOT NULL,
  verified_at date NOT NULL,
  effective_from date,
  effective_to date,
  reference_period text,
  rule_version integer NOT NULL DEFAULT 1 CHECK (rule_version > 0),
  supersedes_id uuid REFERENCES public.benefit_eligibility_verifications(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  CHECK (
    (route_key = 'common' AND (applies_to_routes IS NULL OR cardinality(applies_to_routes) > 0))
    OR (route_key <> 'common' AND applies_to_routes IS NULL)
  ),
  UNIQUE (benefit_id, verification_key, route_key, rule_version)
);

CREATE INDEX IF NOT EXISTS benefit_eligibility_criteria_route_idx
  ON public.benefit_eligibility_criteria (benefit_id, route_key, is_active);
CREATE INDEX IF NOT EXISTS benefit_eligibility_verifications_current_idx
  ON public.benefit_eligibility_verifications
  (benefit_id, route_key, is_active, effective_from, effective_to);

ALTER TABLE public.benefit_eligibility_verifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.benefit_eligibility_verifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.benefit_eligibility_verifications TO authenticated;

DROP POLICY IF EXISTS "benefit_eligibility_verifications_premium_read" ON public.benefit_eligibility_verifications;
CREATE POLICY "benefit_eligibility_verifications_premium_read"
  ON public.benefit_eligibility_verifications FOR SELECT TO authenticated
  USING (
    public.has_active_subscription()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

DROP POLICY IF EXISTS "benefit_eligibility_verifications_editor_manage" ON public.benefit_eligibility_verifications;
CREATE POLICY "benefit_eligibility_verifications_editor_manage"
  ON public.benefit_eligibility_verifications FOR ALL TO authenticated
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

NOTIFY pgrst, 'reload schema';
