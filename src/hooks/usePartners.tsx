import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

export interface Partner {
  id: string;
  title: string;
  logo_url: string;
  url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

interface AdminPartnerRow extends Partner {
  display_order?: number;
}

const toAdminMapped = (data: AdminPartnerRow[]) =>
  data.map((partner) => ({
    id: partner.id,
    title: partner.title,
    logo_url: partner.logo_url,
    url: partner.url,
    sort_order: partner.sort_order,
    display_order: partner.sort_order,
    is_active: partner.is_active,
    created_by: partner.created_by,
    updated_by: partner.updated_by,
    created_at: partner.created_at,
    updated_at: partner.updated_at,
  })) as Partner[];

const toPublicMapped = (
  data: Array<{
    id: string;
    title: string;
    logo_url: string;
    partner_url: string;
    display_order: number;
    is_active: boolean;
    updated_at: string;
  }>
) =>
  data.map((partner) => ({
    id: partner.id,
    title: partner.title,
    logo_url: partner.logo_url,
    url: partner.partner_url,
    sort_order: partner.display_order,
    is_active: partner.is_active,
    updated_at: partner.updated_at,
    created_at: partner.updated_at,
    created_by: undefined,
    updated_by: undefined,
  })) as Partner[];

async function ensureAuthForAdmin() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Admin access requires authentication");
}

export const usePartners = (includeInactive = false) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["partners", includeInactive ? "admin" : "public"] as const;

  const partnersQuery = useQuery({
    queryKey,
    enabled: includeInactive ? !!user : true,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      if (includeInactive) {
        await ensureAuthForAdmin();
        const { data, error } = await supabase.functions.invoke("admin-partners", {
          body: { action: "list" },
        });
        if (error) throw error;
        return toAdminMapped((data ?? []) as AdminPartnerRow[]);
      }

      const { data, error } = await supabase
        .from("active_partners")
        .select("id, title, logo_url, partner_url, display_order, is_active, updated_at");
      if (error) throw error;
      return toPublicMapped((data ?? []) as Array<{
        id: string;
        title: string;
        logo_url: string;
        partner_url: string;
        display_order: number;
        is_active: boolean;
        updated_at: string;
      }>);
    },
  });

  const invalidatePartners = async () => {
    await queryClient.invalidateQueries({ queryKey: ["partners"] });
  };

  const createMutation = useMutation({
    mutationFn: async (partner: Omit<Partner, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">) => {
      await ensureAuthForAdmin();
      const { data, error } = await supabase.functions.invoke("admin-partners", {
        body: { action: "create", data: partner },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await invalidatePartners();
      toast({ title: "Sucesso", description: "Parceiro adicionado com sucesso!" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro",
        description: getErrorMessage(error, "Não foi possível adicionar o parceiro."),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Partner> }) => {
      await ensureAuthForAdmin();
      const { data, error } = await supabase.functions.invoke("admin-partners", {
        body: { action: "update", data: { id, ...updates } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await invalidatePartners();
      toast({ title: "Sucesso", description: "Parceiro atualizado com sucesso!" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro",
        description: getErrorMessage(error, "Não foi possível atualizar o parceiro."),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await ensureAuthForAdmin();
      const { error } = await supabase.functions.invoke("admin-partners", {
        body: { action: "delete", data: { id } },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidatePartners();
      toast({ title: "Sucesso", description: "Parceiro removido com sucesso!" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erro",
        description: getErrorMessage(error, "Não foi possível remover o parceiro."),
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedPartners: Partner[]) => {
      await ensureAuthForAdmin();
      const { error } = await supabase.functions.invoke("admin-partners", {
        body: {
          action: "reorder",
          data: {
            partners: reorderedPartners.map((partner, index) => ({
              id: partner.id,
              sort_order: index,
            })),
          },
        },
      });
      if (error) throw error;
    },
    onMutate: async (reorderedPartners) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Partner[]>(queryKey) ?? [];
      queryClient.setQueryData(queryKey, reorderedPartners);
      return { previous };
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Erro ao salvar ordem",
        description: getErrorMessage(error, "Não foi possível salvar a nova ordem."),
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      await invalidatePartners();
      toast({ title: "Ordem atualizada", description: "A ordem dos parceiros foi salva com sucesso." });
    },
  });

  const addPartner = async (
    partner: Omit<Partner, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">
  ) => {
    try {
      const data = await createMutation.mutateAsync(partner);
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: getErrorMessage(error, "Não foi possível adicionar o parceiro.") };
    }
  };

  const updatePartner = async (id: string, updates: Partial<Partner>) => {
    try {
      const data = await updateMutation.mutateAsync({ id, updates });
      return { data, error: null };
    } catch (error: unknown) {
      return { data: null, error: getErrorMessage(error, "Não foi possível atualizar o parceiro.") };
    }
  };

  const deletePartner = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return { error: null };
    } catch (error: unknown) {
      return { error: getErrorMessage(error, "Não foi possível remover o parceiro.") };
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    return updatePartner(id, { is_active: !currentState });
  };

  const reorderPartners = async (reorderedPartners: Partner[]) => {
    try {
      await reorderMutation.mutateAsync(reorderedPartners);
      return { error: null };
    } catch (error: unknown) {
      return { error: getErrorMessage(error, "Não foi possível salvar a nova ordem.") };
    }
  };

  return {
    partners: partnersQuery.data ?? [],
    loading: partnersQuery.isLoading,
    addPartner,
    updatePartner,
    deletePartner,
    toggleActive,
    reorderPartners,
    refetch: partnersQuery.refetch,
  };
};
