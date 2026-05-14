"use client";

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PremiumItemLite {
  id: string;
  title: string;
  status?: string;
  sort_order?: number;
}

export function usePremiumItemAdminActions() {
  const togglePublish = useCallback(async (item: PremiumItemLite) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('premium_items')
      .update({
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({
      title: newStatus === 'published' ? 'Publicado' : 'Despublicado',
      description: item.title,
    });
    return newStatus;
  }, []);

  const remove = useCallback(async (item: PremiumItemLite) => {
    if (!window.confirm(`Excluir "${item.title}"? Essa ação não pode ser desfeita.`)) return false;
    const { error } = await supabase.from('premium_items').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Excluído', description: item.title });
    return true;
  }, []);

  const reorder = useCallback(async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('premium_items').update({ sort_order: index }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      toast({ title: 'Erro ao reordenar', description: firstError.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Ordem atualizada' });
    return true;
  }, []);

  return { togglePublish, remove, reorder };
}
