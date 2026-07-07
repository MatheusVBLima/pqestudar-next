import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json, TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export type SavedItemType = 'tool' | 'contest' | 'course_analysis';

export interface SavedItemMetadata {
  title?: string;
  slug?: string;
  orgao?: string;
  banca?: string;
  situacao?: string;
  abrangencia?: string;
  icon_url?: string;
  description?: string;
  tags?: string[];
  url?: string;
  attachment_url?: string;
  course_name?: string;
  provider_name?: string;
  verdict?: string;
  confidence?: string;
  result?: Json;
  form?: Json;
  measurement?: Json;
}

export interface SavedItem {
  id: string;
  user_id: string;
  item_type: SavedItemType;
  item_id: string;
  metadata: SavedItemMetadata | null;
  created_at: string;
}

export const useSavedItems = () => {
  const { user } = useAuth();
  const [savedItemIds, setSavedItemIds] = useState<Map<string, Set<string>>>(new Map([
    ['tool', new Set()],
    ['contest', new Set()],
    ['course_analysis', new Set()]
  ]));
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Create a composite key for tracking loading state
  const getCompositeKey = (itemType: SavedItemType, itemId: string) => `${itemType}:${itemId}`;

  // Fetch all saved item IDs for the current user
  const fetchSavedItemIds = useCallback(async () => {
    if (!user) {
      setSavedItemIds(new Map([
        ['tool', new Set()],
        ['contest', new Set()],
        ['course_analysis', new Set()]
      ]));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('item_type, item_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const toolIds = new Set<string>();
      const contestIds = new Set<string>();
      const courseAnalysisIds = new Set<string>();

      data?.forEach(item => {
        if (item.item_type === 'tool') {
          toolIds.add(item.item_id);
        } else if (item.item_type === 'contest') {
          contestIds.add(item.item_id);
        } else if (item.item_type === 'course_analysis') {
          courseAnalysisIds.add(item.item_id);
        }
      });

      setSavedItemIds(new Map([
        ['tool', toolIds],
        ['contest', contestIds],
        ['course_analysis', courseAnalysisIds]
      ]));
    } catch (error) {
      console.error('Error fetching saved item IDs:', error);
    }
  }, [user]);

  // Fetch saved items with metadata
  const fetchSavedItems = useCallback(async () => {
    if (!user) {
      setSavedItems([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedItems((data || []) as SavedItem[]);
    } catch (error) {
      console.error('Error fetching saved items:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus itens salvos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if an item is saved
  const isSaved = useCallback((itemType: SavedItemType, itemId: string) => {
    return savedItemIds.get(itemType)?.has(itemId) ?? false;
  }, [savedItemIds]);

  // Toggle save/unsave an item
  const toggleSave = useCallback(async (
    itemType: SavedItemType,
    itemId: string,
    metadata?: SavedItemMetadata
  ): Promise<boolean> => {
    if (!user) {
      return false;
    }

    const compositeKey = getCompositeKey(itemType, itemId);
    const wasSaved = savedItemIds.get(itemType)?.has(itemId) ?? false;
    
    // Optimistic update
    setLoadingIds(prev => new Set(prev).add(compositeKey));
    setSavedItemIds(prev => {
      const newMap = new Map(prev);
      const typeSet = new Set(prev.get(itemType) || []);
      if (wasSaved) {
        typeSet.delete(itemId);
      } else {
        typeSet.add(itemId);
      }
      newMap.set(itemType, typeSet);
      return newMap;
    });

    try {
      if (wasSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', itemType)
          .eq('item_id', itemId);

        if (error) throw error;
      } else {
        const insertData: TablesInsert<'saved_items'> = {
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          metadata: (metadata || null) as Json | null
        };
        
        const { error } = await supabase
          .from('saved_items')
          .insert(insertData);

        if (error) throw error;
      }

      return true;
    } catch (error: unknown) {
      console.error('Error toggling save:', error);
      
      // Rollback optimistic update
      setSavedItemIds(prev => {
        const newMap = new Map(prev);
        const typeSet = new Set(prev.get(itemType) || []);
        if (wasSaved) {
          typeSet.add(itemId);
        } else {
          typeSet.delete(itemId);
        }
        newMap.set(itemType, typeSet);
        return newMap;
      });

      toast({
        title: "Erro",
        description: wasSaved 
          ? "Não foi possível remover dos salvos." 
          : "Não foi possível salvar o item.",
        variant: "destructive"
      });

      return false;
    } finally {
      setLoadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(compositeKey);
        return newSet;
      });
    }
  }, [user, savedItemIds]);

  // Check if a specific item is being toggled
  const isToggling = useCallback((itemType: SavedItemType, itemId: string) => {
    return loadingIds.has(getCompositeKey(itemType, itemId));
  }, [loadingIds]);

  // Get saved items by type
  const getSavedByType = useCallback((itemType: SavedItemType) => {
    return savedItems.filter(item => item.item_type === itemType);
  }, [savedItems]);

  // Initial fetch
  useEffect(() => {
    fetchSavedItemIds();
  }, [fetchSavedItemIds]);

  return {
    savedItemIds,
    savedItems,
    loading,
    isSaved,
    toggleSave,
    isToggling,
    fetchSavedItems,
    getSavedByType,
    refetchIds: fetchSavedItemIds
  };
};
