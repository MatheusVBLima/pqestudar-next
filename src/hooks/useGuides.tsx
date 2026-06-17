import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables } from '@/integrations/supabase/types';

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

const GUIDES_KEY = ['guides'];
const GUIDE_LIST_SELECT =
  'id,internal_code,title,slug,category,public_category,short_description,is_published,is_featured,sort_order,author_name,cover_image_url,created_at,updated_at';

export function useGuides(includeUnpublished = false) {
  return useQuery({
    queryKey: [...GUIDES_KEY, includeUnpublished ? 'all' : 'published'],
    queryFn: async () => {
      let query = supabase
        .from('guides')
        .select(includeUnpublished ? '*' : GUIDE_LIST_SELECT)
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
      if (!Array.isArray(guides)) continue;
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

