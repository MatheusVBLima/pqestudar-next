"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, ArrowLeft, BookOpen, Briefcase, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePremiumSavedItems } from '@/hooks/usePremiumSavedItems';

interface WeeklyUpdate {
  id: string;
  title: string;
  slug: string;
  intro: string | null;
  highlight: string | null;
  published_at: string | null;
}

interface UpdateItem {
  id: string;
  item_id: string;
  section: string;
  sort_order: number;
  premium_items: {
    id: string;
    title: string;
    slug: string;
    description_short: string | null;
    logo_url: string | null;
    external_url: string | null;
    tags: string[];
    item_type: string;
  };
}

const PremiumUpdateDetail = () => {
  const params = useParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const [update, setUpdate] = useState<WeeklyUpdate | null>(null);
  const [items, setItems] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();

  const fetchUpdate = useCallback(async () => {
    if (!slug) return;

    try {
      // Fetch the update
      const { data: updateData, error: updateError } = await supabase
        .from('weekly_updates')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (updateError) throw updateError;
      setUpdate(updateData);

      // Fetch the items
      const { data: itemsData, error: itemsError } = await supabase
        .from('weekly_update_items')
        .select(`
          id,
          item_id,
          section,
          sort_order,
          premium_items (
            id,
            title,
            slug,
            description_short,
            logo_url,
            external_url,
            tags,
            item_type
          )
        `)
        .eq('update_id', updateData.id)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;
      setItems((itemsData || []) as UpdateItem[]);
    } catch (err) {
      console.error('Error fetching update:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchUpdate();
  }, [fetchUpdate]);

  const courses = items.filter(item => item.section === 'courses');
  const jobs = items.filter(item => item.section === 'jobs');

  if (loading) {
    return (
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-24 mb-8" />
        <Skeleton className="h-64" />
      </main>
    );
  }

  if (!update) {
    return (
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Atualização não encontrada.</p>
          <Button asChild>
            <Link href="/premium/atualizacoes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para atualizações
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const renderItemCard = (item: UpdateItem) => {
    const premiumItem = item.premium_items;
    const Icon = premiumItem.item_type === 'course' ? BookOpen : Briefcase;
    
    return (
      <Card key={item.id} className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {premiumItem.logo_url ? (
              <img 
                src={premiumItem.logo_url} 
                alt={premiumItem.title}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">{premiumItem.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {premiumItem.description_short && (
            <CardDescription className="line-clamp-3 mb-4">
              {premiumItem.description_short}
            </CardDescription>
          )}
          
          {premiumItem.tags && premiumItem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {premiumItem.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            {premiumItem.external_url && (
              <Button size="sm" className="flex-1" asChild>
                <a href={premiumItem.external_url} target="_blank" rel="noopener noreferrer">
                  Acessar
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleSave(premiumItem.id, { title: premiumItem.title, slug: premiumItem.slug })}
              disabled={isToggling(premiumItem.id)}
            >
              {isSaved(premiumItem.id) ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link 
        href="/premium/atualizacoes" 
        className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para atualizações
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{update.title}</h1>
        {update.published_at && (
          <p className="text-muted-foreground">
            {format(new Date(update.published_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        )}
      </div>

      {update.highlight && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
          <p className="text-primary font-medium">{update.highlight}</p>
        </div>
      )}

      {update.intro && (
        <p className="text-lg text-muted-foreground mb-8">{update.intro}</p>
      )}

      {courses.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-semibold">Cursos Adicionados</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map(renderItemCard)}
          </div>
        </section>
      )}

      {jobs.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-semibold">Vagas Adicionadas</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map(renderItemCard)}
          </div>
        </section>
      )}

      {courses.length === 0 && jobs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Esta atualização ainda não possui itens.
          </p>
        </div>
      )}
    </main>
  );
};

export default PremiumUpdateDetail;
