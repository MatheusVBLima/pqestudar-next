CREATE TABLE public.page_heatmap_clicks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visit_id uuid NOT NULL,
  path text NOT NULL CHECK (length(path) BETWEEN 1 AND 300 AND path ~ '^/[^?#]*$' AND path !~ '^//'),
  device text NOT NULL CHECK (device IN ('mobile','tablet','desktop')),
  x integer NOT NULL CHECK (x BETWEEN 0 AND 10000),
  y integer NOT NULL CHECK (y BETWEEN 0 AND 10000),
  viewport_width integer NOT NULL CHECK (viewport_width BETWEEN 240 AND 8000),
  page_height integer NOT NULL CHECK (page_height BETWEEN 1 AND 200000)
);
CREATE INDEX page_heatmap_route_period ON public.page_heatmap_clicks(path,device,created_at DESC);
CREATE INDEX page_heatmap_visit ON public.page_heatmap_clicks(visit_id);
ALTER TABLE public.page_heatmap_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_heatmap_clicks FROM anon, authenticated;

CREATE FUNCTION public.record_page_heatmap(p_visit uuid, p_path text, p_device text, p_clicks jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer;
BEGIN
  IF p_visit IS NULL OR p_path IS NULL OR p_path !~ '^/[^?#]*$' OR p_path ~ '^//' OR length(p_path)>300
    OR p_path ~ '^/(admin|moderador|login|auth|conta|perfil|checkout|resgate)(/|$)'
    OR p_device IS NULL OR p_device NOT IN ('mobile','tablet','desktop')
    OR jsonb_typeof(p_clicks) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid heatmap payload'; END IF;
  IF jsonb_array_length(p_clicks)>20 THEN RAISE EXCEPTION 'Batch too large'; END IF;
  IF public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'developer'::public.app_role) OR public.has_role(auth.uid(),'moderator'::public.app_role) THEN RETURN; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_visit::text, 0));
  SELECT count(*) INTO n FROM public.page_heatmap_clicks WHERE visit_id=p_visit;
  INSERT INTO public.page_heatmap_clicks(visit_id,path,device,x,y,viewport_width,page_height)
  SELECT p_visit,p_path,p_device,(c->>'x')::integer,(c->>'y')::integer,(c->>'width')::integer,(c->>'height')::integer
  FROM jsonb_array_elements(p_clicks) c LIMIT greatest(0,200-n);
END $$;

CREATE FUNCTION public.admin_page_heatmap(p_path text DEFAULT NULL, p_device text DEFAULT 'desktop', p_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT (coalesce(public.has_role(auth.uid(),'admin'::public.app_role),false) OR coalesce(public.has_role(auth.uid(),'developer'::public.app_role),false)) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  WITH filtered AS (
    SELECT * FROM public.page_heatmap_clicks WHERE created_at >= now()-make_interval(days=>least(greatest(coalesce(p_days,7),1),90)) AND device=p_device
  ), cells AS (
    SELECT floor(x/200.0)*200+100 AS x, floor(y/100.0)*100+50 AS y, count(*) AS count
    FROM filtered WHERE path=p_path GROUP BY 1,2
  ), routes AS (
    SELECT path,count(*) AS clicks,count(DISTINCT visit_id) AS visits FROM filtered GROUP BY path ORDER BY clicks DESC
  ) SELECT jsonb_build_object(
    'routes',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM routes r),'[]'::jsonb),
    'points',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM cells c),'[]'::jsonb),
    'clicks',(SELECT count(*) FROM filtered WHERE path=p_path),
    'visits',(SELECT count(DISTINCT visit_id) FROM filtered WHERE path=p_path),
    'width',(SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY viewport_width) FROM filtered WHERE path=p_path),
    'height',(SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY page_height) FROM filtered WHERE path=p_path)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.record_page_heatmap(uuid,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_page_heatmap(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_page_heatmap(uuid,text,text,jsonb) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_page_heatmap(text,text,integer) TO authenticated;
