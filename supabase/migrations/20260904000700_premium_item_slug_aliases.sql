-- Generic canonical slug aliases for Premium items. No production alias is seeded here.
CREATE TABLE IF NOT EXISTS public.premium_item_slug_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_item_id uuid NOT NULL REFERENCES public.premium_items(id) ON DELETE CASCADE,
  old_slug text NOT NULL UNIQUE CHECK (old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (premium_item_id, old_slug)
);

CREATE INDEX IF NOT EXISTS premium_item_slug_aliases_item_idx
  ON public.premium_item_slug_aliases (premium_item_id, is_active);
CREATE INDEX IF NOT EXISTS premium_item_slug_aliases_lookup_idx
  ON public.premium_item_slug_aliases (old_slug) WHERE is_active;

CREATE OR REPLACE FUNCTION public.prevent_premium_item_slug_collision()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'premium_item_slug_aliases' THEN
    IF EXISTS (SELECT 1 FROM public.premium_items WHERE slug = NEW.old_slug) THEN
      RAISE EXCEPTION 'Premium item alias collides with a canonical slug' USING ERRCODE = '23505';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.premium_item_slug_aliases WHERE old_slug = NEW.slug AND is_active) THEN
      RAISE EXCEPTION 'Premium item canonical slug collides with an active alias' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS premium_item_alias_reject_canonical_slug ON public.premium_item_slug_aliases;
CREATE TRIGGER premium_item_alias_reject_canonical_slug
BEFORE INSERT OR UPDATE OF old_slug, is_active ON public.premium_item_slug_aliases
FOR EACH ROW EXECUTE FUNCTION public.prevent_premium_item_slug_collision();

DROP TRIGGER IF EXISTS premium_item_slug_reject_alias ON public.premium_items;
CREATE TRIGGER premium_item_slug_reject_alias
BEFORE INSERT OR UPDATE OF slug ON public.premium_items
FOR EACH ROW EXECUTE FUNCTION public.prevent_premium_item_slug_collision();

ALTER TABLE public.premium_item_slug_aliases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_item_slug_aliases TO authenticated;

DROP POLICY IF EXISTS "premium_item_slug_aliases_premium_read" ON public.premium_item_slug_aliases;
CREATE POLICY "premium_item_slug_aliases_premium_read" ON public.premium_item_slug_aliases
FOR SELECT TO authenticated USING (
  is_active AND (
    public.has_active_subscription()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'developer'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);

DROP POLICY IF EXISTS "premium_item_slug_aliases_editor_manage" ON public.premium_item_slug_aliases;
CREATE POLICY "premium_item_slug_aliases_editor_manage" ON public.premium_item_slug_aliases
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);

NOTIFY pgrst, 'reload schema';
