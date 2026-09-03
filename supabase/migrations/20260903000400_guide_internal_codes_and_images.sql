-- One stable code for guides created manually or through the assisted flow.
CREATE OR REPLACE FUNCTION public.generate_guide_internal_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'G-';
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE public.guides
  ALTER COLUMN internal_code SET DEFAULT public.generate_guide_internal_code();

CREATE UNIQUE INDEX IF NOT EXISTS guides_internal_code_unique_idx
  ON public.guides (internal_code);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guide-images', 'guide-images', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "guide_images_editor_select" ON storage.objects;
CREATE POLICY "guide_images_editor_select" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'guide-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);

DROP POLICY IF EXISTS "guide_images_editor_insert" ON storage.objects;
CREATE POLICY "guide_images_editor_insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'guide-images' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);

DROP POLICY IF EXISTS "guide_images_editor_update" ON storage.objects;
CREATE POLICY "guide_images_editor_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'guide-images' AND (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
))
WITH CHECK (bucket_id = 'guide-images' AND (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
));

DROP POLICY IF EXISTS "guide_images_editor_delete" ON storage.objects;
CREATE POLICY "guide_images_editor_delete" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'guide-images' AND (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
));
