import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import {
  createToolAction,
  deleteToolAction,
  reorderToolsAction,
  updateToolAction,
} from '@/app/actions/tools';
import { devLog } from '@/lib/dev-log';

export interface Tool {
  id: string;
  name: string;
  slug?: string | null;
  description: string;
  url?: string;
  attachment_url?: string;
  icon_url?: string;
  tags: string[];
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  // Featured fields
  is_featured: boolean;
  featured_indefinite: boolean;
  featured_start?: string | null;
  featured_end?: string | null;
  // Editorial fields (legacy — kept for backwards compatibility, hidden in UI)
  what_is?: string | null;
  who_for?: string | null;
  how_helps?: string | null;
  pros?: string | null;
  cons?: string | null;
  extra_markdown?: string | null;
  // SEO
  seo_title?: string | null;
  seo_description?: string | null;
  // New editorial fields (guide-style)
  content_markdown?: string | null;
  cover_image_url?: string | null;
  cta_top_label?: string | null;
  cta_top_url?: string | null;
  cta_top_text?: string | null;
  cta_middle_label?: string | null;
  cta_middle_url?: string | null;
  cta_middle_text?: string | null;
  cta_final_label?: string | null;
  cta_final_url?: string | null;
  cta_final_text?: string | null;
  internal_links?: Array<{ label: string; url: string; imageUrl?: string | null; imageSource?: string | null; imagePath?: string | null }>;
}

export interface UseToolsOptions {
  includeInvisible?: boolean;
  page?: number;
  pageSize?: number;
  tags?: string[];
}

export interface ToolsResult {
  tools: Tool[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const EMPTY_TOOLS: Tool[] = [];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; context?: { message?: unknown } };
    if (typeof record.context?.message === 'string') return record.context.message;
    if (typeof record.message === 'string') return record.message;
  }
  return fallback;
};

// --- Fetch functions ---

async function fetchPublicTools(page: number, pageSize: number, tags: string[]) {
  let countQuery = supabase
    .from('tools_public')
    .select('*', { count: 'exact', head: true });

  if (tags.length > 0) {
    countQuery = countQuery.overlaps('tags', tags);
  }

  const { count: totalCount, error: countError } = await countQuery;
  if (countError) throw countError;

  let featuredCount = 0;
  if (page > 1) {
    let featuredCountQuery = supabase
      .from('tools_public')
      .select('*', { count: 'exact', head: true })
      .eq('is_featured', true);

    if (tags.length > 0) {
      featuredCountQuery = featuredCountQuery.overlaps('tags', tags);
    }

    const { count, error } = await featuredCountQuery;
    if (error) throw error;
    featuredCount = count || 0;
  }

  let query = supabase
    .from('tools_public')
    .select('*');

  if (tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  if (page > 1) {
    query = query.eq('is_featured', false);
  }

  const from = Math.max(0, (page - 1) * pageSize - featuredCount);
  const to = from + pageSize - 1;

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .range(from, to);

  if (error) throw error;
  return { tools: (data || []) as Tool[], total: totalCount || 0 };
}

async function fetchAdminTools() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Admin access requires authentication');

  const { data, error } = await supabase.functions.invoke('admin-tools', {
    body: { action: 'list' }
  });

  if (error) throw error;
  return (data || []) as Tool[];
}

// --- Hook ---

