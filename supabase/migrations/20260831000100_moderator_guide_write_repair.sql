-- Repair guide writes for moderators. This migration is intentionally
-- idempotent because the original ownership SQL may have been applied through
-- the dashboard without being registered in the migration history.

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS guides_created_by_idx ON public.guides(created_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guides TO authenticated;

CREATE OR REPLACE FUNCTION public.set_guide_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Normal browser writes use auth.uid(). COALESCE also keeps explicitly
    -- supplied ownership during trusted maintenance operations.
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by
        AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
        AND NOT public.has_role(auth.uid(), 'developer'::public.app_role) THEN
    NEW.created_by := OLD.created_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_guide_owner_trigger ON public.guides;
CREATE TRIGGER set_guide_owner_trigger
BEFORE INSERT OR UPDATE ON public.guides
FOR EACH ROW EXECUTE FUNCTION public.set_guide_owner();

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads published guides" ON public.guides;
DROP POLICY IF EXISTS "Published guides and authorized drafts" ON public.guides;
DROP POLICY IF EXISTS "Admins and moderators create guides" ON public.guides;
DROP POLICY IF EXISTS "Admins or owners update guides" ON public.guides;
DROP POLICY IF EXISTS "Admins or owners delete guides" ON public.guides;

CREATE POLICY "Published guides and authorized drafts" ON public.guides
FOR SELECT USING (
  is_published
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'moderator'::public.app_role)
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins and moderators create guides" ON public.guides
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'moderator'::public.app_role)
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins or owners update guides" ON public.guides
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'moderator'::public.app_role)
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'moderator'::public.app_role)
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Admins or owners delete guides" ON public.guides
FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'moderator'::public.app_role)
    AND created_by = auth.uid()
  )
);
