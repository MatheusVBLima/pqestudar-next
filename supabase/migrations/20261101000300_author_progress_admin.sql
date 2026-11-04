CREATE OR REPLACE FUNCTION public.get_author_progress(target uuid)
RETURNS TABLE(points bigint, credited_guides bigint, contribution_months bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'developer') OR EXISTS (
    SELECT 1 FROM public.author_profiles WHERE id = target AND user_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'Author progress is private' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT COALESCE(sum(c.points), 0)::bigint, count(*),
    count(DISTINCT date_trunc('month', c.published_at AT TIME ZONE 'America/Sao_Paulo'))
    FROM public.author_publication_credits c WHERE c.author_id = target;
END $$;
REVOKE ALL ON FUNCTION public.get_author_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_author_progress(uuid) TO authenticated;
