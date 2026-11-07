-- Private working copies. Public guides change only after editorial approval.
CREATE TABLE public.author_guide_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id),
  guide_id uuid UNIQUE REFERENCES public.guides(id) ON DELETE SET NULL,
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','changes_requested','published')),
  feedback text NOT NULL DEFAULT '',
  revision integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.author_guide_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.author_guide_drafts(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  feedback text NOT NULL DEFAULT '',
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX author_drafts_status ON public.author_guide_drafts(status, updated_at DESC);
CREATE INDEX author_drafts_owner ON public.author_guide_drafts(author_id);
CREATE INDEX author_history_draft ON public.author_guide_history(draft_id, created_at);
CREATE FUNCTION public.is_editorial_reviewer() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'developer') OR has_role(auth.uid(),'moderator'));
$$;
ALTER TABLE public.author_guide_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_guide_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.author_guide_drafts, public.author_guide_history FROM anon, authenticated;
GRANT SELECT ON public.author_guide_drafts, public.author_guide_history TO authenticated;
CREATE POLICY editorial_drafts_read ON public.author_guide_drafts FOR SELECT TO authenticated USING (
  public.is_editorial_reviewer() OR (public.has_role(auth.uid(),'author') AND EXISTS(SELECT 1 FROM public.author_profiles a WHERE a.id=author_id AND a.user_id=auth.uid()))
);
CREATE POLICY editorial_history_read ON public.author_guide_history FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.author_guide_drafts d WHERE d.id=draft_id)
);

CREATE FUNCTION public.save_author_draft(target uuid, payload jsonb, expected_revision integer, source_guide uuid DEFAULT NULL)
RETURNS public.author_guide_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a uuid; d public.author_guide_drafts; clean jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (has_role(auth.uid(),'author') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'developer')) THEN RAISE EXCEPTION 'Author access required' USING ERRCODE='42501'; END IF;
  SELECT id INTO a FROM public.author_profiles WHERE user_id=auth.uid();
  IF a IS NULL THEN RAISE EXCEPTION 'Vincule um perfil de autor à sua conta.'; END IF;
  SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO clean FROM jsonb_each(payload) WHERE key IN ('title','slug','short_description','content_markdown','category','public_category','cover_image_url','seo_title','seo_description');
  IF octet_length(clean::text)>1000000 THEN RAISE EXCEPTION 'Conteúdo muito grande.'; END IF;
  IF target IS NULL THEN
    IF source_guide IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.guides WHERE id=source_guide AND author_id=a) THEN RAISE EXCEPTION 'Not your guide' USING ERRCODE='42501'; END IF;
    INSERT INTO public.author_guide_drafts(author_id,guide_id,content) VALUES(a,source_guide,clean) RETURNING * INTO d;
  ELSE
    SELECT * INTO d FROM public.author_guide_drafts WHERE id=target FOR UPDATE;
    IF NOT FOUND OR d.author_id<>a THEN RAISE EXCEPTION 'Not your draft' USING ERRCODE='42501'; END IF;
    IF d.revision IS DISTINCT FROM expected_revision THEN RAISE EXCEPTION 'O guia mudou. Recarregue antes de salvar.'; END IF;
    IF d.status='in_review' THEN RAISE EXCEPTION 'Aguarde a revisão antes de editar.'; END IF;
    UPDATE public.author_guide_drafts SET content=clean,status='draft',revision=revision+1,updated_at=now() WHERE id=target RETURNING * INTO d;
  END IF;
  RETURN d;
END $$;

