import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { Tool } from './useTools';
import { getErrorMessage } from '@/lib/error-message';
import { revalidateCurationsAction } from '@/app/actions/revalidate';
import { getCurationPatternSignature } from '@/lib/curation-auto-generator';

export interface CurationPage {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CurationPageItem {
  id: string;
  page_id: string;
  tool_id: string | null;
  item_type: CurationItemType | null;
  item_id: string | null;
  order: number;
  created_at: string;
}

export type CurationItemType = 'tool' | 'contest' | 'guide';

export interface CurationContentItem {
  id: string;
  type: CurationItemType;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  imageUrl?: string | null;
  category?: string | null;
  tags?: string[];
  updatedAt?: string | null;
  raw?: unknown;
}

export interface CurationPageWithItems extends CurationPage {
  items: (CurationPageItem & { item_type: CurationItemType; content: CurationContentItem; tool?: Tool })[];
}

export type CurationItemInput = { type: CurationItemType; id: string };

function getDuplicateAwareMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  return message.includes('duplicate') ? 'JÃ¡ existe uma curadoria com este slug.' : message;
}

function normalizeItemType(item: Partial<CurationPageItem>): CurationItemType {
  return (item.item_type || (item.tool_id ? 'tool' : 'tool')) as CurationItemType;
}

function normalizeItemId(item: Partial<CurationPageItem>): string | null {
  return item.item_id || item.tool_id || null;
}

function toolToContent(tool: Tool): CurationContentItem {
  return {
    id: tool.id,
    type: 'tool',
    title: tool.name,
    description: tool.description,
    href: tool.attachment_url || tool.url || `/ferramentas/${tool.slug || tool.id}`,
    actionLabel: tool.attachment_url ? 'Fazer download' : 'Acessar',
    imageUrl: tool.icon_url || null,
    category: tool.tags?.[0] || null,
    tags: tool.tags || [],
    updatedAt: tool.updated_at || tool.created_at,
    raw: tool,
  };
}

function contestToContent(contest: {
  id: string | null;
  titulo: string | null;
  slug: string | null;
  resumo_editorial: string | null;
  categoria: string | null;
  situacao: string | null;
  tipo: string | null;
  abrangencia: string | null;
  escolaridade: string | null;
  escolaridades?: string[] | null;
  updated_at?: string | null;
  data_publicacao?: string | null;
}): CurationContentItem | null {
  if (!contest.id || !contest.titulo || !contest.slug) return null;
  return {
    id: contest.id,
    type: 'contest',
    title: contest.titulo,
    description: contest.resumo_editorial || [contest.tipo, contest.abrangencia, contest.situacao].filter(Boolean).join(' • '),
    href: `/concursos/${contest.slug}`,
    actionLabel: 'Ver concurso',
    category: contest.categoria || contest.situacao || null,
    tags: [contest.tipo, contest.abrangencia, contest.escolaridade, ...(contest.escolaridades || [])].filter(Boolean) as string[],
    updatedAt: contest.updated_at || contest.data_publicacao || null,
    raw: contest,
  };
}

function guideToContent(guide: {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  public_category?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
  updated_at?: string | null;
}): CurationContentItem {
  return {
    id: guide.id,
    type: 'guide',
    title: guide.title,
    description: guide.short_description,
    href: `/guias/${guide.slug}`,
    actionLabel: 'Ler guia',
    imageUrl: guide.cover_image_url || null,
    category: guide.public_category || guide.category || null,
    tags: [guide.public_category, guide.category].filter(Boolean) as string[],
    updatedAt: guide.updated_at || null,
    raw: guide,
  };
}

