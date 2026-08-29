INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exclusive-documents',
  'exclusive-documents',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "exclusive_documents_admin_insert" ON storage.objects;
CREATE POLICY "exclusive_documents_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exclusive-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
  )
);

DROP POLICY IF EXISTS "exclusive_documents_admin_update" ON storage.objects;
CREATE POLICY "exclusive_documents_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'exclusive-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'exclusive-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
  )
);

DROP POLICY IF EXISTS "exclusive_documents_admin_delete" ON storage.objects;
CREATE POLICY "exclusive_documents_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'exclusive-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
  )
);
