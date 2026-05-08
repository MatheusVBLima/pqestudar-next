"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wrench, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSavedItems, SavedItem } from "@/hooks/useSavedItems";
import { Tool } from "@/hooks/useTools";
import { Sparkles, Brain, Shield, GraduationCap, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Inteligência Artificial": Brain,
  "Produtividade": Zap,
  "Segurança e Privacidade": Shield,
  "Cursos Gratuitos": GraduationCap,
  "Utilidades": Wrench,
};

interface SavedToolsPanelProps {
  savedItems: SavedItem[];
  onRefresh: () => void;
  shouldLoad: boolean;
}

export function SavedToolsPanel({ savedItems, onRefresh, shouldLoad }: SavedToolsPanelProps) {
  const router = useRouter();
  const { toggleSave, isToggling } = useSavedItems();
  const savedToolIds = useMemo(
    () => savedItems.map((item) => item.item_id),
    [savedItems]
  );
  const toolsQuery = useQuery({
    queryKey: ["saved_tools_panel", savedToolIds],
    enabled: shouldLoad,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (savedToolIds.length === 0) return [] as Tool[];

      const { data, error } = await supabase
        .from("tools_public")
        .select("*")
        .in("id", savedToolIds);

      if (error) throw error;

      const toolsMap = new Map((data || []).map((tool) => [tool.id, tool]));
      return savedToolIds
        .map((id) => toolsMap.get(id))
        .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined) as Tool[];
    },
  });
  const tools = toolsQuery.data ?? [];
  const loading = toolsQuery.isLoading;

  const handleRemove = async (toolId: string) => {
    await toggleSave('tool', toolId);
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
            <CardHeader>
              <div className="flex items-center gap-4 mb-2">
                <Skeleton className="w-14 h-14 rounded-full" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center py-10 bg-muted/30 rounded-lg mt-4"
      >
        <Wrench className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          Você ainda não salvou nenhuma ferramenta.
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Explore nosso arsenal e salve suas favoritas.
        </p>
        <Button size="sm" onClick={() => router.push("/ferramentas")}>
          Ver ferramentas
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 items-stretch">
      {tools.map((tool, index) => {
        const Icon = tool.tags[0] ? CATEGORY_ICONS[tool.tags[0]] || Sparkles : Sparkles;
        const isRemoving = isToggling('tool', tool.id);

        return (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            className="h-full"
          >
            <Card className="h-full hover:shadow-md transition-shadow duration-200 flex flex-col">
              <CardHeader className="pb-2">
                <div className="grid grid-cols-[auto,1fr] gap-3 items-center mb-1">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
                    {tool.icon_url ? (
                      <img
                        src={tool.icon_url}
                        alt={`Logo de ${tool.name}`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <Icon 
                      className="w-6 h-6 text-primary" 
                      aria-hidden="true"
                      style={{ display: tool.icon_url ? 'none' : 'block' }}
                    />
                  </div>
                  <CardTitle className="text-base leading-tight">
                    {tool.name}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs leading-relaxed line-clamp-2">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {tool.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {(() => {
                      const attachmentUrl = tool.attachment_url;
                      const hasAttachment = attachmentUrl && attachmentUrl.trim();
                      const linkUrl = hasAttachment ? attachmentUrl : tool.url;
                      const buttonText = hasAttachment ? "Download" : "Acessar";

                      return linkUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => window.open(linkUrl, '_blank', 'noopener,noreferrer')}
                          aria-label={`${buttonText} ${tool.name}`}
                        >
                          <ExternalLink className="h-3 w-3 mr-1.5" />
                          {buttonText}
                        </Button>
                      ) : null;
                    })()}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(tool.id)}
                      disabled={isRemoving}
                      aria-label="Remover dos salvos"
                      className="text-muted-foreground hover:text-destructive px-2"
                    >
                      <Bookmark className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
