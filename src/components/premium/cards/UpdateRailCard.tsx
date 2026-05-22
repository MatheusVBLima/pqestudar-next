"use client";

import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UpdateRailCardProps {
  id: string;
  title: string;
  slug: string;
  intro?: string | null;
  highlight?: string | null;
  publishedAt?: string | null;
  onOpen?: () => void;
}

export function UpdateRailCard({
  title,
  slug,
  intro,
  highlight,
  publishedAt,
  onOpen,
}: UpdateRailCardProps) {
  return (
    <Link
      href={`/premium/atualizacoes/${slug}`}
      onClick={onOpen}
      className="group relative hover:z-10 snap-start shrink-0 w-[300px] md:w-[320px] min-h-[240px] flex flex-col p-5 rounded-[1.2rem] border border-border bg-gradient-to-br from-card to-card/60 shadow-card hover:shadow-lg transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        {publishedAt ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(publishedAt), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
          </span>
        ) : (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            Editorial
          </Badge>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>

      <h3 className="font-semibold text-lg leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {highlight && (
        <div className="inline-block bg-primary/10 text-primary text-[11px] font-medium px-2 py-1 rounded-md mb-2 self-start">
          {highlight}
        </div>
      )}

      {intro && (
        <p className="text-sm text-muted-foreground line-clamp-3 mt-auto">{intro}</p>
      )}
    </Link>
  );
}
