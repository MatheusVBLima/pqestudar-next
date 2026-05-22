"use client";

import { BookOpen, Briefcase, Calendar, ExternalLink, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SavedRailCardProps {
  id: string;
  title: string;
  type?: string;
  externalUrl?: string | null;
  description?: string | null;
  onOpen?: () => void;
}

const typeMeta: Record<string, { label: string; icon: typeof BookOpen }> = {
  course: { label: 'Curso', icon: BookOpen },
  job: { label: 'Vaga', icon: Briefcase },
  update: { label: 'Atualização', icon: Calendar },
};

export function SavedRailCard({
  title,
  type = 'course',
  externalUrl,
  description,
  onOpen,
}: SavedRailCardProps) {
  const meta = typeMeta[type] ?? { label: 'Item', icon: Bookmark };
  const Icon = meta.icon;

  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide inline-flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {meta.label}
        </Badge>
        {externalUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <h3 className="font-semibold text-sm leading-snug line-clamp-3 mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-auto">{description}</p>
      )}
    </>
  );

  const className =
    'group relative hover:z-10 snap-start shrink-0 w-[260px] md:w-[280px] min-h-[180px] flex flex-col p-4 rounded-[1.2rem] border border-border bg-card shadow-card hover:shadow-lg transition-all';

  if (externalUrl) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}
