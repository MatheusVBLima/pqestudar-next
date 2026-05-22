"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveToolButton } from "@/components/ui/save-tool-button";
import { useCurationBySlug } from "@/hooks/useCurations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tool } from "@/hooks/useTools";

function ToolCard({ tool }: { tool: Tool }) {
  return (
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
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 bg-primary/10 rounded-full" />
            )}
          </div>
          <CardTitle className="text-xl leading-tight mt-0">{tool.name}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-relaxed flex-1">
          {tool.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {tool.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            {(tool.attachment_url || tool.url) && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  window.open(tool.attachment_url || tool.url, "_blank", "noopener,noreferrer")
                }
                aria-label={tool.attachment_url ? `Fazer download de ${tool.name}` : `Acessar ${tool.name}`}
              >
                {tool.attachment_url ? "Fazer download" : "Acessar"}
              </Button>
            )}
            <SaveToolButton
              toolId={tool.id}
              toolName={tool.name}
              metadata={{
                title: tool.name,
                description: tool.description,
                icon_url: tool.icon_url || undefined,
                tags: tool.tags,
                url: tool.url || undefined,
                attachment_url: tool.attachment_url || undefined,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CuradoriaPublicNext() {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { data: curation, isLoading, isError } = useCurationBySlug(slug || "");

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        <main className="flex-1 container mx-auto px-4 py-12">
          <Skeleton className="h-10 w-1/3 mb-4" />
          <Skeleton className="h-6 w-2/3 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isError || !curation) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold mb-4">Curadoria não encontrada</h1>
          <p className="text-muted-foreground mb-8">
            A página que você procura não existe ou não está disponível.
          </p>
          <Button onClick={() => router.push("/ferramentas")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Ferramentas
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-10">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{curation.title}</h1>
            {curation.description && (
              <p className="text-xl text-muted-foreground max-w-3xl">{curation.description}</p>
            )}
          </div>

          {curation.items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>Nenhuma ferramenta nesta curadoria ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curation.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ToolCard tool={item.tool as Tool} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
