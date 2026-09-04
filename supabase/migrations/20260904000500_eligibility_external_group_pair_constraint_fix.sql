-- Block 4 / Part B1.1 corrective migration.
-- PostgreSQL CHECK constraints accept UNKNOWN, so the previous expression
-- allowed group_key to be set while group_operator remained NULL. Require both
-- values explicitly in the grouped branch.

ALTER TABLE public.benefit_eligibility_verifications
  DROP CONSTRAINT IF EXISTS benefit_eligibility_verifications_group_pair_check,
  ADD CONSTRAINT benefit_eligibility_verifications_group_pair_check
    CHECK (
      (group_key IS NULL AND group_operator IS NULL)
      OR (
        group_key IS NOT NULL
        AND group_operator IS NOT NULL
        AND group_key ~ '^[a-z0-9][a-z0-9_-]*$'
        AND group_operator IN ('and', 'or')
      )
    );

NOTIFY pgrst, 'reload schema';
