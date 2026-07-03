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

CREATE OR REPLACE FUNCTION public.admin_overview_sources_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  source TEXT,
  visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH session_sources AS (
    SELECT
      pv.session_id,
      COALESCE(
        (
          ARRAY_AGG(NULLIF(pv.meta->>'referrer_host', '') ORDER BY pv.created_at)
            FILTER (WHERE NULLIF(pv.meta->>'referrer_host', '') IS NOT NULL)
        )[1],
        CASE
          WHEN BOOL_OR(COALESCE(pv.meta ? 'referrer_host', FALSE)) THEN 'Direto'
          ELSE 'Desconhecido'
        END
      ) AS raw_source
    FROM public.page_views AS pv
    WHERE public.is_admin()
      AND pv.actor_type = 'public'
      AND (start_at IS NULL OR pv.created_at >= start_at)
      AND (end_at IS NULL OR pv.created_at < end_at)
    GROUP BY pv.session_id
  ), normalized_sources AS (
    SELECT
      CASE
        WHEN raw_source IN ('l.instagram.com', 'lm.instagram.com', 'instagram.com', 'www.instagram.com') THEN 'Instagram'
        WHEN raw_source IN ('l.facebook.com', 'lm.facebook.com', 'm.facebook.com', 'facebook.com', 'www.facebook.com') THEN 'Facebook'
        WHEN raw_source = 'google.com' OR raw_source LIKE 'google.%' OR raw_source LIKE '%.google.%' THEN 'Google'
        WHEN raw_source IN ('t.co', 'x.com', 'twitter.com') THEN 'X / Twitter'
        WHEN raw_source IN ('youtube.com', 'www.youtube.com', 'm.youtube.com') THEN 'YouTube'
        ELSE raw_source
      END AS source
    FROM session_sources
  )
  SELECT
    ns.source,
    COUNT(*) AS visitors
  FROM normalized_sources AS ns
  GROUP BY ns.source
  ORDER BY visitors DESC, ns.source ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.admin_overview_sources_public(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_overview_sources_public(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.admin_overview_sources_public(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) IS
  'Returns acquisition sources by public visitor, using page_views.meta.referrer_host and excluding administrators.';

CREATE OR REPLACE FUNCTION public.admin_overview_devices_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  device TEXT,
  visitors BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH session_devices AS (
    SELECT
      pv.session_id,
      (
        ARRAY_AGG(NULLIF(pv.meta->>'device', '') ORDER BY pv.created_at)
          FILTER (WHERE NULLIF(pv.meta->>'device', '') IS NOT NULL)
      )[1] AS device
    FROM public.page_views AS pv
    WHERE public.is_admin()
      AND pv.actor_type = 'public'
      AND (start_at IS NULL OR pv.created_at >= start_at)
      AND (end_at IS NULL OR pv.created_at < end_at)
    GROUP BY pv.session_id
  )
  SELECT
    sd.device,
    COUNT(*) AS visitors
  FROM session_devices AS sd
  WHERE sd.device IS NOT NULL
  GROUP BY sd.device
  ORDER BY visitors DESC, sd.device ASC;
$$;

REVOKE ALL ON FUNCTION public.admin_overview_devices_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_overview_devices_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.admin_overview_devices_public(TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Returns known devices by public visitor, using page_views.meta.device and excluding administrators.';

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
