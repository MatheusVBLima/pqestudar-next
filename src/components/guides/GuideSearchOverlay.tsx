"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, BookOpen, Flame, Eye } from "lucide-react";
import { Guide } from "@/hooks/useGuides";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface GuideSearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guides: Guide[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

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

function GuideSearchItem({ guide, onSelect }: { guide: Guide; onSelect: () => void }) {
  const displayCategory = guide.public_category || guide.category;
  const updatedDate = guide.updated_at
    ? format(new Date(guide.updated_at), "d MMM, yyyy", { locale: ptBR })
    : null;
  const views = guide.views_count;

  return (
    <Link
      href={`/guias/${guide.slug}`}
      onClick={onSelect}
      className="group flex gap-3 p-2.5 rounded-lg hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-md bg-accent flex items-center justify-center overflow-hidden">
        {guide.cover_image_url ? (
          <img
            src={guide.cover_image_url}
            alt={guide.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <BookOpen className="h-5 w-5 text-primary/40" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="outline"
            className={cn("text-[10px] py-0 px-1.5", CATEGORY_COLORS[displayCategory] || "")}
          >
            {displayCategory}
          </Badge>
        </div>
        <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {guide.title}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          {updatedDate && <span>{updatedDate}</span>}
          {typeof views === "number" && views > 0 && (
            <>
              {updatedDate && <span>·</span>}
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {views.toLocaleString("pt-BR")}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export function GuideSearchOverlay({
  open,
  onOpenChange,
  guides,
  searchTerm,
  onSearchChange,
}: GuideSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático ao abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const trending = useMemo(() => {
    if (!guides.length) return [];
    const featured = guides
      .filter((g) => g.is_featured)
      .sort((a, b) => {
        const va = a.views_count ?? 0;
        const vb = b.views_count ?? 0;
        if (vb !== va) return vb - va;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    const byViews = [...guides].sort((a, b) => {
      const va = a.views_count ?? 0;
      const vb = b.views_count ?? 0;
      if (vb !== va) return vb - va;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    const merged: Guide[] = [];
    const seen = new Set<string>();
    for (const g of [...featured, ...byViews]) {
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      merged.push(g);
      if (merged.length >= 6) break;
    }
    return merged;
  }, [guides]);

  const results = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return guides
      .filter((g) => {
        const inTitle = g.title.toLowerCase().includes(term);
        const inDesc = (g.short_description || "").toLowerCase().includes(term);
        const cat = (g.public_category || g.category || "").toLowerCase();
        return inTitle || inDesc || cat.includes(term);
      })
      .slice(0, 12);
  }, [guides, searchTerm]);

  const hasQuery = searchTerm.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-2xl top-[10%] translate-y-0 overflow-hidden [&>button]:hidden"
      >
        <DialogTitle className="sr-only">Buscar guias</DialogTitle>
        <DialogDescription className="sr-only">
          Pesquise por guias e descubra conteúdos em alta.
        </DialogDescription>

        {/* Search bar */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar guias..."
            className="border-0 shadow-none focus-visible:ring-0 px-0 text-base h-10"
          />
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Fechar busca"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {!hasQuery && (
            <div>
              <div className="flex items-center gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-primary" />
                Em alta
              </div>
              {trending.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Nenhum guia disponível ainda.
                </p>
              ) : (
                <div className="space-y-1">
                  {trending.map((g) => (
                    <GuideSearchItem key={g.id} guide={g} onSelect={() => onOpenChange(false)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {hasQuery && (
            <div>
              <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resultados ({results.length})
              </div>
              {results.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  Nenhum guia encontrado para "{searchTerm}".
                </p>
              ) : (
                <div className="space-y-1">
                  {results.map((g) => (
                    <GuideSearchItem key={g.id} guide={g} onSelect={() => onOpenChange(false)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
