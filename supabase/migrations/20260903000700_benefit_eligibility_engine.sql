-- Sprint 1 / Block 1: profile storage and versioned deterministic eligibility rules.
-- Profiles describe a subject managed by the owner; they are not necessarily
-- profiles of the authenticated user.

CREATE TABLE IF NOT EXISTS public.eligibility_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Perfil principal' CHECK (char_length(label) BETWEEN 1 AND 80),
  birth_date date,
  state_code text CHECK (state_code IS NULL OR state_code ~ '^[A-Z]{2}$'),
  municipality_name text,
  municipality_ibge_code text,
  household_monthly_income numeric(12, 2) CHECK (household_monthly_income IS NULL OR household_monthly_income >= 0),
  household_size smallint CHECK (household_size IS NULL OR household_size BETWEEN 1 AND 50),
  cadunico_status text CHECK (cadunico_status IS NULL OR cadunico_status IN ('yes', 'no', 'unknown')),
  student_status text CHECK (student_status IS NULL OR student_status IN ('not_student', 'basic_education', 'technical', 'higher_education', 'free_course')),
  education_network text CHECK (education_network IS NULL OR education_network IN ('public', 'private', 'mixed', 'not_applicable')),
  employment_status text CHECK (employment_status IS NULL OR employment_status IN ('unemployed', 'formal_worker', 'informal_worker', 'self_employed', 'public_servant', 'retired_or_pensioner', 'not_working')),
  conditions text[] CHECK (
    conditions IS NULL OR conditions <@ ARRAY[
      'disability', 'pregnant', 'guardian_of_minor', 'artisan',
      'artisanal_fisher', 'rural_worker'
    ]::text[]
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eligibility_profile_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_profile_id uuid REFERENCES public.eligibility_profiles(id) ON DELETE SET NULL,
  profile_filter_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.benefit_eligibility_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.premium_items(id) ON DELETE CASCADE,
  rule_key text NOT NULL CHECK (rule_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  criterion_key text NOT NULL CHECK (criterion_key IN (
    'age', 'state_code', 'municipality_ibge_code',
    'household_monthly_income', 'per_capita_income', 'household_size',
    'cadunico_status', 'student_status', 'education_network',
    'employment_status', 'disability', 'pregnant', 'guardian_of_minor',
    'artisan', 'artisanal_fisher', 'rural_worker'
  )),
  operator text NOT NULL CHECK (operator IN (
    'equals', 'not_equals', 'greater_than', 'greater_than_or_equal',
    'less_than', 'less_than_or_equal', 'includes', 'one_of', 'is_true'
  )),
  expected_value jsonb NOT NULL DEFAULT 'null'::jsonb,
  group_key text NOT NULL DEFAULT 'default',
  group_operator text NOT NULL DEFAULT 'and' CHECK (group_operator IN ('and', 'or')),
  importance text NOT NULL DEFAULT 'required' CHECK (importance IN ('required', 'supporting', 'informational')),
  match_message text NOT NULL,
  unknown_message text NOT NULL,
  mismatch_message text NOT NULL,
  source_url text NOT NULL,
  verified_at date NOT NULL,
  effective_from date,
  effective_to date,
  reference_period text,
  rule_version integer NOT NULL DEFAULT 1 CHECK (rule_version > 0),
  supersedes_id uuid REFERENCES public.benefit_eligibility_criteria(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  UNIQUE (benefit_id, rule_key, rule_version)
);

CREATE INDEX IF NOT EXISTS eligibility_profiles_owner_idx
  ON public.eligibility_profiles (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS benefit_eligibility_criteria_current_idx
  ON public.benefit_eligibility_criteria (benefit_id, is_active, effective_from, effective_to);

ALTER TABLE public.eligibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_profile_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_eligibility_criteria ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eligibility_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eligibility_profile_preferences TO authenticated;
GRANT SELECT ON public.benefit_eligibility_criteria TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.benefit_eligibility_criteria TO authenticated;

DROP POLICY IF EXISTS "eligibility_profiles_owner_read" ON public.eligibility_profiles;
CREATE POLICY "eligibility_profiles_owner_read"
  ON public.eligibility_profiles FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "eligibility_profiles_owner_insert" ON public.eligibility_profiles;
CREATE POLICY "eligibility_profiles_owner_insert"
  ON public.eligibility_profiles FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "eligibility_profiles_owner_update" ON public.eligibility_profiles;
CREATE POLICY "eligibility_profiles_owner_update"
  ON public.eligibility_profiles FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "eligibility_profiles_owner_delete" ON public.eligibility_profiles;
CREATE POLICY "eligibility_profiles_owner_delete"
  ON public.eligibility_profiles FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "eligibility_profile_preferences_owner_manage" ON public.eligibility_profile_preferences;
CREATE POLICY "eligibility_profile_preferences_owner_manage"
  ON public.eligibility_profile_preferences FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      active_profile_id IS NULL OR EXISTS (
        SELECT 1 FROM public.eligibility_profiles profile
        WHERE profile.id = active_profile_id AND profile.owner_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      active_profile_id IS NULL OR EXISTS (
        SELECT 1 FROM public.eligibility_profiles profile
        WHERE profile.id = active_profile_id AND profile.owner_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "benefit_eligibility_criteria_premium_read" ON public.benefit_eligibility_criteria;
CREATE POLICY "benefit_eligibility_criteria_premium_read"
  ON public.benefit_eligibility_criteria FOR SELECT TO authenticated
  USING (
    public.has_active_subscription()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

DROP POLICY IF EXISTS "benefit_eligibility_criteria_editor_manage" ON public.benefit_eligibility_criteria;
CREATE POLICY "benefit_eligibility_criteria_editor_manage"
  ON public.benefit_eligibility_criteria FOR ALL TO authenticated
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
