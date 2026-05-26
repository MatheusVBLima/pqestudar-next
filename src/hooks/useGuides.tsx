import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { revalidateGuidesAction } from '@/app/actions/revalidate';

export interface Guide {
  id: string;
  internal_code: string;
  title: string;
  slug: string;
  category: string;          // Categoria Interna (editorial/IA)
  public_category: string;   // Categoria Pública (badge visual)
  short_description: string;
  content_markdown: string;
  seo_title: string;
  seo_description: string;
  cta_top_label: string | null;
  cta_top_url: string | null;
  cta_middle_label: string | null;
  cta_middle_url: string | null;
  cta_final_label: string | null;
  cta_final_url: string | null;
  cta_top_text: string | null;
  cta_middle_text: string | null;
  cta_final_text: string | null;
  internal_links: Array<{
    label: string;
    url: string;
    imageUrl?: string | null;
    imageSource?: 'url' | 'upload' | null;
    imagePath?: string | null;
  }>;
  is_published: boolean;
  is_featured: boolean;
  views_count?: number | null;
  sort_order: number;
  author_name: string;
  cover_image_url: string | null;
  flow_data: Json | null;
  created_at: string;
  updated_at: string;
}

export type RelatedTool = Pick<Tables<'tools_public'>, 'id' | 'name' | 'description' | 'url' | 'icon_url'>;
export type RelatedContest = Pick<Tables<'oportunidades_public'>, 'id' | 'titulo' | 'slug' | 'situacao' | 'tipo'>;
export type RelatedGuide = Pick<Tables<'guides'>, 'id' | 'title' | 'slug' | 'short_description' | 'category'>;

type GuideToolRelation = Pick<Tables<'guide_related_tools'>, 'tool_id'>;
type GuideContestRelation = Pick<Tables<'guide_related_contests'>, 'contest_id'>;
type GuideGuideRelation = Pick<Tables<'guide_related_guides'>, 'related_guide_id'>;
type GuidePreview = Pick<Tables<'guides'>, 'slug' | 'cover_image_url' | 'category' | 'title'>;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro inesperado';

const GUIDES_KEY = ['guides'];

