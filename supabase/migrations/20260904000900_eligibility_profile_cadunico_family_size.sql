-- User-reported people registered under the same CadUnico family code.
-- It is distinct from household_size and intentionally has no historical backfill.
ALTER TABLE public.eligibility_profiles
  ADD COLUMN IF NOT EXISTS cadunico_family_size smallint;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.eligibility_profiles'::regclass AND conname = 'eligibility_profiles_cadunico_family_size_check') THEN
    ALTER TABLE public.eligibility_profiles
      ADD CONSTRAINT eligibility_profiles_cadunico_family_size_check
      CHECK (cadunico_family_size IS NULL OR cadunico_family_size BETWEEN 1 AND 50);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.benefit_eligibility_criteria'::regclass AND conname = 'benefit_eligibility_criteria_criterion_key_check') THEN
    ALTER TABLE public.benefit_eligibility_criteria DROP CONSTRAINT benefit_eligibility_criteria_criterion_key_check;
  END IF;
  ALTER TABLE public.benefit_eligibility_criteria
    ADD CONSTRAINT benefit_eligibility_criteria_criterion_key_check
    CHECK (criterion_key IN (
      'age', 'state_code', 'municipality_ibge_code',
      'household_monthly_income', 'per_capita_income', 'household_size',
      'cadunico_family_size', 'cadunico_status', 'student_status',
      'education_network', 'employment_status', 'disability', 'pregnant',
      'guardian_of_minor', 'artisan', 'artisanal_fisher', 'rural_worker'
    ));
END $$;

NOTIFY pgrst, 'reload schema';
