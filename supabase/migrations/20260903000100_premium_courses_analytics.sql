-- Analytics for /premium/cursos. premium_items remains the source of truth, so
-- newly created courses automatically appear even before receiving traffic.
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
  WITH events AS (
    SELECT ae.*
    FROM public.analytics_events ae
    WHERE public.is_admin()
      AND ae.actor_type IN ('public', 'anonymous')
      AND ae.event_name IN (
        'premium_courses_catalog_view',
        'premium_course_search',
        'premium_course_filter',
        'premium_course_card_open',
        'premium_course_detail_open',
        'premium_course_read_heartbeat',
        'premium_course_scroll_depth',
        'premium_course_external_click',
        'premium_course_save_click'
      )
      AND (start_at IS NULL OR ae.created_at >= start_at)
      AND (end_at IS NULL OR ae.created_at < end_at)
  ), courses AS (
    SELECT pi.id, pi.title, pi.slug, pi.status
    FROM public.premium_items pi
    WHERE public.is_admin()
      AND pi.item_type = 'course'
      AND NOT COALESCE('__benefit' = ANY(pi.tags), false)
  ), course_events AS (
    SELECT
      c.id,
      COUNT(*) FILTER (WHERE e.event_name = 'premium_course_card_open') AS card_opens,
      COUNT(*) FILTER (WHERE e.event_name = 'premium_course_detail_open') AS detail_opens,
      COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'premium_course_detail_open') AS visitors,
      COUNT(*) FILTER (WHERE e.event_name = 'premium_course_external_click') AS external_clicks,
      COUNT(*) FILTER (WHERE e.event_name = 'premium_course_save_click' AND e.meta->>'action' = 'save') AS save_clicks
    FROM courses c
    LEFT JOIN events e ON e.entity_id = c.id::TEXT
    GROUP BY c.id
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
  ), days AS (
    SELECT day::DATE
    FROM generate_series(
      COALESCE(start_at, COALESCE((SELECT MIN(created_at) FROM events), now())),
      COALESCE(end_at, now()),
      INTERVAL '1 day'
    ) day
  ), events_daily AS (
    SELECT created_at::DATE AS day,
      COUNT(*) FILTER (WHERE event_name = 'premium_courses_catalog_view') AS catalog_views,
      COUNT(*) FILTER (WHERE event_name = 'premium_course_detail_open') AS detail_opens,
      COUNT(*) FILTER (WHERE event_name = 'premium_course_external_click') AS external_clicks
    FROM events
    GROUP BY 1
  ), timeline AS (
    SELECT
      to_char(d.day, 'DD/MM') AS day,
      COALESCE(e.catalog_views, 0) AS catalog_views,
      COALESCE(e.detail_opens, 0) AS detail_opens,
      COALESCE(e.external_clicks, 0) AS external_clicks
    FROM days d
    LEFT JOIN events_daily e ON e.day = d.day
    ORDER BY d.day
  )
  SELECT jsonb_build_object(
    'overview', jsonb_build_object(
      'catalog_views', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_courses_catalog_view'),
      'catalog_visitors', (SELECT COUNT(DISTINCT session_id) FROM events WHERE event_name = 'premium_courses_catalog_view'),
      'searches', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_course_search'),
      'filter_uses', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_course_filter'),
      'detail_opens', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_course_detail_open'),
      'external_clicks', (SELECT COUNT(*) FROM events WHERE event_name = 'premium_course_external_click'),
      'avg_read_seconds', COALESCE((SELECT ROUND(AVG(seconds), 1) FROM session_read), 0)
    ),
    'timeline', COALESCE((SELECT jsonb_agg(to_jsonb(timeline)) FROM timeline), '[]'::JSONB),
    'courses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'course_id', c.id,
        'title', c.title,
        'slug', c.slug,
        'status', c.status,
        'card_opens', ce.card_opens,
        'detail_opens', ce.detail_opens,
        'visitors', ce.visitors,
        'external_clicks', ce.external_clicks,
        'save_clicks', ce.save_clicks,
        'avg_read_seconds', COALESCE(rs.avg_read_seconds, 0),
        'avg_max_scroll', COALESCE(ss.avg_max_scroll, 0)
      ) ORDER BY ce.detail_opens DESC, c.title)
      FROM courses c
      JOIN course_events ce ON ce.id = c.id
      LEFT JOIN read_stats rs ON rs.entity_id = c.id::TEXT
      LEFT JOIN scroll_stats ss ON ss.entity_id = c.id::TEXT
    ), '[]'::JSONB)
  );
$$;

REVOKE ALL ON FUNCTION public.analytics_premium_courses_dashboard(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_premium_courses_dashboard(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';
