"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurationById, type CurationContentItem } from "@/hooks/useCurations";

function typeLabel(type: CurationContentItem["type"]) {
  if (type === "contest") return "Concurso";
  if (type === "guide") return "Guia";
  return "Ferramenta";
}

function PreviewCard({ item }: { item: CurationContentItem }) {
  const isExternal = /^https?:\/\//.test(item.href);

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <div className="grid grid-cols-[auto,1fr] gap-4 items-center mb-2">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">{typeLabel(item.type).slice(0, 3)}</span>
            )}
          </div>
          <div className="min-w-0">
            <Badge variant="outline" className="mb-2 text-xs">
              {typeLabel(item.type)}
            </Badge>
            <CardTitle className="text-xl leading-tight mt-0">{item.title}</CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed flex-1">{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[item.category, ...(item.tags ?? [])].filter(Boolean).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <a href={item.href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
              {item.actionLabel}
              {isExternal && <ExternalLink className="ml-2 h-3.5 w-3.5" />}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminCuradoriasPreview() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { data: curation, isLoading, isError } = useCurationById(id || "");

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-6 w-2/3 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-64 w-full" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !curation) {
    return (
      <main className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold mb-3">Curadoria nao encontrada</h1>
        <Button onClick={() => router.push("/admin/curadorias")}>Voltar</Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/curadorias")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant={curation.status === "published" ? "default" : "secondary"}>
              {curation.status === "published" ? "Publicado" : "Rascunho"}
            </Badge>
            <Badge variant="outline">Previa privada</Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{curation.title}</h1>
          {curation.description && <p className="text-xl text-muted-foreground max-w-3xl">{curation.description}</p>}
        </div>
        <Button variant="outline" onClick={() => router.push(`/admin/curadorias/${curation.id}`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {curation.items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Nenhum item nesta curadoria ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {curation.items.map((item) => (
            <PreviewCard key={item.id} item={item.content} />
          ))}
        </div>
      )}
    </main>
  );
}
