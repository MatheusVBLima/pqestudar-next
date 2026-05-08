import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { revalidateOportunidadesAction } from "@/app/actions/revalidate";
import { PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";

function invalidateOportunidades(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["oportunidades-admin"] });
  queryClient.invalidateQueries({ queryKey: ["oportunidades-public"] });
  void revalidateOportunidadesAction();
}

export interface FonteOportunidade {
  id?: string;
  oportunidade_id?: string;
  source_url: string;
  source_title?: string;
  source_tipo: "oficial" | "diario" | "banca" | "outro-oficial";
  source_date?: string;
}

export interface Oportunidade {
  id: string;
  categoria: "Concurso" | "Políticas Públicas" | "Educação";
  titulo: string;
  abrangencia: "Nacional" | "Estadual" | "Municipal";
  situacao: "Previsto" | "Edital publicado" | "Aberto" | "Encerrado";
  data_publicacao: string;
  visualizacoes: number;
  tipo: "Concurso" | "Programa educacional" | "Processo seletivo" | "Processo Seletivo Simplificado";
  escolaridade: "Fundamental" | "Médio" | "Superior"; // Legacy single field
  escolaridades?: ("Fundamental" | "Médio" | "Superior")[]; // New multi-select field
  link_edital?: string;
  orgao?: string;
  banca?: string;
  resumo_editorial?: string;
  slug: string;
  publicado: boolean;
  created_at: string;
  updated_at: string;
  fontes_oportunidade?: FonteOportunidade[];
  // Trash fields
  status_admin?: "ativo" | "lixeira";
  deleted_at?: string | null;
  deleted_by?: string | null;
}

type OportunidadeRow = Oportunidade & {
  escolaridades?: Oportunidade["escolaridades"];
};

export interface OportunidadeFilters {
  situacao?: string[];
  tipo?: string[];
  escolaridade?: string[];
  abrangencia?: string[];
  source_tipo?: string[];
}

export type OportunidadeInput = Omit<Oportunidade, "id" | "visualizacoes" | "created_at" | "updated_at" | "fontes_oportunidade" | "status_admin" | "deleted_at" | "deleted_by"> & {
  id?: string;
  fontes?: FonteOportunidade[];
};

export function useOportunidades(filters?: OportunidadeFilters) {
  const queryClient = useQueryClient();

  // Fetch public oportunidades (published only)
  const {
    data: oportunidades = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["oportunidades-public", filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("*, views_total")
        .eq("publicado", true)
        .order("data_publicacao", { ascending: false });

      if (error) throw error;

      let result = ((data || []) as unknown as OportunidadeRow[]).map(o => ({
        ...o,
        // Normalize: ensure escolaridades array exists (backward compat)
        escolaridades: o.escolaridades?.length
          ? o.escolaridades
          : (o.escolaridade ? [o.escolaridade] : ["Médio"]),
      }));

      // Apply filters client-side for views
      if (filters?.situacao?.length) {
        result = result.filter(o => filters.situacao!.includes(o.situacao));
      }
      if (filters?.tipo?.length) {
        result = result.filter(o => filters.tipo!.includes(o.tipo));
      }
      if (filters?.escolaridade?.length) {
        // Multi-select intersection: item has ANY of the selected escolaridades
        result = result.filter(o => {
          const itemEscolaridades = o.escolaridades || [o.escolaridade];
          return filters.escolaridade!.some(e => itemEscolaridades.includes(e));
        });
      }
      if (filters?.abrangencia?.length) {
        result = result.filter(o => filters.abrangencia!.includes(o.abrangencia));
      }

      return result;
    },
  });

  // Fetch single oportunidade by slug with fontes
  const fetchBySlug = useCallback(async (slug: string): Promise<Oportunidade | null> => {
    const { data: oportunidade, error } = await supabase
      .from("oportunidades")
      .select("*")
      .eq("slug", slug)
      .eq("publicado", true)
      .single();

    if (error || !oportunidade) return null;

    // Fetch fontes
    const { data: fontes } = await supabase
      .from("fontes_oportunidade")
      .select("*")
      .eq("oportunidade_id", oportunidade.id);

    return {
      ...oportunidade,
      fontes_oportunidade: (fontes || []) as unknown as FonteOportunidade[],
    } as Oportunidade;
  }, []);

  // Increment views is now handled by useOportunidadeViewTracker hook
  // Keep this stub for backward compatibility
  const incrementViews = useCallback(async (_id: string) => {
    // View tracking is now handled by useOportunidadeViewTracker in ConcursoDetalhe
    // This stub is kept for backward compatibility
  }, []);

  return {
    oportunidades,
    isLoading,
    error,
    refetch,
    fetchBySlug,
    incrementViews,
  };
}

