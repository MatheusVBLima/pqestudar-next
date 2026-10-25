-- Public editorial identity is separate from guides.created_by (editing ownership).
CREATE TABLE public.author_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 100 AND slug NOT IN ('meu-perfil', 'editar')),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 100),
  headline text NOT NULL DEFAULT '' CHECK (length(headline) <= 180),
  bio text NOT NULL DEFAULT '' CHECK (length(bio) <= 2000),
  education text NOT NULL DEFAULT '' CHECK (length(education) <= 400),
  photo_url text NOT NULL DEFAULT '' CHECK (photo_url = '' OR photo_url ~ '^https://[^/@[:space:]]+([/?#]|$)'),
  website_url text NOT NULL DEFAULT '' CHECK (website_url = '' OR website_url ~ '^https://[^/@[:space:]]+([/?#]|$)'),
  website_label text NOT NULL DEFAULT 'Conheça meu trabalho' CHECK (length(website_label) BETWEEN 1 AND 60),
  instagram_url text NOT NULL DEFAULT '' CHECK (instagram_url = '' OR instagram_url ~ '^https://(www\.)?instagram\.com/'),
  youtube_url text NOT NULL DEFAULT '' CHECK (youtube_url = '' OR youtube_url ~ '^https://(www\.)?(youtube\.com/|youtu\.be/)'),
  featured_badges text[] NOT NULL DEFAULT '{}' CHECK (cardinality(featured_badges) <= 3),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public author profiles" ON public.author_profiles FOR SELECT USING (true);
CREATE POLICY "Editors create own author profile" ON public.author_profiles FOR INSERT TO authenticated WITH CHECK (
  (user_id = auth.uid() AND public.has_role(auth.uid(), 'moderator'))
  OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer')
);
CREATE POLICY "Owners edit author profile" ON public.author_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer'));
-- Account IDs are editorial administration data, not part of the public projection.
REVOKE ALL ON public.author_profiles FROM anon, authenticated;
GRANT SELECT (id, slug, display_name, headline, bio, education, photo_url, website_url, website_label, instagram_url, youtube_url, featured_badges, created_at) ON public.author_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.author_profiles TO authenticated;

ALTER TABLE public.guides ADD COLUMN author_id uuid REFERENCES public.author_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.guides ADD COLUMN first_published_at timestamptz;
CREATE INDEX guides_author_id_idx ON public.guides(author_id) WHERE is_published;

