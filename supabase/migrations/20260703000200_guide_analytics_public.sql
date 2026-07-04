-- Guide analytics rebuilt against the events currently emitted by GuiaDetalheNext.
-- Every function excludes administrator traffic and accepts public/anonymous events.

CREATE OR REPLACE FUNCTION public.analytics_guides_overview_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH guide_views AS (
    SELECT
      pv.session_id,
      split_part(split_part(pv.path, '?', 1), '/', 3) AS guide_slug
    FROM public.page_views AS pv
    WHERE public.is_admin()
      AND pv.actor_type = 'public'
      AND pv.path LIKE '/guias/%'
      AND NULLIF(split_part(split_part(pv.path, '?', 1), '/', 3), '') IS NOT NULL
      AND (start_at IS NULL OR pv.created_at >= start_at)
      AND (end_at IS NULL OR pv.created_at < end_at)
  ), events AS (
    SELECT ae.*
    FROM public.analytics_events AS ae
    WHERE public.is_admin()
      AND ae.actor_type IN ('public', 'anonymous')
      AND ae.event_name IN ('guide_read_heartbeat', 'guide_scroll_depth', 'guide_cta_click')
      AND (start_at IS NULL OR ae.created_at >= start_at)
      AND (end_at IS NULL OR ae.created_at < end_at)
  ), session_read AS (
    SELECT session_id,
      SUM(COALESCE((meta->>'read_seconds_increment')::NUMERIC, 0)) AS read_seconds
    FROM events
    WHERE event_name = 'guide_read_heartbeat'
    GROUP BY session_id
  ), session_scroll AS (
    SELECT session_id,
      MAX(COALESCE((meta->>'scroll_depth')::NUMERIC, 0)) AS max_scroll
    FROM events
    WHERE event_name = 'guide_scroll_depth'
    GROUP BY session_id
  ), view_totals AS (
    SELECT
      COUNT(*) AS total_views,
      COUNT(DISTINCT guide_slug) AS unique_guides
    FROM guide_views
  ), event_totals AS (
    SELECT COUNT(*) FILTER (WHERE event_name = 'guide_cta_click') AS cta_clicks
    FROM events
  )
  SELECT jsonb_build_object(
    'total_views', view_totals.total_views,
    'unique_guides', view_totals.unique_guides,
    'avg_read_seconds', COALESCE((SELECT ROUND(AVG(read_seconds), 1) FROM session_read), 0),
    'avg_completion_pct', COALESCE((
      SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE max_scroll >= 75) / NULLIF(COUNT(*), 0), 1)
      FROM session_scroll
    ), 0),
    'cta_clicks', event_totals.cta_clicks,
    'cta_ctr', COALESCE(ROUND(100.0 * event_totals.cta_clicks / NULLIF(view_totals.total_views, 0), 2), 0)
  )
  FROM view_totals CROSS JOIN event_totals;
$$;