export function useGuides(includeUnpublished = false) {
  return useQuery({
    queryKey: [...GUIDES_KEY, includeUnpublished ? 'all' : 'published'],
    queryFn: async () => {
      let query = supabase
        .from('guides')
        .select('*')
        .order('sort_order', { ascending: true });

      // When not including unpublished, RLS already filters — but explicit is safer
      if (!includeUnpublished) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Guide[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useGuideBySlug(slug: string | undefined) {
  const queryClient = useQueryClient();
  const placeholderGuide = useMemo(() => {
    if (!slug) return undefined;
    const cachedGuides = queryClient.getQueriesData<Guide[]>({ queryKey: GUIDES_KEY });
    for (const [, guides] of cachedGuides) {
      const found = guides?.find((guide) => guide.slug === slug);
      if (found) return found;
    }
    return undefined;
  }, [queryClient, slug]);

  return useQuery({
    queryKey: [...GUIDES_KEY, 'slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Guide | null;
    },
    enabled: !!slug,
    placeholderData: placeholderGuide,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGuideRelatedTools(guideId: string | undefined) {
  return useQuery({
    queryKey: ['guide_related_tools', guideId],
    queryFn: async () => {
      if (!guideId) return [];
      const { data, error } = await supabase
        .from('guide_related_tools')
        .select('tool_id')
        .eq('guide_id', guideId);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const toolIds = (data as GuideToolRelation[]).map((r) => r.tool_id);
      const { data: tools, error: toolsError } = await supabase
        .from('tools_public')
        .select('id, name, description, url, icon_url')
        .in('id', toolIds);
      if (toolsError) throw toolsError;
      return (tools ?? []) as RelatedTool[];
    },
    enabled: !!guideId,
  });
}

export function useGuideRelatedContests(guideId: string | undefined) {
  return useQuery({
    queryKey: ['guide_related_contests', guideId],
    queryFn: async () => {
      if (!guideId) return [];
      const { data, error } = await supabase
        .from('guide_related_contests')
        .select('contest_id')
        .eq('guide_id', guideId);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const ids = (data as GuideContestRelation[]).map((r) => r.contest_id);
      const { data: contests, error: cErr } = await supabase
        .from('oportunidades_public')
        .select('id, titulo, slug, situacao, tipo')
        .in('id', ids);
      if (cErr) throw cErr;
      return (contests ?? []) as RelatedContest[];
    },
    enabled: !!guideId,
  });
}

export function useGuideRelatedGuides(guideId: string | undefined) {
  return useQuery({
    queryKey: ['guide_related_guides', guideId],
    queryFn: async () => {
      if (!guideId) return [];
      const { data, error } = await supabase
        .from('guide_related_guides')
        .select('related_guide_id')
        .eq('guide_id', guideId);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const ids = (data as GuideGuideRelation[]).map((r) => r.related_guide_id);
      const { data: guides, error: gErr } = await supabase
        .from('guides')
        .select('id, title, slug, short_description, category')
        .in('id', ids)
        .eq('is_published', true);
      if (gErr) throw gErr;
      return (guides ?? []) as RelatedGuide[];
    },
    enabled: !!guideId,
  });
}

// Resolve cover images for internal links pointing to /guias/:slug
export function useGuideLinkPreviews(
  links: Array<{ label: string; url: string; imageUrl?: string | null }>
) {
  const guideSlugs = links
    .filter((l) => l.url.startsWith('/guias/'))
    .map((l) => l.url.replace('/guias/', '').split('?')[0].split('#')[0])
    .filter(Boolean);

  const uniqueSlugs = [...new Set(guideSlugs)];

  const { data: guidesMap } = useQuery({
    queryKey: ['guide_link_previews', uniqueSlugs.join(',')],
    queryFn: async () => {
      if (uniqueSlugs.length === 0) return {} as Record<string, { cover_image_url: string | null; category: string; title: string }>;
      const { data, error } = await supabase
        .from('guides')
        .select('slug, cover_image_url, category, title')
        .in('slug', uniqueSlugs)
        .eq('is_published', true);
      if (error) throw error;
      const map: Record<string, { cover_image_url: string | null; category: string; title: string }> = {};
      for (const g of (data ?? []) as GuidePreview[]) {
        map[g.slug] = { cover_image_url: g.cover_image_url, category: g.category, title: g.title };
      }
      return map;
    },
    enabled: uniqueSlugs.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return links.map((link) => {
    if (link.url.startsWith('/guias/')) {
      const slug = link.url.replace('/guias/', '').split('?')[0].split('#')[0];
      const matched = guidesMap?.[slug];
      return {
        ...link,
        type: 'guide' as const,
        coverImageUrl: matched?.cover_image_url ?? null,
        category: matched?.category ?? null,
      };
    }
    return { ...link, type: 'other' as const, coverImageUrl: null, category: null };
  });
}

// Admin mutations
export function useGuidesMutations() {
  const queryClient = useQueryClient();

  const invalidate = (slug?: string) => {
    queryClient.invalidateQueries({ queryKey: GUIDES_KEY });
    void revalidateGuidesAction(slug);
  };

  const createGuide = useMutation({
    mutationFn: async (guide: TablesInsert<'guides'>) => {
      const { data, error } = await supabase
        .from('guides')
        .insert(guide)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Guide;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Guia criado com sucesso' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar guia', description: getErrorMessage(err), variant: 'destructive' });
    },
  });

  const updateGuide = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'guides'> & { id: string }) => {
      const { error } = await supabase
        .from('guides')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Guia atualizado' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao atualizar guia', description: getErrorMessage(err), variant: 'destructive' });
    },
  });

  const deleteGuide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guides')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Guia excluído' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao excluir guia', description: getErrorMessage(err), variant: 'destructive' });
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('guides')
        .update({ is_published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast({ title: vars.is_published ? 'Guia publicado' : 'Guia despublicado' });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from('guides')
        .update({ is_featured })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast({ title: vars.is_featured ? 'Guia em destaque' : 'Destaque removido' });
    },
  });

  return {
    createGuide,
    updateGuide,
    deleteGuide,
    togglePublished,
    toggleFeatured,
  };
}
