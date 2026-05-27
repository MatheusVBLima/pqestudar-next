"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, Eye, EyeOff, StarOff, Edit, Trash2 } from "lucide-react";
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

interface GuideListItemProps {
  guide: Guide;
  showAdmin: boolean;
  onEdit: (guide: Guide) => void;
  onDelete: (guide: Guide) => void;
  onTogglePublished: (guide: Guide) => void;
  onToggleFeatured: (guide: Guide) => void;
}

export function GuideListItem({
  guide,
  showAdmin,
  onEdit,
  onDelete,
  onTogglePublished,
  onToggleFeatured,
}: GuideListItemProps) {
  const updatedDate = guide.updated_at
    ? format(new Date(guide.updated_at), "d 'de' MMM, yyyy", { locale: ptBR })
    : null;

  // Usar categoria pública para exibição, fallback para interna
  const displayCategory = guide.public_category || guide.category;

  return (
    <article
      className="flex gap-4 sm:gap-5 p-4 rounded-[1.2rem] border border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      {/* Thumbnail - Link principal */}
      <Link
        href={`/guias/${guide.slug}`}
        className="w-20 h-20 sm:w-28 sm:h-24 shrink-0 rounded-lg bg-accent flex items-center justify-center overflow-hidden hover:opacity-90 transition-opacity"
      >
        {guide.cover_image_url ? (
          <img
            src={guide.cover_image_url}
            alt={guide.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <BookOpen className="h-7 w-7 text-primary/40" />
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <Badge
            variant="outline"
            className={`text-[11px] ${CATEGORY_COLORS[displayCategory] || CATEGORY_COLORS[guide.category] || ""}`}
          >
            {displayCategory}
          </Badge>
          {guide.is_featured && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]" variant="outline">
              <Star className="h-3 w-3 mr-0.5" /> Destaque
            </Badge>
          )}
          {showAdmin && !guide.is_published && (
            <Badge variant="secondary" className="text-[11px]">Rascunho</Badge>
          )}
        </div>

        {/* Título como Link real */}
        <h3 className="text-base sm:text-lg font-semibold leading-snug line-clamp-2 mb-1">
          <Link 
            href={`/guias/${guide.slug}`}
            className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {guide.title}
          </Link>
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-2 hidden sm:block">
          {guide.short_description}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto flex-wrap">
          {showAdmin && guide.internal_code && (
            <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{guide.internal_code}</span>
          )}
          {guide.author_name && <span>{guide.author_name}</span>}
          {updatedDate && (
            <>
              <span>·</span>
              <span>{updatedDate}</span>
            </>
          )}
        </div>

        {showAdmin && (
          <div className="flex flex-wrap gap-2 mt-3">
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
        )}
      </div>

      {/* Read CTA - desktop only, non-admin */}
      {!showAdmin && (
        <div className="hidden sm:flex items-center shrink-0">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link href={`/guias/${guide.slug}`}>
              Ler guia
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}
