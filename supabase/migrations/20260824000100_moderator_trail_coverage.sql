-- Moderators may see full published guides and their own drafts. Coverage of
-- other authors' drafts is exposed only as an anonymous aggregate.
DROP POLICY IF EXISTS "Public reads published guides" ON public.guides;
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

CREATE OR REPLACE FUNCTION public.moderator_trail_coverage()
RETURNS TABLE(subject text, stage text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH classified AS (
    SELECT
      COALESCE(
        NULLIF(flow_data #>> '{inputs,assuntoPrincipal}', ''),
        NULLIF(flow_data #>> '{inputs,trailSubject}', ''),
        NULLIF(flow_data #>> '{inputs,editorialSubject}', ''),
        NULLIF(flow_data #>> '{inputs,subject}', ''),
        CASE
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%curso gratuito%', '%cursos gratuitos%', '%certificado%', '%plataforma de curso%']) THEN 'Cursos gratuitos'
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%hora complementar%', '%horas complementares%', '%atividade complementar%']) THEN 'Horas complementares'
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%carteirinha%', '%documento do estudante%', '%meia-entrada%']) THEN 'Carteirinha de estudante'
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%concurso%', '%edital%', '%banca%']) THEN 'Concurso público'
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%enem%', '%sisu%', '%prouni%', '%redação%']) THEN 'ENEM'
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%currículo%', '%curriculo%', '%linkedin%', '%perfil profissional%']) THEN 'Currículo'
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%inteligência artificial%', '%inteligencia artificial%', '%chatgpt%']) THEN 'Inteligência artificial'
          WHEN lower(title || ' ' || short_description || ' ' || category || ' ' || public_category) LIKE ANY (ARRAY['%benefício social%', '%beneficio social%', '%cadúnico%', '%cadunico%', '%bolsa família%']) THEN 'Benefícios sociais'
        END
      ) AS subject,
      COALESCE(
        NULLIF(flow_data #>> '{inputs,tipo}', ''),
        NULLIF(flow_data #>> '{inputs,trailStage}', ''),
        NULLIF(flow_data #>> '{inputs,stage}', ''),
        CASE
          WHEN lower(title || ' ' || short_description) LIKE ANY (ARRAY['%como conseguir%', '%como encontrar%', '%o que é%', '%o que são%', '%para que serve%']) THEN 'busca'
          WHEN lower(title || ' ' || short_description) LIKE ANY (ARRAY['%melhores%', '%sites%', '%plataformas%', '%opções%', '%opcoes%', '%onde encontrar%']) THEN 'exploracao'
          WHEN lower(title || ' ' || short_description) LIKE ANY (ARRAY['%como escolher%', '%vale mais%', '%melhor para começar%', '%comparar%']) THEN 'decisao'
          WHEN lower(title || ' ' || short_description) LIKE ANY (ARRAY['%é aceito%', '%e aceito%', '%vale para%', '%funciona%', '%é confiável%', '%e confiavel%']) THEN 'validacao'
          WHEN lower(title || ' ' || short_description) LIKE ANY (ARRAY['%ajudar no currículo%', '%ajudar no curriculo%', '%benefícios%', '%beneficios%', '%fortalecer%', '%usar para%']) THEN 'expansao'
          WHEN lower(title || ' ' || short_description) LIKE ANY (ARRAY['%como colocar%', '%como baixar%', '%passo a passo%', '%como usar%', '%como fazer%']) THEN 'aplicacao'
        END
      ) AS stage,
      is_published
    FROM public.guides
  )
  SELECT
    classified.subject,
    classified.stage,
    CASE WHEN bool_or(classified.is_published) THEN 'published' ELSE 'draft' END AS status
  FROM classified
  WHERE classified.subject IS NOT NULL
    AND classified.stage IN ('busca', 'exploracao', 'decisao', 'validacao', 'expansao', 'aplicacao')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'moderator'::public.app_role)
    )
  GROUP BY classified.subject, classified.stage
  ORDER BY classified.subject, classified.stage;
$$;

REVOKE ALL ON FUNCTION public.moderator_trail_coverage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderator_trail_coverage() TO authenticated;
