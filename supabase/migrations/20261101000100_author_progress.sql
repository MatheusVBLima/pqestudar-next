-- Immutable credit per guide. No guide FK: deleting a guide cannot erase earned progress.
CREATE TABLE public.author_publication_credits (
  guide_id uuid PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  published_at timestamptz NOT NULL,
  points integer NOT NULL DEFAULT 100 CHECK (points = 100)
);
CREATE INDEX author_publication_credits_author_idx ON public.author_publication_credits(author_id);
ALTER TABLE public.author_publication_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.author_publication_credits FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.credit_author_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published AND NEW.author_id IS NOT NULL THEN
    INSERT INTO public.author_publication_credits(guide_id, author_id, published_at)
      VALUES (NEW.id, NEW.author_id, COALESCE(NEW.first_published_at, now()))
      ON CONFLICT (guide_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.credit_author_publication() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER credit_author_publication AFTER INSERT OR UPDATE OF is_published, author_id
ON public.guides FOR EACH ROW EXECUTE FUNCTION public.credit_author_publication();

INSERT INTO public.author_publication_credits(guide_id, author_id, published_at)
SELECT id, author_id, first_published_at FROM public.guides
WHERE author_id IS NOT NULL AND first_published_at IS NOT NULL
ON CONFLICT (guide_id) DO NOTHING;

-- Public projection contains only totals, never unpublished guide identities.
CREATE FUNCTION public.get_author_progress(target uuid)
RETURNS TABLE(points bigint, credited_guides bigint, contribution_months bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(c.points), 0)::bigint, count(*),
    count(DISTINCT date_trunc('month', c.published_at AT TIME ZONE 'America/Sao_Paulo'))
  FROM public.author_publication_credits c WHERE c.author_id = target;
$$;
REVOKE ALL ON FUNCTION public.get_author_progress(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_author_progress(uuid) TO anon, authenticated;
