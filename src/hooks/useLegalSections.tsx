import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { revalidateLegalAction } from "@/app/actions/revalidate";

export interface LegalDocument {
  id: string;
  route: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalSection {
  id: string;
  document_id: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Public hook: fetch document + active sections for a route
export function useLegalPage(route: string) {
  const docQuery = useQuery({
    queryKey: ["legal-document", route],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .eq("route", route)
        .maybeSingle();
      if (error) throw error;
      return data as LegalDocument | null;
    },
  });

  const sectionsQuery = useQuery({
    queryKey: ["legal-sections", route],
    enabled: !!docQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_sections")
        .select("*")
        .eq("document_id", docQuery.data!.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as LegalSection[];
    },
  });

  return {
    document: docQuery.data,
    sections: sectionsQuery.data ?? [],
    isLoading: docQuery.isLoading || sectionsQuery.isLoading,
    error: docQuery.error || sectionsQuery.error,
  };
}

// Admin hook: fetch ALL sections (including inactive) + mutations
export function useLegalAdmin(route: string) {
  const qc = useQueryClient();

  const docQuery = useQuery({
    queryKey: ["legal-document", route],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("*")
        .eq("route", route)
        .maybeSingle();
      if (error) throw error;
      return data as LegalDocument | null;
    },
  });

  const sectionsQuery = useQuery({
    queryKey: ["legal-sections-admin", route],
    enabled: !!docQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_sections")
        .select("*")
        .eq("document_id", docQuery.data!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as LegalSection[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["legal-sections-admin", route] });
    qc.invalidateQueries({ queryKey: ["legal-sections", route] });
    qc.invalidateQueries({ queryKey: ["legal-document", route] });
    void revalidateLegalAction(route);
  };

  const updatePdfUrl = useMutation({
    mutationFn: async (pdfUrl: string) => {
      if (!docQuery.data?.id) throw new Error("Documento não encontrado");
      const { error } = await supabase
        .from("legal_documents")
        .update({ pdf_url: pdfUrl || null })
        .eq("id", docQuery.data.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createSection = useMutation({
    mutationFn: async (section: { title: string; content: string }) => {
      if (!docQuery.data?.id) throw new Error("Documento não encontrado");
      const maxOrder = (sectionsQuery.data ?? []).reduce(
        (max, s) => Math.max(max, s.sort_order),
        0
      );
      const { error } = await supabase.from("legal_sections").insert({
        document_id: docQuery.data.id,
        title: section.title,
        content: section.content,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateSection = useMutation({
    mutationFn: async (section: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("legal_sections")
        .update({ title: section.title, content: section.content })
        .eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("legal_sections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("legal_sections")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, idx) =>
        supabase.from("legal_sections").update({ sort_order: idx + 1 }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: invalidate,
  });

  return {
    document: docQuery.data,
    sections: sectionsQuery.data ?? [],
    isLoading: docQuery.isLoading || sectionsQuery.isLoading,
    updatePdfUrl,
    createSection,
    updateSection,
    deleteSection,
    toggleActive,
    reorder,
  };
}