CREATE OR REPLACE FUNCTION public.analytics_guides_ranking_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  entity_id TEXT,
  guide_label TEXT,
  slug TEXT,
  views BIGINT,
  opens BIGINT,
  cta_clicks BIGINT,
  internal_link_clicks BIGINT,
  avg_read_seconds NUMERIC,
  avg_max_scroll NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH view_totals AS (
    SELECT
      split_part(split_part(pv.path, '?', 1), '/', 3) AS entity_id,
      COUNT(*) AS views,
      COUNT(DISTINCT pv.session_id) AS opens
    FROM public.page_views AS pv
    WHERE public.is_admin()
      AND pv.actor_type = 'public'
      AND pv.path LIKE '/guias/%'
      AND NULLIF(split_part(split_part(pv.path, '?', 1), '/', 3), '') IS NOT NULL
      AND (start_at IS NULL OR pv.created_at >= start_at)
      AND (end_at IS NULL OR pv.created_at < end_at)
    GROUP BY 1
  ), events AS (
    SELECT
      ae.event_name,
      ae.session_id,
      ae.meta,
      COALESCE(
        NULLIF(ae.meta->>'guide_slug', ''),
        g.slug,
        CASE
          WHEN ae.path ~ '^/guias/[^/?#]+' THEN split_part(split_part(ae.path, '?', 1), '/', 3)
        END,
        NULLIF(ae.entity_id, '')
      ) AS entity_id
    FROM public.analytics_events AS ae
    LEFT JOIN public.guides AS g ON g.id::TEXT = ae.entity_id
    WHERE public.is_admin()
      AND ae.event_name IN (
        'guide_detail_open',
        'guide_read_heartbeat',
        'guide_scroll_depth',
        'guide_cta_click',
        'guide_internal_link_click'
      )
      AND ae.actor_type IN ('public', 'anonymous')
      AND (start_at IS NULL OR ae.created_at >= start_at)
      AND (end_at IS NULL OR ae.created_at < end_at)
  ), resolved_events AS (
    SELECT * FROM events WHERE entity_id IS NOT NULL
  ), event_totals AS (
    SELECT
      entity_id,
      COUNT(*) FILTER (WHERE event_name = 'guide_detail_open') AS opens,
      COUNT(*) FILTER (WHERE event_name = 'guide_cta_click') AS cta_clicks,
      COUNT(*) FILTER (WHERE event_name = 'guide_internal_link_click') AS internal_link_clicks
    FROM resolved_events
    GROUP BY entity_id
  ), guide_keys AS (
    SELECT entity_id FROM view_totals
    UNION
    SELECT entity_id FROM event_totals
  ), session_read AS (
    SELECT entity_id, session_id,
      SUM(COALESCE((meta->>'read_seconds_increment')::NUMERIC, 0)) AS read_seconds
    FROM resolved_events
    WHERE event_name = 'guide_read_heartbeat'
    GROUP BY entity_id, session_id
  ), read_stats AS (
    SELECT entity_id, ROUND(AVG(read_seconds), 1) AS avg_read_seconds
    FROM session_read
    GROUP BY entity_id
  ), session_scroll AS (
    SELECT entity_id, session_id,
      MAX(COALESCE((meta->>'scroll_depth')::NUMERIC, 0)) AS max_scroll
    FROM resolved_events
    WHERE event_name = 'guide_scroll_depth'
    GROUP BY entity_id, session_id
  ), scroll_stats AS (
    SELECT entity_id, ROUND(AVG(max_scroll), 1) AS avg_max_scroll
    FROM session_scroll
    GROUP BY entity_id
  )
  SELECT
    keys.entity_id,
    COALESCE(g.title, keys.entity_id) AS guide_label,
    COALESCE(g.slug, keys.entity_id) AS slug,
    COALESCE(vt.views, 0) AS views,
    COALESCE(vt.opens, 0) AS opens,
    COALESCE(et.cta_clicks, 0) AS cta_clicks,
    COALESCE(et.internal_link_clicks, 0) AS internal_link_clicks,
    COALESCE(rs.avg_read_seconds, 0),
    COALESCE(ss.avg_max_scroll, 0)
  FROM guide_keys AS keys
  LEFT JOIN public.guides AS g ON g.slug = keys.entity_id OR g.id::TEXT = keys.entity_id
  LEFT JOIN view_totals AS vt ON vt.entity_id = keys.entity_id
  LEFT JOIN event_totals AS et ON et.entity_id = keys.entity_id
  LEFT JOIN read_stats AS rs ON rs.entity_id = keys.entity_id
  LEFT JOIN scroll_stats AS ss ON ss.entity_id = keys.entity_id
  ORDER BY COALESCE(vt.views, 0) DESC, guide_label ASC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_guide_avg_read_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  entity_id TEXT,
  guide_label TEXT,
  avg_read_seconds NUMERIC,
  total_sessions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH events AS (
    SELECT
      COALESCE(
        NULLIF(ae.entity_id, ''),
        NULLIF(ae.meta->>'guide_slug', ''),
        CASE
          WHEN ae.path ~ '^/guias/[^/?#]+' THEN split_part(split_part(ae.path, '?', 1), '/', 3)
        END
      ) AS entity_id,
      ae.session_id,
      ae.meta
    FROM public.analytics_events AS ae
    WHERE public.is_admin()
      AND ae.event_name = 'guide_read_heartbeat'
      AND ae.actor_type IN ('public', 'anonymous')
      AND (start_at IS NULL OR ae.created_at >= start_at)
      AND (end_at IS NULL OR ae.created_at < end_at)
  ), session_read AS (
    SELECT entity_id, session_id,
      SUM(COALESCE((meta->>'read_seconds_increment')::NUMERIC, 0)) AS read_seconds
    FROM events
    WHERE entity_id IS NOT NULL
    GROUP BY entity_id, session_id
  )
  SELECT
    sr.entity_id,
    COALESCE(g.title, sr.entity_id::TEXT) AS guide_label,
    ROUND(AVG(sr.read_seconds), 1) AS avg_read_seconds,
    COUNT(*) AS total_sessions
  FROM session_read AS sr
  LEFT JOIN public.guides AS g ON g.id::TEXT = sr.entity_id OR g.slug = sr.entity_id
  GROUP BY sr.entity_id, g.title
  ORDER BY avg_read_seconds DESC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_guide_scroll_stats_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  entity_id TEXT,
  guide_label TEXT,
  avg_max_scroll NUMERIC,
  completion_rate NUMERIC,
  total_sessions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH events AS (
    SELECT
      COALESCE(
        NULLIF(ae.entity_id, ''),
        NULLIF(ae.meta->>'guide_slug', ''),
        CASE
          WHEN ae.path ~ '^/guias/[^/?#]+' THEN split_part(split_part(ae.path, '?', 1), '/', 3)
        END
      ) AS entity_id,
      ae.session_id,
      ae.meta
    FROM public.analytics_events AS ae
    WHERE public.is_admin()
      AND ae.event_name = 'guide_scroll_depth'
      AND ae.actor_type IN ('public', 'anonymous')
      AND (start_at IS NULL OR ae.created_at >= start_at)
      AND (end_at IS NULL OR ae.created_at < end_at)
  ), session_scroll AS (
    SELECT entity_id, session_id,
      MAX(COALESCE((meta->>'scroll_depth')::NUMERIC, 0)) AS max_scroll
    FROM events
    WHERE entity_id IS NOT NULL
    GROUP BY entity_id, session_id
  )
  SELECT
    ss.entity_id,
    COALESCE(g.title, ss.entity_id::TEXT) AS guide_label,
    ROUND(AVG(ss.max_scroll), 1) AS avg_max_scroll,
    ROUND(100.0 * COUNT(*) FILTER (WHERE ss.max_scroll >= 75) / NULLIF(COUNT(*), 0), 1) AS completion_rate,
    COUNT(*) AS total_sessions
  FROM session_scroll AS ss
  LEFT JOIN public.guides AS g ON g.id::TEXT = ss.entity_id OR g.slug = ss.entity_id
  GROUP BY ss.entity_id, g.title
  ORDER BY avg_max_scroll DESC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_guide_sources_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (source TEXT, visitors BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sessions AS (
    SELECT
      pv.session_id,
      COALESCE(
        NULLIF(MAX(pv.meta->>'referrer_host'), ''),
        'Direto'
      ) AS raw_source
    FROM public.page_views AS pv
    WHERE public.is_admin()
      AND pv.actor_type = 'public'
      AND pv.path LIKE '/guias/%'
      AND NULLIF(split_part(split_part(pv.path, '?', 1), '/', 3), '') IS NOT NULL
      AND (start_at IS NULL OR pv.created_at >= start_at)
      AND (end_at IS NULL OR pv.created_at < end_at)
    GROUP BY pv.session_id
  ), normalized AS (
    SELECT CASE
      WHEN raw_source IN ('l.instagram.com', 'lm.instagram.com', 'instagram.com', 'www.instagram.com') THEN 'Instagram'
      WHEN raw_source IN ('l.facebook.com', 'lm.facebook.com', 'm.facebook.com', 'facebook.com', 'www.facebook.com') THEN 'Facebook'
      WHEN raw_source = 'google.com' OR raw_source LIKE 'google.%' OR raw_source LIKE '%.google.%' THEN 'Google'
      ELSE raw_source
    END AS source
    FROM sessions
  )
  SELECT n.source, COUNT(*) AS visitors
  FROM normalized AS n
  GROUP BY n.source
  ORDER BY visitors DESC, n.source ASC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_guide_top_ctas_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  cta_label TEXT,
  cta_position TEXT,
  guide_label TEXT,
  cta_url TEXT,
  clicks BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(ae.meta->>'cta_label', ''), 'CTA') AS cta_label,
    COALESCE(NULLIF(ae.meta->>'cta_position', ''), 'desconhecida') AS cta_position,
    COALESCE(g.title, ae.entity_id::TEXT) AS guide_label,
    COALESCE(ae.meta->>'cta_url', '') AS cta_url,
    COUNT(*) AS clicks
  FROM public.analytics_events AS ae
  LEFT JOIN public.guides AS g ON g.id::TEXT = ae.entity_id
    OR g.slug = ae.meta->>'guide_slug'
    OR ae.path = '/guias/' || g.slug
  WHERE public.is_admin()
    AND ae.event_name = 'guide_cta_click'
    AND ae.actor_type IN ('public', 'anonymous')
    AND (start_at IS NULL OR ae.created_at >= start_at)
    AND (end_at IS NULL OR ae.created_at < end_at)
  GROUP BY 1, 2, 3, 4
  ORDER BY clicks DESC, guide_label ASC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_guide_top_internal_links_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  link_label TEXT,
  guide_label TEXT,
  link_url TEXT,
  clicks BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(ae.meta->>'link_label', ''), 'Link') AS link_label,
    COALESCE(g.title, ae.entity_id::TEXT) AS guide_label,
    COALESCE(ae.meta->>'link_url', '') AS link_url,
    COUNT(*) AS clicks
  FROM public.analytics_events AS ae
  LEFT JOIN public.guides AS g ON g.id::TEXT = ae.entity_id
    OR g.slug = ae.meta->>'guide_slug'
    OR ae.path = '/guias/' || g.slug
  WHERE public.is_admin()
    AND ae.event_name = 'guide_internal_link_click'
    AND ae.actor_type IN ('public', 'anonymous')
    AND (start_at IS NULL OR ae.created_at >= start_at)
    AND (end_at IS NULL OR ae.created_at < end_at)
  GROUP BY 1, 2, 3
  ORDER BY clicks DESC, guide_label ASC;
$$;

REVOKE ALL ON FUNCTION public.analytics_guides_overview_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_guides_ranking_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_guide_avg_read_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_guide_scroll_stats_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_guide_sources_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_guide_top_ctas_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analytics_guide_top_internal_links_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.analytics_guides_overview_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_guides_ranking_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_guide_avg_read_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_guide_scroll_stats_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_guide_sources_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_guide_top_ctas_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_guide_top_internal_links_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
