BEGIN;
SET LOCAL ROLE anon;
SELECT public.record_page_heatmap('00000000-0000-4000-8000-000000000123','/heatmap-test','mobile','[{"x":1000,"y":2000,"width":390,"height":2000}]');
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM public.page_heatmap_clicks;
    RAISE EXCEPTION 'Anonymous raw read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.record_page_heatmap('00000000-0000-4000-8000-000000000123','/admin/test','mobile','[]');
    RAISE EXCEPTION 'Sensitive route accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Invalid heatmap payload' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.admin_page_heatmap('/heatmap-test','mobile',7);
    RAISE EXCEPTION 'Common user can read report';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT user_id::text FROM public.user_roles WHERE role='admin' LIMIT 1),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE report jsonb; BEGIN
  report := public.admin_page_heatmap('/heatmap-test','mobile',7);
  IF (report->>'clicks')::integer <> 1 OR (report->>'visits')::integer <> 1 THEN RAISE EXCEPTION 'Report aggregation failed'; END IF;
  IF (public.admin_page_heatmap('/heatmap-test','desktop',7)->>'clicks')::integer <> 0 THEN RAISE EXCEPTION 'Device filter failed'; END IF;
  PERFORM public.record_page_heatmap('00000000-0000-4000-8000-000000000123','/heatmap-test','mobile','[{"x":1000,"y":2000,"width":390,"height":2000}]');
  IF (public.admin_page_heatmap('/heatmap-test','mobile',7)->>'clicks')::integer <> 1 THEN RAISE EXCEPTION 'Admin traffic not excluded'; END IF;
END $$;
ROLLBACK;