async function resolveCurationItems(
  items: CurationPageItem[] | null | undefined,
  toolsTable: 'tools' | 'tools_public',
) {
  const rows = items || [];
  const idsByType = rows.reduce<Record<CurationItemType, string[]>>(
    (acc, item) => {
      const type = normalizeItemType(item);
      const itemId = normalizeItemId(item);
      if (itemId) acc[type].push(itemId);
      return acc;
    },
    { tool: [], contest: [], guide: [] },
  );

  const toolsQuery = idsByType.tool.length
    ? toolsTable === 'tools'
      ? supabase.from('tools').select('*').in('id', idsByType.tool)
      : supabase.from('tools_public').select('*').in('id', idsByType.tool)
    : Promise.resolve({ data: [], error: null });

  const [toolsResult, contestsResult, guidesResult] = await Promise.all([
    toolsQuery,
    idsByType.contest.length
      ? supabase
          .from('oportunidades_public')
          .select('id, titulo, slug, resumo_editorial, categoria, situacao, tipo, abrangencia, escolaridade, escolaridades, updated_at, data_publicacao')
          .in('id', idsByType.contest)
      : Promise.resolve({ data: [], error: null }),
    idsByType.guide.length
      ? supabase
          .from('guides')
          .select('id, title, slug, short_description, public_category, category, cover_image_url, updated_at')
          .in('id', idsByType.guide)
          .eq('is_published', true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (toolsResult.error) throw toolsResult.error;
  if (contestsResult.error) throw contestsResult.error;
  if (guidesResult.error) throw guidesResult.error;

  const contentMap = new Map<string, CurationContentItem>();
  for (const tool of (toolsResult.data || []) as Tool[]) {
    contentMap.set(`tool:${tool.id}`, toolToContent(tool));
  }
  for (const contest of contestsResult.data || []) {
    const content = contestToContent(contest);
    if (content) contentMap.set(`contest:${content.id}`, content);
  }
  for (const guide of guidesResult.data || []) {
    const content = guideToContent(guide);
    contentMap.set(`guide:${content.id}`, content);
  }

  return rows
    .map((item) => {
      const item_type = normalizeItemType(item);
      const itemId = normalizeItemId(item);
      const content = itemId ? contentMap.get(`${item_type}:${itemId}`) : undefined;
      if (!content) return null;
      return {
        ...item,
        item_type,
        item_id: itemId,
        content,
        tool: item_type === 'tool' ? (content.raw as Tool) : undefined,
      };
    })
    .filter(Boolean) as CurationPageWithItems['items'];
}

function toItemsData(pageId: string, items: CurationItemInput[]) {
  return items.map((item, index) => ({
    page_id: pageId,
    tool_id: item.type === 'tool' ? item.id : null,
    item_type: item.type,
    item_id: item.id,
    order: index,
  }));
}

// Query keys
export const curationKeys = {
  all: ['curations'] as const,
  lists: () => [...curationKeys.all, 'list'] as const,
  list: (filters?: { status?: string }) => [...curationKeys.lists(), filters] as const,
  details: () => [...curationKeys.all, 'detail'] as const,
  detail: (id: string) => [...curationKeys.details(), id] as const,
  bySlug: (slug: string) => [...curationKeys.all, 'slug', slug] as const,
};

// Hook para buscar curadoria pÃºblica por slug
export const useCurationBySlug = (slug: string) => {
  return useQuery({
    queryKey: curationKeys.bySlug(slug),
    queryFn: async () => {
      // Buscar página (RLS já filtra por published)
      const { data: page, error: pageError } = await supabase
        .from('curation_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (pageError || !page) {
        throw new Error('Curadoria não encontrada');
      }

      const { data: items, error: itemsError } = await supabase
        .from('curation_page_items')
        .select('*')
        .eq('page_id', page.id)
        .order('order', { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...page,
        items: await resolveCurationItems(items as CurationPageItem[], 'tools_public'),
      } as CurationPageWithItems;
    },
    enabled: !!slug,
    retry: false,
  });
};

// Hook para listar curadorias (admin)
export const useCurationsList = (filters?: { status?: string; search?: string }) => {
  return useQuery({
    queryKey: curationKeys.list(filters),
    staleTime: 90_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase
        .from('curation_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CurationPage[];
    },
  });
};

// Hook para buscar curadoria por ID (admin)
export const useCurationById = (id: string) => {
  return useQuery({
    queryKey: curationKeys.detail(id),
    staleTime: 90_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Buscar página e itens em paralelo (sem waterfall)
      const [{ data: page, error: pageError }, { data: items, error: itemsError }] = await Promise.all([
        supabase
          .from('curation_pages')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('curation_page_items')
          .select('*')
          .eq('page_id', id)
          .order('order', { ascending: true }),
      ]);

      if (pageError) throw pageError;
      if (itemsError) throw itemsError;

      return {
        ...page,
        items: await resolveCurationItems(items as CurationPageItem[], 'tools'),
      } as CurationPageWithItems;
    },
    enabled: !!id && id !== 'new',
  });
};

export const useCurationAutomationSources = () => {
  return useQuery({
    queryKey: [...curationKeys.all, 'automation-sources'],
    staleTime: 120_000,
    queryFn: async () => {
      const [toolsResult, contestsResult, guidesResult] = await Promise.all([
        supabase
          .from('tools_public')
          .select('*')
          .order('sort_order', { ascending: true })
          .limit(80),
        supabase
          .from('oportunidades_public')
          .select('id, titulo, slug, resumo_editorial, categoria, situacao, tipo, abrangencia, escolaridade, escolaridades, updated_at, data_publicacao')
          .order('data_publicacao', { ascending: false })
          .limit(80),
        supabase
          .from('guides')
          .select('id, title, slug, short_description, public_category, category, cover_image_url, updated_at')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .limit(80),
      ]);

      if (toolsResult.error) throw toolsResult.error;
      if (contestsResult.error) throw contestsResult.error;
      if (guidesResult.error) throw guidesResult.error;

      const tools = ((toolsResult.data || []) as Tool[]).map(toolToContent);
      const contests = (contestsResult.data || [])
        .map(contestToContent)
        .filter(Boolean) as CurationContentItem[];
      const guides = (guidesResult.data || []).map(guideToContent);

      return [...tools, ...contests, ...guides];
    },
  });
};

export const useRecentCurationPatterns = () => {
  return useQuery({
    queryKey: [...curationKeys.all, 'recent-patterns'],
    staleTime: 90_000,
    queryFn: async () => {
      const { data: pages, error: pagesError } = await supabase
        .from('curation_pages')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(6);

      if (pagesError) throw pagesError;
      const pageIds = pages?.map((page) => page.id) || [];
      if (pageIds.length === 0) return [] as string[];

      const { data: items, error: itemsError } = await supabase
        .from('curation_page_items')
        .select('page_id, tool_id, item_type, order')
        .in('page_id', pageIds)
        .order('order', { ascending: true });

      if (itemsError) throw itemsError;

      const byPage = new Map<string, Array<{ item_type?: string | null; tool_id?: string | null }>>();
      for (const item of items || []) {
        const pageItems = byPage.get(item.page_id) || [];
        pageItems.push(item);
        byPage.set(item.page_id, pageItems);
      }

      return pageIds
        .map((pageId) => byPage.get(pageId) || [])
        .filter((pageItems) => pageItems.length > 0)
        .map(getCurationPatternSignature);
    },
  });
};

// Hook para mutations de curadoria
export const useCurationMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      slug: string;
      description?: string;
      status: 'draft' | 'published';
      toolIds: string[];
      items?: CurationItemInput[];
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('NÃ£o autenticado');

      // Criar pÃ¡gina
      const pageData: TablesInsert<'curation_pages'> = {
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        status: data.status,
        created_by: session.session.user.id,
        published_at: data.status === 'published' ? new Date().toISOString() : null,
      };

      const { data: page, error: pageError } = await supabase
        .from('curation_pages')
        .insert(pageData)
        .select()
        .single();

      if (pageError) throw pageError;

      // Criar items
      const itemInputs = data.items || data.toolIds.map((id) => ({ type: 'tool' as const, id }));
      if (itemInputs.length > 0) {
        const itemsData = toItemsData(page.id, itemInputs);

        const { error: itemsError } = await supabase
          .from('curation_page_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      return page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curationKeys.all });
      void revalidateCurationsAction();
      toast({ title: 'Sucesso', description: 'Curadoria criada com sucesso!' });
    },
    onError: (error: unknown) => {
      const message = getDuplicateAwareMessage(error, 'Erro ao criar curadoria.');
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      title: string;
      slug: string;
      description?: string;
      status: 'draft' | 'published';
      toolIds: string[];
      items?: CurationItemInput[];
    }) => {
      // Atualizar pÃ¡gina
      const updateData: TablesUpdate<'curation_pages'> = {
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        status: data.status,
      };

      // Se publicando agora, definir published_at
      if (data.status === 'published') {
        const { data: existing } = await supabase
          .from('curation_pages')
          .select('published_at')
          .eq('id', data.id)
          .single();
        
        if (!existing?.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { error: pageError } = await supabase
        .from('curation_pages')
        .update(updateData)
        .eq('id', data.id);

      if (pageError) throw pageError;

      // Deletar items antigos e criar novos
      await supabase
        .from('curation_page_items')
        .delete()
        .eq('page_id', data.id);

      const itemInputs = data.items || data.toolIds.map((id) => ({ type: 'tool' as const, id }));
      if (itemInputs.length > 0) {
        const itemsData = toItemsData(data.id, itemInputs);

        const { error: itemsError } = await supabase
          .from('curation_page_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      return { id: data.id };
    },
      onSuccess: (_result) => {
      queryClient.invalidateQueries({ queryKey: curationKeys.all });
      void revalidateCurationsAction();
      toast({ title: 'Sucesso', description: 'Curadoria atualizada com sucesso!' });
    },
    onError: (error: unknown) => {
      const message = getDuplicateAwareMessage(error, 'Erro ao atualizar curadoria.');
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curation_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curationKeys.all });
      void revalidateCurationsAction();
      toast({ title: 'Sucesso', description: 'Curadoria excluÃ­da com sucesso!' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro', description: getErrorMessage(error, 'Erro ao excluir curadoria.'), variant: 'destructive' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      // Buscar curadoria original
      const { data: original, error: fetchError } = await supabase
        .from('curation_pages')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Buscar items
      const { data: items } = await supabase
        .from('curation_page_items')
        .select('tool_id, item_type, item_id, order')
        .eq('page_id', id)
        .order('order', { ascending: true });

      // Gerar novo slug Ãºnico
      const baseSlug = `${original.slug}-copia`;
      let newSlug = baseSlug;
      let counter = 1;

      while (true) {
        const { data: existing } = await supabase
          .from('curation_pages')
          .select('id')
          .eq('slug', newSlug)
          .single();

        if (!existing) break;
        newSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Criar cÃ³pia
      const { data: session } = await supabase.auth.getSession();
      
      const { data: newPage, error: createError } = await supabase
        .from('curation_pages')
        .insert({
          title: `${original.title} (cÃ³pia)`,
          slug: newSlug,
          description: original.description,
          status: 'draft' as const,
          created_by: session?.session?.user?.id || null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copiar items
      if (items && items.length > 0) {
        const newItems = items.map((item, index) => ({
          page_id: newPage.id,
          tool_id: item.tool_id,
          item_type: item.item_type || (item.tool_id ? 'tool' : 'tool'),
          item_id: item.item_id || item.tool_id,
          order: index,
        }));

        await supabase.from('curation_page_items').insert(newItems);
      }

      return newPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curationKeys.all });
      void revalidateCurationsAction();
      toast({ title: 'Sucesso', description: 'Curadoria duplicada com sucesso!' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro', description: getErrorMessage(error, 'Erro ao duplicar curadoria.'), variant: 'destructive' });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    duplicate: duplicateMutation,
  };
};

// Hook para verificar unicidade do slug
export const useCheckSlugUnique = () => {
  return async (slug: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from('curation_pages')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query.single();
    return !data;
  };
};

