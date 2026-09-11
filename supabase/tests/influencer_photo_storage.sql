BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'influencer-photos' AND public AND file_size_limit = 5242880 AND allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']) THEN
    RAISE EXCEPTION 'Bucket configuration mismatch';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects(bucket_id, name) VALUES ('influencer-photos', 'portraits/transactional-policy-test.jpg');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id, name) VALUES ('influencer-photos', 'portraits/denied.jpg');
    RAISE EXCEPTION 'Non-admin upload allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE storage.objects SET name = 'portraits/changed.jpg' WHERE bucket_id = 'influencer-photos';
  IF FOUND THEN RAISE EXCEPTION 'Non-admin update allowed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id, name) VALUES ('influencer-photos', 'portraits/anonymous.jpg');
    RAISE EXCEPTION 'Anonymous upload allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
