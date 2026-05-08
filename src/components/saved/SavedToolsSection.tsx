"use client";

import { useEffect, useState } from "react";
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

// Ícones padrão para categorias
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Inteligência Artificial": Brain,
  "Produtividade": Zap,
  "Segurança e Privacidade": Shield,
  "Cursos Gratuitos": GraduationCap,
  "Utilidades": Wrench,
};

interface SavedToolsSectionProps {
  savedItems: SavedItem[];
  onRefresh: () => void;
}

export function SavedToolsSection({ savedItems, onRefresh }: SavedToolsSectionProps) {
  const router = useRouter();
  const { toggleSave, isToggling } = useSavedItems();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch full tool data for saved items
  useEffect(() => {
    const fetchTools = async () => {
      if (savedItems.length === 0) {
        setTools([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const toolIds = savedItems.map(item => item.item_id);
        
        const { data, error } = await supabase
          .from('tools_public')
          .select('*')
          .in('id', toolIds);

        if (error) throw error;

        // Sort by saved order
        const toolsMap = new Map((data || []).map(t => [t.id, t]));
        const orderedTools = toolIds
          .map(id => toolsMap.get(id))
          .filter((t): t is NonNullable<typeof t> => t !== undefined);

        setTools(orderedTools as Tool[]);
      } catch (error) {
        console.error('Error fetching tools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [savedItems]);

  const handleRemove = async (toolId: string) => {
    await toggleSave('tool', toolId);
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Ferramentas Salvas</h2>
        {tools.length > 0 && (
          <Badge variant="secondary">{tools.length}</Badge>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-full">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tools.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12 bg-muted/30 rounded-lg"
        >
          <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Você ainda não salvou nenhuma ferramenta.
          </h3>
          <p className="text-muted-foreground mb-6">
            Explore nosso arsenal e salve suas favoritas para acesso rápido.
          </p>
          <Button onClick={() => router.push("/ferramentas")}>
            Ver ferramentas
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {tools.map((tool, index) => {
            const Icon = tool.tags[0] ? CATEGORY_ICONS[tool.tags[0]] || Sparkles : Sparkles;
            const isRemoving = isToggling('tool', tool.id);

            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="h-full"
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 flex flex-col">
                  <CardHeader>
                    <div className="grid grid-cols-[auto,1fr] gap-4 items-center mb-2">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
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
                          className="w-8 h-8 text-primary" 
                          aria-hidden="true"
                          style={{ display: tool.icon_url ? 'none' : 'block' }}
                        />
                      </div>
                      <CardTitle className="text-xl leading-tight mt-0">
                        {tool.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-sm leading-relaxed flex-1">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {tool.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {(() => {
                          const attachmentUrl = tool.attachment_url;
                          const hasAttachment = attachmentUrl && attachmentUrl.trim();
                          const linkUrl = hasAttachment ? attachmentUrl : tool.url;
                          const buttonText = hasAttachment ? "Fazer download" : "Acessar";

                          return linkUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => window.open(linkUrl, '_blank', 'noopener,noreferrer')}
                              aria-label={`${buttonText} ${tool.name}`}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
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
                          className="text-muted-foreground hover:text-destructive"
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
      )}
    </div>
  );
}
