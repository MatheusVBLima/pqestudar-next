-- Analytics for /exclusivos. Products are the source of truth so every newly
-- created material is returned immediately, including items with zero traffic.
CREATE OR REPLACE FUNCTION public.analytics_exclusives_dashboard_public(
  start_at TIMESTAMPTZ DEFAULT NULL,
  end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH showcase AS (
    SELECT pv.created_at, pv.session_id
    FROM public.page_views pv
    WHERE public.is_admin()
      AND pv.actor_type = 'public'
      AND split_part(pv.path, '?', 1) = '/exclusivos'
      AND (start_at IS NULL OR pv.created_at >= start_at)
      AND (end_at IS NULL OR pv.created_at < end_at)
  ), events AS (
    SELECT ae.*
    FROM public.analytics_events ae
    WHERE public.is_admin()
      AND ae.entity_type = 'product'
      AND ae.actor_type IN ('public', 'anonymous')
      AND ae.event_name IN (
        'exclusive_card_open',
        'exclusive_detail_open',
        'exclusive_read_heartbeat',
        'exclusive_download_click'
      )
      AND (start_at IS NULL OR ae.created_at >= start_at)
      AND (end_at IS NULL OR ae.created_at < end_at)
  ), product_events AS (
    SELECT
      p.id,
      COUNT(*) FILTER (WHERE e.event_name = 'exclusive_card_open') AS card_opens,
      COUNT(*) FILTER (WHERE e.event_name = 'exclusive_detail_open') AS detail_opens,
      COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'exclusive_detail_open') AS visitors,
      COUNT(*) FILTER (WHERE e.event_name = 'exclusive_download_click') AS downloads
    FROM public.products p
    LEFT JOIN events e ON e.entity_id = p.id::TEXT
    WHERE public.is_admin()
    GROUP BY p.id
  ), session_read AS (
    SELECT entity_id, session_id,
      SUM(COALESCE((meta->>'read_seconds_increment')::NUMERIC, 0)) AS seconds
    FROM events
    WHERE event_name = 'exclusive_read_heartbeat'
    GROUP BY entity_id, session_id
  ), read_stats AS (
    SELECT entity_id, ROUND(AVG(seconds), 1) AS avg_read_seconds
    FROM session_read
    GROUP BY entity_id
  ), days AS (
    SELECT day::DATE
    FROM generate_series(
      COALESCE(start_at, LEAST(
        COALESCE((SELECT MIN(created_at) FROM showcase), now()),
        COALESCE((SELECT MIN(created_at) FROM events), now())
      )),
      COALESCE(end_at, now()),
      INTERVAL '1 day'
    ) day
  ), showcase_daily AS (
    SELECT created_at::DATE AS day, COUNT(*) AS showcase_views
    FROM showcase
    GROUP BY 1
  ), events_daily AS (
    SELECT created_at::DATE AS day,
      COUNT(*) FILTER (WHERE event_name = 'exclusive_detail_open') AS detail_opens,
      COUNT(*) FILTER (WHERE event_name = 'exclusive_download_click') AS downloads
    FROM events
    GROUP BY 1
  ), timeline AS (
    SELECT
      to_char(d.day, 'DD/MM') AS day,
      COALESCE(s.showcase_views, 0) AS showcase_views,
      COALESCE(e.detail_opens, 0) AS detail_opens,
      COALESCE(e.downloads, 0) AS downloads
    FROM days d
    LEFT JOIN showcase_daily s ON s.day = d.day
    LEFT JOIN events_daily e ON e.day = d.day
    ORDER BY d.day
  )
  SELECT jsonb_build_object(
    'overview', jsonb_build_object(
      'showcase_views', (SELECT COUNT(*) FROM showcase),
      'showcase_visitors', (SELECT COUNT(DISTINCT session_id) FROM showcase),
      'card_opens', (SELECT COUNT(*) FROM events WHERE event_name = 'exclusive_card_open'),
      'detail_opens', (SELECT COUNT(*) FROM events WHERE event_name = 'exclusive_detail_open'),
      'downloads', (SELECT COUNT(*) FROM events WHERE event_name = 'exclusive_download_click'),
      'avg_read_seconds', COALESCE((SELECT ROUND(AVG(seconds), 1) FROM session_read), 0)
    ),
    'timeline', COALESCE((SELECT jsonb_agg(to_jsonb(timeline)) FROM timeline), '[]'::JSONB),
    'products', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'product_id', p.id,
        'title', p.title,
        'category', p.category,
        'is_active', p.is_active,
        'card_opens', pe.card_opens,
        'detail_opens', pe.detail_opens,
        'visitors', pe.visitors,
        'downloads', pe.downloads,
        'avg_read_seconds', COALESCE(rs.avg_read_seconds, 0)
      ) ORDER BY pe.card_opens DESC, p.title)
      FROM public.products p
      JOIN product_events pe ON pe.id = p.id
      LEFT JOIN read_stats rs ON rs.entity_id = p.id::TEXT
      WHERE public.is_admin()
    ), '[]'::JSONB)
  );
$$;

REVOKE ALL ON FUNCTION public.analytics_exclusives_dashboard_public(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_exclusives_dashboard_public(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';