export function useOportunidadesAdmin(statusFilter?: "ativo" | "lixeira") {
  const queryClient = useQueryClient();

  // Fetch all oportunidades (including unpublished) for admin
  const {
    data: oportunidades = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["oportunidades-admin", statusFilter],
    staleTime: 90_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const url = statusFilter 
        ? `${PUBLIC_SUPABASE_URL}/functions/v1/admin-oportunidades?status=${statusFilter}`
        : `${PUBLIC_SUPABASE_URL}/functions/v1/admin-oportunidades`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao buscar oportunidades");
      return data as Oportunidade[];
    },
  });

  // Create oportunidade
  const createMutation = useMutation({
    mutationFn: async (input: OportunidadeInput) => {
      const { data, error } = await supabase.functions.invoke("admin-oportunidades", {
        method: "POST",
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as Oportunidade;
    },
    onSuccess: () => {
      invalidateOportunidades(queryClient);
      toast.success("Oportunidade criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar oportunidade");
    },
  });

  // Update oportunidade
  const updateMutation = useMutation({
    mutationFn: async (input: OportunidadeInput) => {
      const { data, error } = await supabase.functions.invoke("admin-oportunidades", {
        method: "PUT",
        body: input,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as Oportunidade;
    },
    onSuccess: () => {
      invalidateOportunidades(queryClient);
      toast.success("Oportunidade atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar oportunidade");
    },
  });

  // Trash oportunidade (soft delete)
  const trashMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/admin-oportunidades?action=trash`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao enviar para lixeira");
      return result;
    },
    onSuccess: () => {
      invalidateOportunidades(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao enviar para lixeira");
    },
  });

  // Restore oportunidade
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/admin-oportunidades?action=restore`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao restaurar");
      return result;
    },
    onSuccess: () => {
      invalidateOportunidades(queryClient);
      toast.success("Item restaurado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao restaurar");
    },
  });

  // Purge oportunidade (hard delete)
  const purgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/admin-oportunidades?action=purge`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao excluir definitivamente");
      return result;
    },
    onSuccess: () => {
      invalidateOportunidades(queryClient);
      toast.success("Item excluído definitivamente!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir definitivamente");
    },
  });

  // Delete oportunidade (legacy - now requires trash first)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/admin-oportunidades?id=${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao excluir");
      return result;
    },
    onSuccess: () => {
      invalidateOportunidades(queryClient);
      toast.success("Oportunidade excluída!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir oportunidade");
    },
  });

  // Toggle publicado
  const togglePublicadoMutation = useMutation({
    mutationFn: async ({ id, publicado }: { id: string; publicado: boolean }) => {
      const response = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/admin-oportunidades?action=toggle`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, publicado }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao alterar visibilidade");
      return result;
    },
    onSuccess: (_, { publicado }) => {
      invalidateOportunidades(queryClient);
      toast.success(publicado ? "Oportunidade publicada!" : "Oportunidade despublicada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao alterar visibilidade");
    },
  });

  return {
    oportunidades,
    isLoading,
    error,
    refetch,
    createOportunidade: createMutation.mutateAsync,
    updateOportunidade: updateMutation.mutateAsync,
    deleteOportunidade: deleteMutation.mutateAsync,
    trashOportunidade: trashMutation.mutateAsync,
    restoreOportunidade: restoreMutation.mutateAsync,
    purgeOportunidade: purgeMutation.mutateAsync,
    togglePublicado: togglePublicadoMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTrashing: trashMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isPurging: purgeMutation.isPending,
  };
}
