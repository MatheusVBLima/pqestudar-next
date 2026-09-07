-- Transactional CRUD and access checks; no fixture survives the rollback.
BEGIN;
SELECT set_config('request.jwt.claim.sub', (
  SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1
), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE test_id uuid;
BEGIN
  INSERT INTO public.admin_influencers (name, profile_url)
  VALUES ('Teste transacional', 'https://example.com/profile') RETURNING id INTO test_id;
  IF NOT EXISTS (SELECT 1 FROM public.admin_influencers WHERE id = test_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Insert/read/default status failed';
  END IF;
  UPDATE public.admin_influencers SET status = 'accepted' WHERE id = test_id;
  IF NOT EXISTS (SELECT 1 FROM public.admin_influencers WHERE id = test_id AND status = 'accepted') THEN
    RAISE EXCEPTION 'Update failed';
  END IF;
  DELETE FROM public.admin_influencers WHERE id = test_id;
  IF EXISTS (SELECT 1 FROM public.admin_influencers WHERE id = test_id) THEN
    RAISE EXCEPTION 'Delete failed';
  END IF;
  INSERT INTO public.admin_influencers (name, profile_url) VALUES ('Teste RLS', 'https://example.com/rls');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_influencers) THEN
    RAISE EXCEPTION 'Non-admin can read contacts';
  END IF;
  BEGIN
    INSERT INTO public.admin_influencers (name, profile_url) VALUES ('Denied', 'https://example.com');
    RAISE EXCEPTION 'Non-admin insert was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.admin_influencers SET status = 'rejected';
  IF FOUND THEN RAISE EXCEPTION 'Non-admin update was allowed'; END IF;
  DELETE FROM public.admin_influencers;
  IF FOUND THEN RAISE EXCEPTION 'Non-admin delete was allowed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.admin_influencers;
    RAISE EXCEPTION 'Anonymous read was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
