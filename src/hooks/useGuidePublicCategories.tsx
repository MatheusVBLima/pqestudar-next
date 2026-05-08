import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIAS_PUBLICAS } from '@/lib/guide-editorial-options';

export interface GuidePublicCategory {
  name: string;
  sort_order: number;
}

const FALLBACK: GuidePublicCategory[] = (CATEGORIAS_PUBLICAS as readonly string[]).map(
  (name, i) => ({ name, sort_order: (i + 1) * 10 })
);

/**
 * Fonte de verdade da Categoria Pública.
 * Lê a tabela `guide_public_categories` (validada também pelo trigger do banco).
 * Em caso de falha de rede usa um fallback estático equivalente para não quebrar o select.
 */
export function useGuidePublicCategories() {
  return useQuery({
    queryKey: ['guide_public_categories'],
    queryFn: async (): Promise<GuidePublicCategory[]> => {
      const { data, error } = await supabase
        .from('guide_public_categories')
        .select('name, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('[useGuidePublicCategories] fallback:', error.message);
        return FALLBACK;
      }
      const rows = ((data ?? []) as unknown) as GuidePublicCategory[];
      return rows.length > 0 ? rows : FALLBACK;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: FALLBACK,
  });
}
