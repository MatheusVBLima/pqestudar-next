import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

export interface BonusTool {
  logoUrl: string;
  logoAlt: string;
  toolTitle: string;
  toolDescription: string;
  toolLink: string;
  tags?: string[];
}

export interface BonusPage {
  id: string;
  slug: string;
  title: string;
  intro: string;
  cards: BonusTool[];
  status: 'visible' | 'hidden';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useBonusPages = () => {
  const [pages, setPages] = useState<BonusPage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('newsletter_bonus_pages')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setPages((data || []) as unknown as BonusPage[]);
    } catch (error: unknown) {
      console.error('Error fetching bonus pages:', error);
      toast({
        title: "Erro ao carregar páginas",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addPage = async (page: Omit<BonusPage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const payload = page as unknown as TablesInsert<'newsletter_bonus_pages'>;
      const { data, error } = await supabase
        .from('newsletter_bonus_pages')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Página criada",
        description: "A nova página foi criada com sucesso.",
      });

      await fetchPages();
      return data;
    } catch (error: unknown) {
      console.error('Error adding bonus page:', error);
      toast({
        title: "Erro ao criar página",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePage = async (id: string, updates: Partial<BonusPage>) => {
    try {
      const payload = updates as unknown as TablesUpdate<'newsletter_bonus_pages'>;
      const { error } = await supabase
        .from('newsletter_bonus_pages')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Página atualizada",
        description: "As alterações foram salvas com sucesso.",
      });

      await fetchPages();
    } catch (error: unknown) {
      console.error('Error updating bonus page:', error);
      toast({
        title: "Erro ao atualizar página",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('newsletter_bonus_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Página excluída",
        description: "A página foi removida com sucesso.",
      });

      await fetchPages();
    } catch (error: unknown) {
      console.error('Error deleting bonus page:', error);
      toast({
        title: "Erro ao excluir página",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'visible' ? 'hidden' : 'visible';
    await updatePage(id, { status: newStatus });
  };

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return {
    pages,
    loading,
    addPage,
    updatePage,
    deletePage,
    toggleStatus,
    refetch: fetchPages,
  };
};
