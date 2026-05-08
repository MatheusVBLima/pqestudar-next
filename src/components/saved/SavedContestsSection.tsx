"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, ChevronRight, Bookmark, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSavedItems, SavedItem, SavedItemMetadata } from "@/hooks/useSavedItems";

const SITUACAO_COLORS: Record<string, string> = {
  "Previsto": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Edital publicado": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Aberto": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Encerrado": "bg-muted text-muted-foreground border-muted",
};

interface ContestData {
  id: string;
  titulo: string;
  slug: string;
  orgao?: string;
  banca?: string;
  situacao: string;
  abrangencia: string;
}

interface SavedContestsSectionProps {
  savedItems: SavedItem[];
  onRefresh: () => void;
}

export function SavedContestsSection({ savedItems, onRefresh }: SavedContestsSectionProps) {
  const router = useRouter();
  const { toggleSave, isToggling } = useSavedItems();
  const [contests, setContests] = useState<ContestData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch contest data - use metadata as fallback or fetch from oportunidades_public
  useEffect(() => {
    const fetchContests = async () => {
      if (savedItems.length === 0) {
        setContests([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // First, try to use metadata from saved items
        const contestsFromMetadata: ContestData[] = [];
        const idsToFetch: string[] = [];

        savedItems.forEach(item => {
          const meta = item.metadata as SavedItemMetadata | null;
          if (meta?.title && meta?.slug) {
            contestsFromMetadata.push({
              id: item.item_id,
              titulo: meta.title,
              slug: meta.slug,
              orgao: meta.orgao,
              banca: meta.banca,
              situacao: meta.situacao || 'Previsto',
              abrangencia: meta.abrangencia || 'Nacional',
            });
          } else {
            idsToFetch.push(item.item_id);
          }
        });

        // Fetch remaining contests from database
        if (idsToFetch.length > 0) {
          const { data, error } = await supabase
            .from('oportunidades_public')
            .select('id, titulo, slug, orgao, banca, situacao, abrangencia')
            .in('id', idsToFetch);

          if (error) throw error;

          const fetchedContests: ContestData[] = (data || []).map(c => ({
            id: c.id!,
            titulo: c.titulo!,
            slug: c.slug!,
            orgao: c.orgao || undefined,
            banca: c.banca || undefined,
            situacao: c.situacao || 'Previsto',
            abrangencia: c.abrangencia || 'Nacional',
          }));

          setContests([...contestsFromMetadata, ...fetchedContests]);
        } else {
          setContests(contestsFromMetadata);
        }
      } catch (error) {
        console.error('Error fetching contests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [savedItems]);

  const handleRemove = async (contestId: string) => {
    await toggleSave('contest', contestId);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Concursos Salvos</h2>
        {contests.length > 0 && (
          <Badge variant="secondary">{contests.length}</Badge>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-full">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12 bg-muted/30 rounded-lg"
        >
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Você ainda não salvou nenhum concurso.
          </h3>
          <p className="text-muted-foreground mb-6">
            Explore as oportunidades e salve seus favoritos para acompanhar.
          </p>
          <Button onClick={() => router.push("/concursos")}>
            Ver concursos
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest, index) => {
            const isRemoving = isToggling('contest', contest.id);

            return (
              <motion.div
                key={contest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={SITUACAO_COLORS[contest.situacao] || ""}
                      >
                        {contest.situacao}
                      </Badge>
                    </div>
                    
                    <h3 className="text-lg font-semibold line-clamp-2 mt-2">
                      {contest.titulo}
                    </h3>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      {contest.orgao && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="line-clamp-1">{contest.orgao}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {contest.abrangencia === "Nacional" ? (
                          <Globe className="h-4 w-4 shrink-0" />
                        ) : (
                          <MapPin className="h-4 w-4 shrink-0" />
                        )}
                        <span>{contest.abrangencia}</span>
                      </div>

                      {contest.banca && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Banca: {contest.banca}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(contest.id)}
                        disabled={isRemoving}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remover dos salvos"
                      >
                        <Bookmark className="h-4 w-4 fill-current" />
                      </Button>
                      
                      <Button
                        onClick={() => router.push(`/concursos/${contest.slug}`)}
                        className="flex-1 gap-2"
                      >
                        Ver página completa
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