CREATE FUNCTION public.submit_author_draft(target uuid, expected_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.author_guide_drafts;
BEGIN
  SELECT * INTO d FROM public.author_guide_drafts WHERE id=target FOR UPDATE;
  IF auth.uid() IS NULL OR NOT (has_role(auth.uid(),'author') OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'developer')) OR NOT EXISTS(SELECT 1 FROM public.author_profiles WHERE id=d.author_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Not your draft' USING ERRCODE='42501'; END IF;
  IF d.revision IS DISTINCT FROM expected_revision OR d.status NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'Recarregue o guia antes de enviar.'; END IF;
  IF length(btrim(coalesce(d.content->>'title','')))<5 OR length(btrim(coalesce(d.content->>'short_description','')))<10 OR length(btrim(coalesce(d.content->>'content_markdown','')))<30 OR coalesce(d.content->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(btrim(coalesce(d.content->>'public_category','')))=0 THEN RAISE EXCEPTION 'Preencha título, endereço, resumo, categoria e conteúdo antes de enviar.'; END IF;
  UPDATE public.author_guide_drafts SET status='in_review',submitted_at=now(),updated_at=now(),revision=revision+1 WHERE id=target;
  INSERT INTO public.author_guide_history(draft_id,actor_id,action,content) VALUES(target,auth.uid(),'submitted',d.content);
END $$;

-- Moderators now review attributed content as well as their own guides.
CREATE OR REPLACE FUNCTION public.prepare_guide_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE own_author uuid;
BEGIN
  IF TG_OP='INSERT' THEN NEW.first_published_at:=CASE WHEN NEW.is_published THEN now() ELSE NULL END;
  ELSE NEW.first_published_at:=coalesce(OLD.first_published_at,CASE WHEN NEW.is_published THEN now() END); END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_editorial_reviewer() THEN
    SELECT id INTO own_author FROM public.author_profiles WHERE user_id=auth.uid();
    IF TG_OP='INSERT' OR NEW.author_id IS NULL THEN NEW.author_id:=own_author;
    ELSIF NEW.author_id IS DISTINCT FROM OLD.author_id AND NEW.author_id IS DISTINCT FROM own_author THEN RAISE EXCEPTION 'Cannot attribute a guide to another author'; END IF;
  END IF;
  IF NEW.author_id IS NOT NULL THEN SELECT display_name INTO NEW.author_name FROM public.author_profiles WHERE id=NEW.author_id; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.review_author_draft(target uuid, expected_revision integer, decision text, note text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.author_guide_drafts; owner_id uuid; published_id uuid; notification uuid; c jsonb;
BEGIN
  IF NOT public.is_editorial_reviewer() THEN RAISE EXCEPTION 'Reviewer access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO d FROM public.author_guide_drafts WHERE id=target FOR UPDATE;
  IF NOT FOUND OR d.status<>'in_review' OR d.revision IS DISTINCT FROM expected_revision THEN RAISE EXCEPTION 'A revisão mudou. Atualize a lista.'; END IF;
  SELECT user_id INTO owner_id FROM public.author_profiles WHERE id=d.author_id;
  IF owner_id=auth.uid() THEN RAISE EXCEPTION 'Outro revisor deve avaliar seu guia.' USING ERRCODE='42501'; END IF;
  IF decision NOT IN ('approve','request_changes') OR decision IS NULL THEN RAISE EXCEPTION 'Decisão inválida.'; END IF;
  IF decision='request_changes' AND length(btrim(note))<5 THEN RAISE EXCEPTION 'Explique os ajustes necessários.'; END IF;
  published_id:=d.guide_id; c:=d.content;
  IF decision='approve' THEN
    IF published_id IS NULL THEN
      INSERT INTO public.guides(title,slug,short_description,content_markdown,category,public_category,cover_image_url,seo_title,seo_description,author_id,created_by,is_published)
      VALUES(c->>'title',c->>'slug',c->>'short_description',c->>'content_markdown',coalesce(c->>'category',c->>'public_category'),c->>'public_category',nullif(c->>'cover_image_url',''),coalesce(c->>'seo_title',''),coalesce(c->>'seo_description',''),d.author_id,owner_id,true) RETURNING id INTO published_id;
    ELSE
      PERFORM 1 FROM public.guides WHERE id=published_id AND author_id=d.author_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'A autoria do guia mudou. Solicite ajuda à administração.'; END IF;
      UPDATE public.guides SET title=c->>'title',short_description=c->>'short_description',content_markdown=c->>'content_markdown',category=coalesce(c->>'category',c->>'public_category'),public_category=c->>'public_category',cover_image_url=nullif(c->>'cover_image_url',''),seo_title=coalesce(c->>'seo_title',''),seo_description=coalesce(c->>'seo_description',''),is_published=true,updated_at=now() WHERE id=published_id;
    END IF;
  END IF;
  UPDATE public.author_guide_drafts SET status=CASE WHEN decision='approve' THEN 'published' ELSE 'changes_requested' END,guide_id=published_id,feedback=coalesce(note,''),reviewed_by=auth.uid(),updated_at=now(),revision=revision+1 WHERE id=target;
  INSERT INTO public.author_guide_history(draft_id,actor_id,action,feedback,content) VALUES(target,auth.uid(),decision,coalesce(note,''),c);
  IF owner_id IS NOT NULL THEN
    INSERT INTO public.notifications(title,body) VALUES(CASE WHEN decision='approve' THEN 'Seu guia foi publicado' ELSE 'Seu guia precisa de ajustes' END,coalesce(c->>'title','Guia') || CASE WHEN note<>'' THEN ': '||note ELSE '. Acompanhe no Painel do autor.' END) RETURNING id INTO notification;
    INSERT INTO public.user_notifications(user_id,notification_id) VALUES(owner_id,notification);
  END IF;
  RETURN published_id;
END $$;

CREATE FUNCTION public.set_author_access(target uuid, account_email text, enabled boolean DEFAULT true) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE account uuid; existing uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'developer')) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  SELECT user_id INTO existing FROM public.author_profiles WHERE id=target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado.'; END IF;
  IF enabled THEN
    SELECT id INTO account FROM auth.users WHERE lower(email)=lower(btrim(account_email));
    IF account IS NULL THEN RAISE EXCEPTION 'A pessoa precisa criar uma conta com esse e-mail primeiro.'; END IF;
    IF existing IS NOT NULL AND existing<>account THEN RAISE EXCEPTION 'O perfil já está vinculado a outra conta.'; END IF;
    UPDATE public.author_profiles SET user_id=account WHERE id=target;
    INSERT INTO public.user_roles(user_id,role) VALUES(account,'author') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id=existing AND role='author';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.is_editorial_reviewer(),public.save_author_draft(uuid,jsonb,integer,uuid),public.submit_author_draft(uuid,integer),public.review_author_draft(uuid,integer,text,text),public.set_author_access(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_editorial_reviewer(),public.save_author_draft(uuid,jsonb,integer,uuid),public.submit_author_draft(uuid,integer),public.review_author_draft(uuid,integer,text,text),public.set_author_access(uuid,text,boolean) TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('author-guide-assets','author-guide-assets',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY author_assets_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='author-guide-assets' AND (storage.foldername(name))[1]=auth.uid()::text AND (public.has_role(auth.uid(),'author') OR public.is_editorial_reviewer()));
CREATE POLICY author_assets_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='author-guide-assets' AND (storage.foldername(name))[1]=auth.uid()::text);
-- No author UPDATE/DELETE policy: published revisions keep their existing images.
