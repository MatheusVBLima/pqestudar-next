-- Permanent allocation ledger: removing a profile or guide never reopens a slot.
CREATE TABLE public.author_pioneer_capacity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  allocated integer NOT NULL DEFAULT 0 CHECK (allocated BETWEEN 0 AND 20)
);
INSERT INTO public.author_pioneer_capacity DEFAULT VALUES;
CREATE TABLE public.author_pioneer_claims (
  author_id uuid PRIMARY KEY,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.author_pioneer_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_pioneer_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.author_pioneer_capacity, public.author_pioneer_claims FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.award_author_pioneer(target uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Lock serializes both first-time allocation and repeated requests across authors.
  PERFORM 1 FROM public.author_pioneer_capacity WHERE singleton FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.author_pioneer_claims WHERE author_id = target)
    OR NOT EXISTS (SELECT 1 FROM public.author_badges WHERE author_id = target AND code = 'published-1') THEN
    RETURN;
  END IF;
  UPDATE public.author_pioneer_capacity SET allocated = allocated + 1
    WHERE singleton AND allocated < 20;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.author_pioneer_claims(author_id) VALUES (target);
  INSERT INTO public.author_badges(author_id, code, title, description)
    VALUES (target, 'pioneer-20', 'Autor pioneiro', 'Fez parte dos primeiros 20 autores a publicar um guia no PqEstudar.');
END $$;
REVOKE ALL ON FUNCTION public.award_author_pioneer(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.on_author_first_guide_pioneer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_author_pioneer(NEW.author_id);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.on_author_first_guide_pioneer() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER award_author_pioneer AFTER INSERT ON public.author_badges
FOR EACH ROW WHEN (NEW.code = 'published-1') EXECUTE FUNCTION public.on_author_first_guide_pioneer();

-- All existing contributors form the initial cohort; do not invent a historic ranking.
DO $$ DECLARE author_row record; BEGIN
  IF (SELECT count(*) FROM public.author_badges WHERE code = 'published-1') > 20 THEN
    RAISE EXCEPTION 'Initial cohort exceeds 20 authors; resolve historical eligibility before allocating pioneer badges';
  END IF;
  FOR author_row IN SELECT author_id FROM public.author_badges WHERE code = 'published-1' ORDER BY author_id LOOP
    PERFORM public.award_author_pioneer(author_row.author_id);
  END LOOP;
END $$;
