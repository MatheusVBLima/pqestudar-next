"use client";

import Link from 'next/link';
import { ArrowRight, Briefcase, MapPin, Bookmark, BookmarkCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface JobRailCardProps {
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

function pickCompany(tags: string[] = []): string | undefined {
  return tags.find((t) => /^empresa:/i.test(t))?.replace(/^empresa:\s*/i, '');
}
function pickLocation(tags: string[] = []): string | undefined {
  return tags.find((t) =>
    /(remot[ao]|h[ií]brid[ao]|presencial|s[aã]o paulo|rio de janeiro|brasil|nacional)/i.test(t)
  );
}
function pickContract(tags: string[] = []): string | undefined {
  return tags.find((t) => /(clt|pj|est[aá]gio|trainee|freela|jovem aprendiz)/i.test(t));
}
function pickNovo(tags: string[] = []): boolean {
  return tags.some((t) => /novo|nova/i.test(t));
}

export function JobRailCard({
  title,
  slug,
  description,
  tags = [],
  isSaved,
  isToggling,
  onToggleSave,
  onOpen,
}: JobRailCardProps) {
  const company = pickCompany(tags);
  const location = pickLocation(tags);
  const contract = pickContract(tags);
  const isNovo = pickNovo(tags);
  const otherTags = tags.filter(
    (t) =>
      t !== company &&
      t !== location &&
      t !== contract &&
      !/^empresa:/i.test(t) &&
      !/novo|nova/i.test(t)
  );
  const href = `/premium/vagas/${slug}`;

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
      className="group snap-start shrink-0 w-[280px] md:w-[300px] min-h-[260px] flex flex-col p-5 rounded-[1.2rem] border border-border bg-card shadow-card hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          {contract || 'Vaga'}
        </Badge>
        <Briefcase className="h-4 w-4 text-muted-foreground" />
      </div>

      <h3 className="font-semibold text-base leading-snug line-clamp-3 mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {company && (
        <p className="text-xs text-muted-foreground mb-2">{company}</p>
      )}

      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{description}</p>
      )}

      <div className="mt-auto space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {isNovo && <span className="text-primary font-medium">Nova</span>}
          {otherTags.length > 0 && (
            <span className="truncate max-w-[140px]">{otherTags[0]}</span>
          )}
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
              aria-label={isSaved ? 'Remover dos salvos' : 'Salvar vaga'}
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
