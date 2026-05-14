import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import type { Json, TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { PREMIUM_SAVE_ENABLED } from '@/lib/feature-flags';

export interface PremiumSavedMetadata {
  title?: string;
  slug?: string;
}

export const usePremiumSavedItems = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Fetch all saved premium item IDs for the current user
  const fetchSavedIds = useCallback(async () => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'premium_item');

      if (error) throw error;

      const ids = new Set<string>(data?.map(item => item.item_id) || []);
      setSavedIds(ids);
    } catch (error) {
      console.error('Error fetching saved premium items:', error);
    }
  }, [user]);

  // Check if an item is saved
  const isSaved = useCallback((itemId: string) => {
    return savedIds.has(itemId);
  }, [savedIds]);

  // Toggle save/unsave an item
  const toggleSave = useCallback(async (
    itemId: string,
    metadata?: PremiumSavedMetadata
  ): Promise<boolean> => {
    // Feature flag: disabled until the saved_items.item_type constraint accepts 'premium_item'.
    if (!PREMIUM_SAVE_ENABLED) {
      toast({
        title: 'Em breve',
        description: 'Salvar itens premium será liberado em breve.',
      });
      return false;
    }

    // If user is not logged in, redirect to /login with return URL
    if (!user) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
      return false;
    }

    const wasSaved = savedIds.has(itemId);
    
    // Optimistic update
    setLoadingIds(prev => new Set(prev).add(itemId));
    setSavedIds(prev => {
      const newSet = new Set(prev);
      if (wasSaved) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });

    try {
      if (wasSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', 'premium_item')
          .eq('item_id', itemId);

        if (error) throw error;
        
        toast({
          title: 'Removido',
          description: 'Item removido dos salvos.',
        });
      } else {
        // Add to saved
        const insertData: TablesInsert<'saved_items'> = {
          user_id: user.id,
          item_type: 'premium_item',
          item_id: itemId,
          metadata: (metadata || null) as Json | null
        };
        
        const { error } = await supabase
          .from('saved_items')
          .insert(insertData);

        if (error) throw error;
        
        toast({
          title: 'Salvo!',
          description: 'Item adicionado aos salvos.',
        });
      }

      return true;
    } catch (error: unknown) {
      console.error('Error toggling save:', error);
      
      // Rollback optimistic update
      setSavedIds(prev => {
        const newSet = new Set(prev);
        if (wasSaved) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
        return newSet;
      });

      toast({
        title: 'Erro',
        description: wasSaved 
          ? 'Não foi possível remover dos salvos.' 
          : 'Não foi possível salvar o item.',
        variant: 'destructive',
      });

      return false;
    } finally {
      setLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [pathname, router, savedIds, user]);

  // Check if a specific item is being toggled
  const isToggling = useCallback((itemId: string) => {
    return loadingIds.has(itemId);
  }, [loadingIds]);

  // Initial fetch
  useEffect(() => {
    fetchSavedIds();
  }, [fetchSavedIds]);

  return {
    savedIds,
    isSaved,
    toggleSave,
    isToggling,
    refetch: fetchSavedIds,
  };
};
