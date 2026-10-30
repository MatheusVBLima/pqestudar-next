CREATE OR REPLACE FUNCTION public.award_author_badges(target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total integer; milestone integer; category_row record; streak integer; category_count integer;
BEGIN
  -- Serialize awards per author; the primary key makes every award idempotent.
  PERFORM 1 FROM public.author_profiles WHERE id = target FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*) INTO total FROM public.guides WHERE author_id = target AND is_published;
  FOREACH milestone IN ARRAY ARRAY[1, 10, 50] LOOP
    IF total >= milestone THEN
      INSERT INTO public.author_badges(author_id, code, title, description)
      VALUES (target, 'published-' || milestone,
        CASE milestone WHEN 1 THEN 'Primeiro guia' WHEN 10 THEN 'Autor em ação' ELSE 'Voz de referência' END,
        CASE milestone WHEN 1 THEN 'Publicou seu primeiro guia.' ELSE 'Alcançou ' || milestone || ' guias publicados.' END)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  FOR category_row IN
    SELECT COALESCE(NULLIF(btrim(public_category), ''), NULLIF(btrim(category), '')) AS name FROM public.guides
    WHERE author_id = target AND is_published
    AND COALESCE(NULLIF(btrim(public_category), ''), NULLIF(btrim(category), '')) IS NOT NULL
    GROUP BY 1 HAVING count(*) >= 10
  LOOP
    INSERT INTO public.author_badges(author_id, code, title, description)
    VALUES (target, 'category-' || md5(category_row.name), 'Contribuidor de ' || category_row.name,
      'Alcançou 10 guias publicados na categoria ' || category_row.name || '.') ON CONFLICT DO NOTHING;
  END LOOP;
  WITH months AS (
    SELECT DISTINCT date_trunc('month', first_published_at AT TIME ZONE 'America/Sao_Paulo') AS month
    FROM public.guides WHERE author_id = target AND is_published AND first_published_at IS NOT NULL
  ), runs AS (
    SELECT month - row_number() OVER (ORDER BY month) * interval '1 month' AS run FROM months
  ) SELECT COALESCE(max(length), 0) INTO streak FROM (SELECT count(*) AS length FROM runs GROUP BY run) lengths;
  FOREACH milestone IN ARRAY ARRAY[3, 6] LOOP
    IF streak >= milestone THEN
      INSERT INTO public.author_badges(author_id, code, title, description)
      VALUES (target, 'consistent-' || milestone,
        CASE milestone WHEN 3 THEN 'Presença constante' ELSE 'Compromisso com o conhecimento' END,
        'Publicou ao menos um guia por mês durante ' || milestone || ' meses consecutivos.')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  SELECT count(*) INTO category_count FROM (
    SELECT COALESCE(NULLIF(btrim(public_category), ''), NULLIF(btrim(category), '')) AS name
    FROM public.guides WHERE author_id = target AND is_published
    GROUP BY 1 HAVING count(*) >= 2
  ) categories WHERE name IS NOT NULL;
  IF category_count >= 3 THEN
    INSERT INTO public.author_badges(author_id, code, title, description)
    VALUES (target, 'variety-3', 'Conhecimento plural', 'Publicou pelo menos 2 guias em cada uma de 3 categorias.')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.award_author_badges(uuid) FROM PUBLIC, anon, authenticated;


-- Update labels without re-awarding or sending duplicate notifications.
UPDATE public.author_badges SET title = 'Voz de referência' WHERE code = 'published-50';
UPDATE public.author_badges SET title = 'Presença constante', description = 'Publicou ao menos um guia por mês durante 3 meses consecutivos.' WHERE code = 'consistent-3';
UPDATE public.author_badges SET title = regexp_replace(title, '^Referência em ', 'Contribuidor de ') WHERE code LIKE 'category-%';
-- Existing publication dates are preserved; no historical dates are fabricated.
DO $$ DECLARE author_row record; BEGIN
  FOR author_row IN SELECT id FROM public.author_profiles ORDER BY id LOOP
    PERFORM public.award_author_badges(author_row.id);
  END LOOP;
END $$;
