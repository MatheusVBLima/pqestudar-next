"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, Briefcase, ExternalLink, Bookmark, BookmarkCheck, LayoutGrid } from "lucide-react";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";

interface PremiumPage {
  id: string;
  title: string;
  slug: string;
  description: string | null;
}

interface PageItem {
  id: string;
  item_id: string;
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

export default function PremiumCurationPageNext() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [page, setPage] = useState<PremiumPage | null>(null);
  const [items, setItems] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();

  useEffect(() => {
    if (!slug) return;
    const fetchPage = async () => {
      try {
        const { data: pageData, error: pageError } = await supabase
          .from("premium_pages")
          .select("*")
          .eq("slug", slug)
          .eq("status", "published")
          .single();
        if (pageError) throw pageError;
        setPage(pageData as PremiumPage);

        const { data: itemsData, error: itemsError } = await supabase
          .from("premium_page_items")
          .select(`
            id,
            item_id,
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
          .eq("page_id", pageData.id)
          .order("sort_order", { ascending: true });
        if (itemsError) throw itemsError;
        setItems((itemsData as unknown as PageItem[]) || []);
      } catch (err) {
        console.error("Error fetching page:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-24 mb-8" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Página não encontrada.</p>
            <Button asChild>
              <Link href="/premium">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Área Premium
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/premium"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Área Premium
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
          {page.description && (
            <p className="text-lg text-muted-foreground">{page.description}</p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Esta curadoria ainda não possui itens.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((item) => {
              const premiumItem = item.premium_items;
              const Icon = premiumItem.item_type === "course" ? BookOpen : Briefcase;

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
                        <Badge variant="secondary" className="mt-1">
                          {premiumItem.item_type === "course" ? "Curso" : "Vaga"}
                        </Badge>
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
                        {premiumItem.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
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
            })}
          </div>
        )}
      </main>
    </div>
  );
}
