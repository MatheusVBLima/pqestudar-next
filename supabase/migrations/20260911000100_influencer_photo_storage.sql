INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('influencer-photos', 'influencer-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY influencer_photos_admin_access ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'influencer-photos' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role)))
WITH CHECK (bucket_id = 'influencer-photos' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role)));

-- Prevent unrelated broad storage policies from granting access to this bucket.
CREATE POLICY influencer_photos_authenticated_boundary ON storage.objects AS RESTRICTIVE
FOR ALL TO authenticated
USING (bucket_id <> 'influencer-photos' OR (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role)))
WITH CHECK (bucket_id <> 'influencer-photos' OR (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role)));
CREATE POLICY influencer_photos_anon_boundary ON storage.objects AS RESTRICTIVE
FOR ALL TO anon USING (bucket_id <> 'influencer-photos') WITH CHECK (bucket_id <> 'influencer-photos');