export const useTools = (options: UseToolsOptions = {}) => {
  const { includeInvisible = false, page = 1, pageSize = 12, tags = [] } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const sortedTagsString = [...tags].sort().join(',');

  // Public query
  const publicQuery = useQuery({
    queryKey: ['tools_public_v2', page, pageSize, sortedTagsString],
    queryFn: () => fetchPublicTools(page, pageSize, tags),
    enabled: !includeInvisible,
    placeholderData: (prev) => prev,
  });

  // Admin query (strict overrides)
  const adminQuery = useQuery({
    queryKey: ['tools_admin'],
    queryFn: fetchAdminTools,
    enabled: includeInvisible && !!user,
    staleTime: 90_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Derive values based on mode
  const isAdmin = includeInvisible;
  const tools = isAdmin ? (adminQuery.data ?? EMPTY_TOOLS) : (publicQuery.data?.tools ?? EMPTY_TOOLS);
  const total = isAdmin ? (adminQuery.data?.length || 0) : (publicQuery.data?.total || 0);
  const loading = isAdmin ? adminQuery.isLoading : publicQuery.isLoading;
  const totalPages = Math.ceil(total / pageSize);

  // --- Invalidation helper ---
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tools_public'] });
    queryClient.invalidateQueries({ queryKey: ['tools_public_v2'] });
    queryClient.invalidateQueries({ queryKey: ['tools_admin'] });
  };

  // --- Mutations ---

  const addTool = async (tool: Omit<Tool, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'sort_order'>) => {
    try {
      const { data, error } = await createToolAction(tool);
      if (error) throw new Error(error);

      invalidateAll();
      toast({ title: "Sucesso", description: "Ferramenta adicionada com sucesso!" });
      return { data, error: null };
    } catch (err: unknown) {
      const message = getErrorMessage(err, "N?o foi poss?vel adicionar a ferramenta.");
      toast({ title: "Erro", description: message, variant: "destructive" });
      return { data: null, error: message };
    }
  };

  const updateTool = async (id: string, updates: Partial<Tool>) => {
    try {
      const { data, error } = await updateToolAction({ id, ...updates });
      if (error) throw new Error(error);

      invalidateAll();
      toast({ title: "Sucesso", description: "Ferramenta atualizada com sucesso!" });
      return { data, error: null };
    } catch (err: unknown) {
      const message = getErrorMessage(err, "N?o foi poss?vel atualizar a ferramenta.");
      toast({ title: "Erro", description: message, variant: "destructive" });
      return { data: null, error: message };
    }
  };

  const deleteTool = async (id: string) => {
    try {
      const { error } = await deleteToolAction(id);
      if (error) throw new Error(error);

      invalidateAll();
      toast({ title: "Sucesso", description: "Ferramenta removida com sucesso!" });
      return { error: null };
    } catch (err: unknown) {
      const message = getErrorMessage(err, "N?o foi poss?vel remover a ferramenta.");
      toast({ title: "Erro", description: message, variant: "destructive" });
      return { error: message };
    }
  };

  const toggleVisible = async (id: string, currentState: boolean) => {
    return updateTool(id, { is_visible: !currentState });
  };

  const reorderTools = async (reorderedTools: Tool[]) => {
    const startTime = Date.now();
    devLog('[Tools Reorder] Starting reorder operation', {
      count: reorderedTools.length,
      items: reorderedTools.map((t, idx) => ({ id: t.id, name: t.name, newOrder: idx })),
    });

    const previousAdmin = queryClient.getQueryData<Tool[]>(['tools_admin']);
    queryClient.setQueryData(['tools_admin'], reorderedTools);

    try {
      const { error } = await reorderToolsAction(
        reorderedTools.map((t, index) => ({ id: t.id, sort_order: index })),
      );
      if (error) throw new Error(error);

      const duration = Date.now() - startTime;
      devLog('[Tools Reorder] Success', { duration: `${duration}ms` });

      invalidateAll();
      toast({ title: 'Ordem atualizada', description: 'A ordem das ferramentas foi salva com sucesso.' });
      return { error: null };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'N?o foi poss?vel salvar a nova ordem. Tente novamente.');
      console.error('[Tools Reorder] Error', { error: message, duration: `${Date.now() - startTime}ms` });

      if (previousAdmin) {
        queryClient.setQueryData(['tools_admin'], previousAdmin);
      }

      toast({ title: 'Erro ao salvar ordem', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  const refetch = isAdmin ? adminQuery.refetch : publicQuery.refetch;

  return {
    tools,
    total,
    loading,
    page,
    pageSize,
    totalPages,
    addTool,
    updateTool,
    deleteTool,
    toggleVisible,
    reorderTools,
    refetch,
  };
};
