CREATE FUNCTION public.get_author_profile_visits(target uuid) RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE profile_slug text; owner_id uuid; visits bigint;
BEGIN
  SELECT slug, user_id INTO profile_slug, owner_id FROM public.author_profiles WHERE id = target;
  IF auth.uid() IS NULL OR NOT (
    owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer')
  ) IS TRUE THEN
    RAISE EXCEPTION 'Author visits are private' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) INTO visits FROM public.page_views pv
  WHERE pv.path IN ('/autores/' || profile_slug, '/autores/' || profile_slug || '/')
    AND pv.actor_type = 'public'
    AND (pv.user_id IS NULL OR (
      pv.user_id IS DISTINCT FROM owner_id
      AND NOT public.has_role(pv.user_id, 'admin')
      AND NOT public.has_role(pv.user_id, 'developer')
    ));
  RETURN visits;
END $$;
REVOKE ALL ON FUNCTION public.get_author_profile_visits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_author_profile_visits(uuid) TO authenticated;
