CREATE TABLE public.admin_influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 150),
  profile_url text NOT NULL CHECK (length(profile_url) <= 2048 AND profile_url ~ '^https?://[^[:space:]/]+'),
  email text CHECK (length(email) <= 254),
  phone text CHECK (length(phone) <= 40),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_influencers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_influencers FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_influencers TO authenticated;
CREATE POLICY admin_influencers_admin_only ON public.admin_influencers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'developer'::public.app_role));
