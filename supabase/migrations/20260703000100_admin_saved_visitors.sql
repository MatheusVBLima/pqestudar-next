CREATE OR REPLACE FUNCTION public.admin_overview_top_pages_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (
  path TEXT,
  visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pv.path,
    COUNT(DISTINCT pv.session_id) AS visitors
  FROM public.page_views AS pv
  WHERE public.is_admin()
    AND pv.actor_type = 'public'
    AND (start_at IS NULL OR pv.created_at >= start_at)
    AND (end_at IS NULL OR pv.created_at < end_at)
  GROUP BY pv.path
  ORDER BY visitors DESC, pv.path ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 1000);
$$;

REVOKE ALL ON FUNCTION public.admin_overview_top_pages_public(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_overview_top_pages_public(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.admin_overview_top_pages_public(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) IS
  'Returns page rankings from public visitors only; administrator page views are excluded.';

CREATE OR REPLACE FUNCTION public.admin_overview_saved_visitors(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  unique_users BIGINT,
  visitors BIGINT,
  views BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT pv.user_id) FILTER (WHERE pv.user_id IS NOT NULL) AS unique_users,
    COUNT(DISTINCT pv.session_id) AS visitors,
    COUNT(*) AS views
  FROM public.page_views AS pv
  WHERE public.is_admin()
    AND pv.actor_type = 'public'
    AND pv.path IN ('/salvos', '/ferramentas/salvos')
    AND (start_at IS NULL OR pv.created_at >= start_at)
    AND (end_at IS NULL OR pv.created_at < end_at);
$$;

REVOKE ALL ON FUNCTION public.admin_overview_saved_visitors(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_overview_saved_visitors(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.admin_overview_saved_visitors(TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Returns authenticated users, sessions and page views for the saved-items page in the selected period.';
