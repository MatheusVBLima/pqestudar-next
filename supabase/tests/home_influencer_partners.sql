BEGIN;
INSERT INTO public.admin_influencers (name, profile_url, photo_url, status, show_on_home, email, phone) VALUES
('partner-test-visible', 'https://example.com/visible', 'https://example.com/photo.jpg', 'accepted', true, 'private@example.com', 'private'),
('partner-test-pending', 'https://example.com/pending', 'https://example.com/photo.jpg', 'pending', true, NULL, NULL),
('partner-test-hidden', 'https://example.com/hidden', 'https://example.com/photo.jpg', 'accepted', false, NULL, NULL),
('partner-test-no-photo', 'https://example.com/no-photo', NULL, 'accepted', true, NULL, NULL);
SET LOCAL ROLE anon;
DO $$
DECLARE result jsonb;
BEGIN
  SELECT to_jsonb(p) INTO result FROM public.get_home_influencer_partners() p WHERE name = 'partner-test-visible';
  IF result IS NULL OR result ? 'email' OR result ? 'phone' THEN RAISE EXCEPTION 'Public projection failed'; END IF;
  IF (SELECT count(*) FROM public.get_home_influencer_partners() WHERE name LIKE 'partner-test-%') <> 1 THEN RAISE EXCEPTION 'Visibility filtering failed'; END IF;
  BEGIN
    PERFORM email FROM public.admin_influencers;
    RAISE EXCEPTION 'Anonymous access to private contacts allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
UPDATE public.admin_influencers SET status = 'rejected' WHERE name = 'partner-test-visible';
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.get_home_influencer_partners() WHERE name = 'partner-test-visible') THEN
    RAISE EXCEPTION 'Rejected partner remained public';
  END IF;
END $$;
ROLLBACK;
