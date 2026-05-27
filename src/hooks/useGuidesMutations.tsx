import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revalidateGuidesAction } from "@/app/actions/revalidate";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { Guide } from "@/hooks/useGuides";

const GUIDES_KEY = ["guides"];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro inesperado";

export function useGuidesMutations() {
  const queryClient = useQueryClient();

  const invalidate = (slug?: string) => {
    queryClient.invalidateQueries({ queryKey: GUIDES_KEY });
    void revalidateGuidesAction(slug);
  };

  const createGuide = useMutation({
    mutationFn: async (guide: TablesInsert<"guides">) => {
      const { data, error } = await supabase
        .from("guides")
        .insert(guide)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Guide;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Guia criado com sucesso" });
    },
    onError: (err: unknown) => {
      toast({ title: "Erro ao criar guia", description: getErrorMessage(err), variant: "destructive" });
    },
  });

  const updateGuide = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"guides"> & { id: string }) => {
      const { error } = await supabase
        .from("guides")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Guia atualizado" });
    },
    onError: (err: unknown) => {
      toast({ title: "Erro ao atualizar guia", description: getErrorMessage(err), variant: "destructive" });
    },
  });

  const deleteGuide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guides")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Guia excluido" });
    },
    onError: (err: unknown) => {
      toast({ title: "Erro ao excluir guia", description: getErrorMessage(err), variant: "destructive" });
    },
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("guides")
        .update({ is_published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast({ title: vars.is_published ? "Guia publicado" : "Guia despublicado" });
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from("guides")
        .update({ is_featured })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast({ title: vars.is_featured ? "Guia em destaque" : "Destaque removido" });
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
