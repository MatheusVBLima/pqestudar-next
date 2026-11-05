-- Only explicitly reviewed assets participate in automatic selection.
CREATE TABLE public.guide_image_library (
  storage_path text PRIMARY KEY,
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 500),
  tags text[] NOT NULL CHECK (cardinality(tags) BETWEEN 2 AND 20),
  purpose text NOT NULL CHECK (purpose IN ('cover', 'explanation', 'steps', 'comparison')),
  source text NOT NULL CHECK (length(trim(source)) > 0),
  license text NOT NULL CHECK (length(trim(license)) > 0),
  approved boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guide_image_library ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_image_library TO authenticated;
GRANT ALL ON public.guide_image_library TO service_role;
CREATE POLICY guide_images_read ON public.guide_image_library FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY guide_images_manage ON public.guide_image_library FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer'));

-- Generated diagrams contain only escaped text and shapes, never user-supplied SVG.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('guide-diagrams', 'guide-diagrams', true, 1048576, ARRAY['image/svg+xml'])
ON CONFLICT (id) DO NOTHING;
-- Uploads are server-only through the authenticated generation function.
NOTIFY pgrst, 'reload schema';
