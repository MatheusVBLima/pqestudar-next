ALTER TABLE public.admin_influencers
  ADD COLUMN photo_url text CHECK (photo_url IS NULL OR (length(photo_url) <= 2048 AND photo_url ~ '^https://[^[:space:]/]+')),
  ADD COLUMN show_on_home boolean NOT NULL DEFAULT false;

-- Expose only the public presentation fields, never prospect contact details.
CREATE FUNCTION public.get_home_influencer_partners()
RETURNS TABLE (id uuid, name text, profile_url text, photo_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT i.id, i.name, i.profile_url, i.photo_url
  FROM public.admin_influencers i
  WHERE i.status = 'accepted' AND i.show_on_home = true AND i.photo_url IS NOT NULL
  ORDER BY i.created_at, i.id;
$$;
REVOKE ALL ON FUNCTION public.get_home_influencer_partners() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_home_influencer_partners() TO anon, authenticated;
