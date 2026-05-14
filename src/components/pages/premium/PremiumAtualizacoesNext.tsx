"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHero } from "@/components/layout/PageHero";
import { usePageSettings } from "@/hooks/usePageSettings";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";

interface WeeklyUpdate {
  id: string;
  title: string;
  slug: string;
  intro: string | null;
  highlight: string | null;
  published_at: string | null;
}

export default function PremiumAtualizacoesNext() {
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const ps = usePageSettings("/premium/atualizacoes");

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const { data, error } = await supabase
          .from("weekly_updates")
          .select("id, title, slug, intro, highlight, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false });
        if (error) throw error;
        setUpdates((data || []) as WeeklyUpdate[]);
      } catch (err) {
        console.error("Error fetching weekly updates:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUpdates();
  }, []);

  return (
    <>
      <PageHero
        title={ps.headerTitle || "Atualizações **Semanais** da Área Premium"}
        description={ps.headerDescription || "Tudo que entrou de novo na curadoria premium, organizado por semana."}
      />

      <main className="container max-w-4xl mx-auto px-4 py-12">
        <div className="mb-6">
          <PremiumBackButton fallbackPath="/premium" fallbackLabel="Premium" />
        </div>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma atualização disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <Link key={update.id} href={`/premium/atualizacoes/${update.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {update.title}
                        </CardTitle>
                        {update.published_at && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(update.published_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  {(update.intro || update.highlight) && (
                    <CardContent>
                      {update.highlight && (
                        <div className="bg-primary/10 text-primary px-3 py-2 rounded-md text-sm mb-2">
                          {update.highlight}
                        </div>
                      )}
                      {update.intro && (
                        <CardDescription className="line-clamp-2">{update.intro}</CardDescription>
                      )}
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
