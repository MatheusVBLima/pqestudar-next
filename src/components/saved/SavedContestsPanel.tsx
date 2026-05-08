"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, ChevronRight, Bookmark, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSavedItems, SavedItem, SavedItemMetadata } from "@/hooks/useSavedItems";
import { useQuery } from "@tanstack/react-query";

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

interface SavedContestsPanelProps {
  savedItems: SavedItem[];
  onRefresh: () => void;
  shouldLoad: boolean;
}

export function SavedContestsPanel({ savedItems, onRefresh, shouldLoad }: SavedContestsPanelProps) {
  const router = useRouter();
  const { toggleSave, isToggling } = useSavedItems();
  const savedContestIds = useMemo(
    () => savedItems.map((item) => item.item_id),
    [savedItems]
  );
  const contestsQuery = useQuery({
    queryKey: ["saved_contests_panel", savedContestIds],
    enabled: shouldLoad,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (savedItems.length === 0) return [] as ContestData[];

      const contestsFromMetadata: ContestData[] = [];
      const idsToFetch: string[] = [];

      for (const item of savedItems) {
        const meta = item.metadata as SavedItemMetadata | null;
        if (meta?.title && meta?.slug) {
          contestsFromMetadata.push({
            id: item.item_id,
            titulo: meta.title,
            slug: meta.slug,
            orgao: meta.orgao,
            banca: meta.banca,
            situacao: meta.situacao || "Previsto",
            abrangencia: meta.abrangencia || "Nacional",
          });
          continue;
        }
        idsToFetch.push(item.item_id);
      }

      if (idsToFetch.length === 0) {
        return contestsFromMetadata;
      }

      const { data, error } = await supabase
        .from("oportunidades_public")
        .select("id, titulo, slug, orgao, banca, situacao, abrangencia")
        .in("id", idsToFetch);

      if (error) throw error;

      const fetchedContests: ContestData[] = (data || []).map((contest) => ({
        id: contest.id!,
        titulo: contest.titulo!,
        slug: contest.slug!,
        orgao: contest.orgao || undefined,
        banca: contest.banca || undefined,
        situacao: contest.situacao || "Previsto",
        abrangencia: contest.abrangencia || "Nacional",
      }));

      return [...contestsFromMetadata, ...fetchedContests];
    },
  });
  const contests = contestsQuery.data ?? [];
  const loading = contestsQuery.isLoading;

  const handleRemove = async (contestId: string) => {
    await toggleSave('contest', contestId);
    onRefresh();
  };

  if (!shouldLoad) {
    return null;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-full">
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-10 bg-muted/30 rounded-lg mt-4"
      >
        <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          Você ainda não salvou nenhum concurso.
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Explore as oportunidades e salve seus favoritos.
        </p>
        <Button size="sm" onClick={() => router.push("/concursos")}>
          Ver concursos
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
      {contests.map((contest, index) => {
        const isRemoving = isToggling('contest', contest.id);

        return (
          <motion.div
            key={contest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow duration-200 flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={SITUACAO_COLORS[contest.situacao] || ""}
                  >
                    {contest.situacao}
                  </Badge>
                </div>
                <h3 className="text-base font-semibold line-clamp-2 mt-1.5">
                  {contest.titulo}
                </h3>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col pt-1">
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  {contest.orgao && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{contest.orgao}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    {contest.abrangencia === "Nacional" ? (
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{contest.abrangencia}</span>
                  </div>
                  {contest.banca && (
                    <div className="flex items-center gap-1.5">
                      <span>Banca: {contest.banca}</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-3 border-t flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(contest.id)}
                    disabled={isRemoving}
                    className="shrink-0 text-muted-foreground hover:text-destructive px-2"
                    aria-label="Remover dos salvos"
                  >
                    <Bookmark className="h-4 w-4 fill-current" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push(`/concursos/${contest.slug}`)}
                    className="flex-1 gap-1.5 text-xs"
                  >
                    Ver página
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