-- Preserve existing bylines as editorial profiles without claiming an auth account.
-- A historical creation/update date is NOT evidence of the publication date.
INSERT INTO public.author_profiles (slug, display_name)
SELECT COALESCE(NULLIF(trim(both '-' from regexp_replace(translate(lower(left(btrim(author_name), 75)),
  'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', '-', 'g')), ''), 'autor')
  || '-' || substr(md5(btrim(author_name)), 1, 8), btrim(author_name)
FROM public.guides WHERE is_published AND nullif(btrim(author_name), '') IS NOT NULL GROUP BY btrim(author_name);
UPDATE public.guides g SET author_id = a.id FROM public.author_profiles a WHERE a.display_name = btrim(g.author_name);
UPDATE public.guides SET first_published_at = now() WHERE is_published;

CREATE TABLE public.author_badges (
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (author_id, code)
);
ALTER TABLE public.author_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public earned author badges" ON public.author_badges FOR SELECT USING (true);
REVOKE ALL ON public.author_badges FROM anon, authenticated;
GRANT SELECT ON public.author_badges TO anon, authenticated;

CREATE FUNCTION public.protect_author_identity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN RAISE EXCEPTION 'Author profile addresses are permanent'; END IF;
  NEW.created_at := OLD.created_at;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND auth.uid() IS NOT NULL
    AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer')) THEN
    RAISE EXCEPTION 'Only administrators can assign author accounts';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_author_identity BEFORE UPDATE ON public.author_profiles FOR EACH ROW EXECUTE FUNCTION public.protect_author_identity();

CREATE FUNCTION public.notify_author_badge() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; notification uuid;
BEGIN
  SELECT user_id INTO recipient FROM public.author_profiles WHERE id = NEW.author_id;
  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications(title, body) VALUES ('Nova conquista: ' || NEW.title,
      NEW.description || ' Confira suas conquistas em Autores → Meu perfil de autor.') RETURNING id INTO notification;
    INSERT INTO public.user_notifications(user_id, notification_id) VALUES (recipient, notification);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_author_badge AFTER INSERT ON public.author_badges FOR EACH ROW EXECUTE FUNCTION public.notify_author_badge();
REVOKE ALL ON FUNCTION public.notify_author_badge() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.prepare_guide_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE own_author uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.first_published_at := CASE WHEN NEW.is_published THEN now() ELSE NULL END;
  ELSE
    NEW.first_published_at := COALESCE(OLD.first_published_at, CASE WHEN NEW.is_published THEN now() END);
  END IF;
  IF auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer')) THEN
    SELECT id INTO own_author FROM public.author_profiles WHERE user_id = auth.uid();
    IF TG_OP = 'INSERT' OR NEW.author_id IS NULL THEN
      NEW.author_id := own_author;
    ELSIF NEW.author_id IS DISTINCT FROM OLD.author_id AND NEW.author_id IS DISTINCT FROM own_author THEN
      RAISE EXCEPTION 'Cannot attribute a guide to another author';
    END IF;
  END IF;
  IF NEW.author_id IS NOT NULL THEN
    SELECT display_name INTO NEW.author_name FROM public.author_profiles WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER prepare_guide_author BEFORE INSERT OR UPDATE ON public.guides FOR EACH ROW EXECUTE FUNCTION public.prepare_guide_author();

CREATE FUNCTION public.award_author_badges(target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total integer; milestone integer; category_row record; has_streak boolean;
BEGIN
  -- Serialize awards per author; the primary key makes every award idempotent.
  PERFORM 1 FROM public.author_profiles WHERE id = target FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*) INTO total FROM public.guides WHERE author_id = target AND is_published;
  FOREACH milestone IN ARRAY ARRAY[1, 10, 50] LOOP
    IF total >= milestone THEN
      INSERT INTO public.author_badges(author_id, code, title, description)
      VALUES (target, 'published-' || milestone,
        CASE milestone WHEN 1 THEN 'Primeiro guia' WHEN 10 THEN 'Autor em ação' ELSE '50 guias publicados' END,
        CASE milestone WHEN 1 THEN 'Publicou seu primeiro guia.' ELSE 'Alcançou ' || milestone || ' guias publicados.' END)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  FOR category_row IN
    SELECT COALESCE(NULLIF(public_category, ''), category) AS name FROM public.guides
    WHERE author_id = target AND is_published
    GROUP BY 1 HAVING count(*) >= 10
  LOOP
    INSERT INTO public.author_badges(author_id, code, title, description)
    VALUES (target, 'category-' || md5(category_row.name), 'Referência em ' || category_row.name,
      'Alcançou 10 guias publicados na categoria ' || category_row.name || '.') ON CONFLICT DO NOTHING;
  END LOOP;
  WITH months AS (
    SELECT DISTINCT date_trunc('month', first_published_at AT TIME ZONE 'America/Sao_Paulo') AS month
    FROM public.guides WHERE author_id = target AND is_published AND first_published_at IS NOT NULL
  ) SELECT EXISTS (SELECT 1 FROM months a JOIN months b ON b.month = a.month + interval '1 month'
    JOIN months c ON c.month = a.month + interval '2 months') INTO has_streak;
  IF has_streak THEN
    INSERT INTO public.author_badges(author_id, code, title, description)
    VALUES (target, 'consistent-3', 'Autor consistente', 'Publicou ao menos um guia por mês durante três meses seguidos.') ON CONFLICT DO NOTHING;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.award_author_badges(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.on_guide_author_publication() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published AND NEW.author_id IS NOT NULL THEN PERFORM public.award_author_badges(NEW.author_id); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER award_author_badges AFTER INSERT OR UPDATE OF is_published, author_id, public_category, category
ON public.guides FOR EACH ROW EXECUTE FUNCTION public.on_guide_author_publication();
REVOKE ALL ON FUNCTION public.prepare_guide_author(), public.on_guide_author_publication(), public.protect_author_identity() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE a record; BEGIN
  FOR a IN SELECT DISTINCT author_id FROM public.guides WHERE author_id IS NOT NULL AND is_published LOOP
    PERFORM public.award_author_badges(a.author_id);
  END LOOP;
END $$;
