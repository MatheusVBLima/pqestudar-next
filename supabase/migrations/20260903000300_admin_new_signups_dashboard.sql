CREATE OR REPLACE FUNCTION public.admin_new_signups_dashboard(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL,
  bucket_size TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  normalized_bucket TEXT := CASE WHEN bucket_size = 'hour' THEN 'hour' ELSE 'day' END;
  range_start TIMESTAMPTZ;
  range_end TIMESTAMPTZ := COALESCE(end_at, now());
  result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(start_at, MIN(users.created_at), range_end)
  INTO range_start
  FROM auth.users AS users
  WHERE end_at IS NULL OR users.created_at < end_at;

  WITH signups AS (
    SELECT date_trunc(normalized_bucket, users.created_at) AS bucket_at
    FROM auth.users AS users
    WHERE users.created_at >= range_start
      AND users.created_at < range_end
  ), buckets AS (
    SELECT generate_series(
      date_trunc(normalized_bucket, range_start),
      date_trunc(normalized_bucket, range_end - INTERVAL '1 microsecond'),
      CASE WHEN normalized_bucket = 'hour' THEN INTERVAL '1 hour' ELSE INTERVAL '1 day' END
    ) AS bucket_at
  ), series AS (
    SELECT b.bucket_at, COUNT(s.bucket_at)::BIGINT AS signups
    FROM buckets b
    LEFT JOIN signups s ON s.bucket_at = b.bucket_at
    GROUP BY b.bucket_at
    ORDER BY b.bucket_at
  )
  SELECT jsonb_build_object(
    'count', (SELECT COUNT(*) FROM signups),
    'series', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('bucket_at', bucket_at, 'signups', signups) ORDER BY bucket_at)
      FROM series
    ), '[]'::JSONB)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_new_signups_dashboard(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_new_signups_dashboard(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_new_signups_dashboard(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
