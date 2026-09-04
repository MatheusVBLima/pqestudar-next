-- The progressive form asks for age, not a date of birth. Store the reported
-- value without inventing a birth date, together with its reference date.
ALTER TABLE public.eligibility_profiles
  ADD COLUMN IF NOT EXISTS age_years smallint
    CHECK (age_years IS NULL OR age_years BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS age_recorded_at date;

NOTIFY pgrst, 'reload schema';
