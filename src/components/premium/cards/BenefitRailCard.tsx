"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, BookmarkCheck, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { visiblePremiumTags } from "@/lib/premium-benefits";

interface BenefitRailCardProps {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  tags?: string[];
  isSaved?: boolean;
  isToggling?: boolean;
  onToggleSave?: () => void;
  onOpen?: () => void;
}

export function BenefitRailCard({
  title,
  slug,
  description,
  tags = [],
  isSaved,
  isToggling,
  onToggleSave,
  onOpen,
}: BenefitRailCardProps) {
  const visibleTags = visiblePremiumTags(tags);
  const primaryTag = visibleTags[0];
  const href = `/premium/beneficios/${slug}`;

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave?.();
  };

  return (
    <Link
      href={href}
      onClick={onOpen}
      aria-label={`Ver detalhes de ${title}`}
      className="group relative hover:z-10 snap-start shrink-0 w-[280px] md:w-[300px] min-h-[260px] flex flex-col p-5 rounded-[1.2rem] border border-border bg-card shadow-card hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          {primaryTag || "Benefício"}
        </Badge>
        <Gift className="h-4 w-4 text-muted-foreground" />
      </div>

      <h3 className="font-semibold text-base leading-snug line-clamp-3 mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{description}</p>
      )}

      <div className="mt-auto space-y-3">
        {visibleTags.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {visibleTags.slice(1, 3).map((tag) => (
              <span key={tag} className="truncate max-w-[120px]">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button size="sm" className="flex-1 pointer-events-none" tabIndex={-1}>
            Ver detalhes
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
          {onToggleSave && (
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isToggling}
              aria-label={isSaved ? "Remover dos salvos" : "Salvar benefício"}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background text-muted-foreground hover:text-primary hover:bg-accent transition-colors relative z-10"
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
