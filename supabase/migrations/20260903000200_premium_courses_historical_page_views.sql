-- Backfill-compatible premium course analytics. Generic page_views are the
-- canonical source for catalog/detail opens, preserving history from before
-- the richer interaction events were introduced without double counting.
CREATE OR REPLACE FUNCTION public.analytics_premium_courses_dashboard(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH courses AS (
    SELECT pi.id, pi.title, pi.slug, pi.status
    FROM public.premium_items pi
    WHERE public.is_admin()
      AND pi.item_type = 'course'
      AND NOT COALESCE('__benefit' = ANY(pi.tags), false)
  ), page_history AS (
    SELECT
      split_part(pv.path, '?', 1) AS path,
      pv.created_at,
      pv.session_id,
      pv.user_id
    FROM public.page_views pv
    WHERE public.is_admin()
      AND pv.actor_type = 'public'
      AND split_part(pv.path, '?', 1) LIKE '/premium/cursos%'
      AND (start_at IS NULL OR pv.created_at >= start_at)
      AND (end_at IS NULL OR pv.created_at < end_at)
  ), catalog_views AS (
    SELECT * FROM page_history WHERE path = '/premium/cursos'
  ), detail_views AS (
    SELECT ph.*, c.id AS course_id
    FROM page_history ph
    JOIN courses c ON ph.path = '/premium/cursos/' || c.slug
  ), events AS (
    SELECT ae.*
    FROM public.analytics_events ae
    WHERE public.is_admin()
      AND ae.actor_type IN ('public', 'anonymous')
      AND ae.event_name IN (
        'premium_course_search',
        'premium_course_filter',
        'premium_course_card_open',
        'premium_course_read_heartbeat',
        'premium_course_scroll_depth',
        'premium_course_external_click',
        'premium_course_save_click'
      )
      AND (start_at IS NULL OR ae.created_at >= start_at)
      AND (end_at IS NULL OR ae.created_at < end_at)
  ), detail_activity AS (
    SELECT
      course_id,
      COUNT(*) AS detail_opens,
      COUNT(DISTINCT session_id) AS visitors
    FROM detail_views
    GROUP BY course_id
  ), event_activity AS (
    SELECT
      entity_id,
      COUNT(*) FILTER (WHERE event_name = 'premium_course_card_open') AS card_opens,
      COUNT(*) FILTER (WHERE event_name = 'premium_course_external_click') AS external_clicks,
      COUNT(*) FILTER (
        WHERE event_name = 'premium_course_save_click' AND meta->>'action' = 'save'
      ) AS save_clicks
    FROM events
    WHERE entity_id IS NOT NULL
    GROUP BY entity_id
  ), course_activity AS (
    SELECT
      c.id,
      COALESCE(ea.card_opens, 0) AS card_opens,
      COALESCE(da.detail_opens, 0) AS detail_opens,
      COALESCE(da.visitors, 0) AS visitors,
      COALESCE(ea.external_clicks, 0) AS external_clicks,
      COALESCE(ea.save_clicks, 0) AS save_clicks
    FROM courses c
    LEFT JOIN detail_activity da ON da.course_id = c.id
    LEFT JOIN event_activity ea ON ea.entity_id = c.id::TEXT
  ), session_read AS (
    SELECT entity_id, session_id,
      SUM(COALESCE((meta->>'read_seconds_increment')::NUMERIC, 0)) AS seconds
    FROM events
    WHERE event_name = 'premium_course_read_heartbeat'
    GROUP BY entity_id, session_id
  ), read_stats AS (
    SELECT entity_id, ROUND(AVG(seconds), 1) AS avg_read_seconds
    FROM session_read
    GROUP BY entity_id
  ), session_scroll AS (
    SELECT entity_id, session_id,
      MAX(COALESCE((meta->>'scroll_depth')::NUMERIC, 0)) AS max_scroll
    FROM events
    WHERE event_name = 'premium_course_scroll_depth'
    GROUP BY entity_id, session_id
  ), scroll_stats AS (
    SELECT entity_id, ROUND(AVG(max_scroll), 1) AS avg_max_scroll
    FROM session_scroll
    GROUP BY entity_id
  ), first_activity AS (
    SELECT LEAST(
      COALESCE((SELECT MIN(created_at) FROM page_history), now()),
      COALESCE((SELECT MIN(created_at) FROM events), now())
    ) AS created_at
  ), days AS (
    SELECT day::DATE
    FROM generate_series(
      COALESCE(start_at, (SELECT created_at FROM first_activity)),
      COALESCE(end_at, now()),
      INTERVAL '1 day'
    ) day
  ), catalog_daily AS (
    SELECT created_at::DATE AS day, COUNT(*) AS catalog_views
    FROM catalog_views
    GROUP BY 1
  ), details_daily AS (
    SELECT created_at::DATE AS day, COUNT(*) AS detail_opens
    FROM detail_views
    GROUP BY 1
  ), events_daily AS (
    SELECT created_at::DATE AS day,
      COUNT(*) FILTER (WHERE event_name = 'premium_course_external_click') AS external_clicks
    FROM events
    GROUP BY 1
  ), timeline AS (
    SELECT
      to_char(d.day, 'DD/MM') AS day,
      COALESCE(cv.catalog_views, 0) AS catalog_views,
      COALESCE(dv.detail_opens, 0) AS detail_opens,
      COALESCE(ed.external_clicks, 0) AS external_clicks
    FROM days d
    LEFT JOIN catalog_daily cv ON cv.day = d.day
    LEFT JOIN details_daily dv ON dv.day = d.day
    LEFT JOIN events_daily ed ON ed.day = d.day
    ORDER BY d.day
  )
  SELECT jsonb_build_object(
    'overview', jsonb_build_object(
      'catalog_views', (SELECT COUNT(*) FROM catalog_views),
      'catalog_visitors', (SELECT COUNT(DISTINCT session_id) FROM catalog_views),
      'authenticated_visitors', (SELECT COUNT(DISTINCT user_id) FROM page_history WHERE user_id IS NOT NULL),
      'searches', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_course_search'),
      'filter_uses', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_course_filter'),
      'detail_opens', (SELECT COUNT(*) FROM detail_views),
      'external_clicks', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_course_external_click'),
      'avg_read_seconds', COALESCE((SELECT ROUND(AVG(seconds), 1) FROM session_read), 0),
      'history_start', (SELECT MIN(created_at) FROM page_history)
    ),
    'timeline', COALESCE((SELECT jsonb_agg(to_jsonb(timeline)) FROM timeline), '[]'::JSONB),
    'courses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'course_id', c.id,
        'title', c.title,
        'slug', c.slug,
        'status', c.status,
        'card_opens', ca.card_opens,
        'detail_opens', ca.detail_opens,
        'visitors', ca.visitors,
        'external_clicks', ca.external_clicks,
        'save_clicks', ca.save_clicks,
        'avg_read_seconds', COALESCE(rs.avg_read_seconds, 0),
        'avg_max_scroll', COALESCE(ss.avg_max_scroll, 0)
      ) ORDER BY ca.detail_opens DESC, c.title)
      FROM courses c
      JOIN course_activity ca ON ca.id = c.id
      LEFT JOIN read_stats rs ON rs.entity_id = c.id::TEXT
      LEFT JOIN scroll_stats ss ON ss.entity_id = c.id::TEXT
    ), '[]'::JSONB)
  );
$$;

REVOKE ALL ON FUNCTION public.analytics_premium_courses_dashboard(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_premium_courses_dashboard(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';
