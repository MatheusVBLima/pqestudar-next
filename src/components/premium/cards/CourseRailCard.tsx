"use client";

import Link from 'next/link';
import { ArrowRight, Clock, GraduationCap, Bookmark, BookmarkCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CourseRailCardProps {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  externalUrl?: string | null;
  tags?: string[];
  isSaved?: boolean;
  isToggling?: boolean;
  onToggleSave?: () => void;
  onOpen?: () => void;
}

function pickHours(tags: string[] = []): string | undefined {
  const t = tags.find((x) => /\d+\s*h(oras)?/i.test(x));
  return t;
}
function pickModality(tags: string[] = []): string | undefined {
  return tags.find((x) => /(ead|presencial|h[ií]brido|online|remoto)/i.test(x));
}
function pickType(tags: string[] = []): string | undefined {
  return tags.find((x) =>
    /(curta|extens[aã]o|forma[çc][aã]o|gradua[çc][aã]o|p[óo]s|t[ée]cnico|livre)/i.test(x)
  );
}

export function CourseRailCard({
  title,
  slug,
  description,
  tags = [],
  isSaved,
  isToggling,
  onToggleSave,
  onOpen,
}: CourseRailCardProps) {
  const type = pickType(tags);
  const hours = pickHours(tags);
  const modality = pickModality(tags);
  const category = tags.find((t) => t !== type && t !== hours && t !== modality);
  const href = `/premium/cursos/${slug}`;

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
          {type || 'Curso'}
        </Badge>
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
      </div>

      <h3 className="font-semibold text-base leading-snug line-clamp-3 mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{description}</p>
      )}

      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {hours && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {hours}
            </span>
          )}
          {modality && <span>{modality}</span>}
          {category && <span className="truncate max-w-[140px]">{category}</span>}
        </div>

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
              aria-label={isSaved ? 'Remover dos salvos' : 'Salvar curso'}
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
