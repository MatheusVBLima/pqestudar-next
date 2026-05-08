"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bookmark, BookOpen, Briefcase, ExternalLink, Trash2 } from 'lucide-react';
import { usePremiumSavedItems } from '@/hooks/usePremiumSavedItems';
import type { Json } from '@/integrations/supabase/types';

interface SavedItem {
  id: string;
  item_id: string;
  metadata: Json | null;
  created_at: string;
}

interface PremiumItemDetails {
  id: string;
  title: string;
  slug: string;
  description_short: string | null;
  logo_url: string | null;
  external_url: string | null;
  tags: string[];
  item_type: string;
}

const PremiumSaved = () => {
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [itemDetails, setItemDetails] = useState<Map<string, PremiumItemDetails>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toggleSave, isToggling } = usePremiumSavedItems();

  const fetchSavedItems = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch saved items
      const { data: savedData, error: savedError } = await supabase
        .from('saved_items')
        .select('id, item_id, metadata, created_at')
        .eq('user_id', user.id)
        .eq('item_type', 'premium_item')
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;
      setSavedItems((savedData || []) as SavedItem[]);

      // Fetch item details
      if (savedData && savedData.length > 0) {
        const itemIds = savedData.map(s => s.item_id);
        const { data: detailsData, error: detailsError } = await supabase
          .from('premium_items')
          .select('id, title, slug, description_short, logo_url, external_url, tags, item_type')
          .in('id', itemIds);

        if (detailsError) throw detailsError;

        const detailsMap = new Map<string, PremiumItemDetails>();
        detailsData?.forEach(item => {
          detailsMap.set(item.id, item as PremiumItemDetails);
        });
        setItemDetails(detailsMap);
      }
    } catch (err) {
      console.error('Error fetching saved items:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const handleRemove = async (itemId: string) => {
    const success = await toggleSave(itemId);
    if (success) {
      setSavedItems(prev => prev.filter(item => item.item_id !== itemId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      
      
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Meus Salvos</h1>
        </div>

        {savedItems.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Você ainda não salvou nenhum item.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/premium/cursos">Ver cursos</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/premium/vagas">Ver vagas</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {savedItems.map(saved => {
              const details = itemDetails.get(saved.item_id);
              const Icon = details?.item_type === 'course' ? BookOpen : Briefcase;
              
              return (
                <Card key={saved.id} className="flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      {details?.logo_url ? (
                        <img 
                          src={details.logo_url} 
                          alt={details.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2">
                          {details?.title || saved.metadata?.title || 'Item salvo'}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {details?.item_type === 'course' ? 'Curso' : 'Vaga'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    {details?.description_short && (
                      <CardDescription className="line-clamp-2 mb-4">
                        {details.description_short}
                      </CardDescription>
                    )}
                    
                    {details?.tags && details.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {details.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto">
                      {details?.external_url && (
                        <Button size="sm" className="flex-1" asChild>
                          <a href={details.external_url} target="_blank" rel="noopener noreferrer">
                            Acessar
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(saved.item_id)}
                        disabled={isToggling(saved.item_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      
    </div>
  );
};

export default PremiumSaved;
