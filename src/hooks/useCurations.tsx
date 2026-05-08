import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { Tool } from './useTools';
import { getErrorMessage } from '@/lib/error-message';
import { revalidateCurationsAction } from '@/app/actions/revalidate';

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
  tool_id: string;
  order: number;
  created_at: string;
}

export interface CurationPageWithItems extends CurationPage {
  items: (CurationPageItem & { tool: Tool })[];
}

function getDuplicateAwareMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  return message.includes('duplicate') ? 'JÃ¡ existe uma curadoria com este slug.' : message;
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

      // Buscar items da página
      const { data: items, error: itemsError } = await supabase
        .from('curation_page_items')
        .select('*')
        .eq('page_id', page.id)
        .order('order', { ascending: true });

      if (itemsError) throw itemsError;

      // Buscar ferramentas associadas
      const toolIds = items?.map(item => item.tool_id) || [];
      
      if (toolIds.length === 0) {
        return {
          ...page,
          items: []
        } as CurationPageWithItems;
      }

      const { data: tools, error: toolsError } = await supabase
        .from('tools_public')
        .select('*')
        .in('id', toolIds);

      if (toolsError) throw toolsError;

      const toolsMap = new Map(tools?.map(t => [t.id, t]) || []);

      return {
        ...page,
        items: items?.map(item => ({
          ...item,
          tool: toolsMap.get(item.tool_id)
        })).filter(item => item.tool) || []
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

      // Buscar ferramentas
      const toolIds = items?.map(item => item.tool_id) || [];
      
      if (toolIds.length === 0) {
        return { ...page, items: [] } as CurationPageWithItems;
      }

      // Admin pode ver todas as ferramentas
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('*')
        .in('id', toolIds);

      if (toolsError) throw toolsError;

      const toolsMap = new Map(tools?.map(t => [t.id, t]) || []);

      return {
        ...page,
        items: items?.map(item => ({
          ...item,
          tool: toolsMap.get(item.tool_id)
        })).filter(item => item.tool) || []
      } as CurationPageWithItems;
    },
    enabled: !!id && id !== 'new',
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
      if (data.toolIds.length > 0) {
        const itemsData = data.toolIds.map((toolId, index) => ({
          page_id: page.id,
          tool_id: toolId,
          order: index,
        }));

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

      if (data.toolIds.length > 0) {
        const itemsData = data.toolIds.map((toolId, index) => ({
          page_id: data.id,
          tool_id: toolId,
          order: index,
        }));

        const { error: itemsError } = await supabase
          .from('curation_page_items')
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      return { id: data.id };
    },
    onSuccess: (result) => {
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
        .select('tool_id, order')
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

