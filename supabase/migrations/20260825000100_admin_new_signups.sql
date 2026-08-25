CREATE OR REPLACE FUNCTION public.admin_new_signups(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN public.is_admin() THEN (
      SELECT COUNT(*)
      FROM auth.users AS users
      WHERE (start_at IS NULL OR users.created_at >= start_at)
        AND (end_at IS NULL OR users.created_at < end_at)
    )
    ELSE 0::BIGINT
  END;
$$;

REVOKE ALL ON FUNCTION public.admin_new_signups(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_new_signups(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_new_signups(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.admin_new_signups(TIMESTAMPTZ, TIMESTAMPTZ)
  IS 'Counts new authenticated site accounts in a period for administrators only.';
