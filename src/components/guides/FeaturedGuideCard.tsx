"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Star, Eye, EyeOff, StarOff, Edit, Trash2, ExternalLink } from "lucide-react";
import { Guide } from "@/hooks/useGuides";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORY_COLORS: Record<string, string> = {
  Concursos: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Ferramentas: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Oportunidades: "bg-green-500/10 text-green-600 border-green-500/20",
  Produtividade: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Carreira: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  Educação: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  Benefícios: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Listas: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  Guias: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

interface FeaturedGuideCardProps {
  guide: Guide;
  showAdmin: boolean;
  onEdit: (guide: Guide) => void;
  onDelete: (guide: Guide) => void;
  onTogglePublished: (guide: Guide) => void;
  onToggleFeatured: (guide: Guide) => void;
}

export function FeaturedGuideCard({
  guide,
  showAdmin,
  onEdit,
  onDelete,
  onTogglePublished,
  onToggleFeatured,
}: FeaturedGuideCardProps) {
  const updatedDate = guide.updated_at
    ? format(new Date(guide.updated_at), "d 'de' MMM, yyyy", { locale: ptBR })
    : null;

  // Usar categoria pública para exibição, fallback para interna
  const displayCategory = guide.public_category || guide.category;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Destaque
        </span>
      </div>

      <Card className="overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="flex flex-col md:flex-row">
          {/* Thumbnail - Link real */}
          <Link 
            href={`/guias/${guide.slug}`}
            className="md:w-2/5 bg-accent flex items-center justify-center min-h-[200px] md:min-h-[260px] overflow-hidden hover:opacity-90 transition-opacity"
          >
            {guide.cover_image_url ? (
              <img
                src={guide.cover_image_url}
                alt={guide.title}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : (
              <BookOpen className="h-16 w-16 text-primary/30" />
            )}
          </Link>

          {/* Content */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge
                variant="outline"
                className={CATEGORY_COLORS[displayCategory] || ""}
              >
                {displayCategory}
              </Badge>
              {showAdmin && !guide.is_published && (
                <Badge variant="secondary">Rascunho</Badge>
              )}
            </div>

            {/* Título como Link real */}
            <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-2">
              <Link 
                href={`/guias/${guide.slug}`}
                className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                {guide.title}
              </Link>
            </h2>

            <p className="text-muted-foreground line-clamp-3 mb-4 text-base">
              {guide.short_description}
            </p>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-5 flex-wrap">
              {showAdmin && guide.internal_code && (
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{guide.internal_code}</span>
              )}
              {guide.author_name && (
                <span className="font-medium">{guide.author_name}</span>
              )}
              {updatedDate && (
                <>
                  <span>·</span>
                  <span>{updatedDate}</span>
                </>
              )}
            </div>

            {showAdmin ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/guias/${guide.slug}?preview=1`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Prévia
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onEdit(guide); }}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onTogglePublished(guide); }}>
                  {guide.is_published ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {guide.is_published ? "Despublicar" : "Publicar"}
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onToggleFeatured(guide); }}>
                  {guide.is_featured ? <StarOff className="h-3.5 w-3.5 mr-1" /> : <Star className="h-3.5 w-3.5 mr-1" />}
                  {guide.is_featured ? "Remover destaque" : "Destacar"}
                </Button>
                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onDelete(guide); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                </Button>
              </div>
            ) : (
              <Button
                className="w-fit"
                asChild
              >
                <Link href={`/guias/${guide.slug}`}>
                  Ler guia
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
