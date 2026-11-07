"use client";

import { Portal } from '@radix-ui/react-tooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { authorBadgeLevel } from '@/lib/author-badge-levels';
import type { AuthorBadge } from '@/lib/authors';
import { AuthorBadgeSymbol } from './AuthorBadgeSymbol';

export function AuthorBadgeDisplay({ badge, compact = false }: { badge: AuthorBadge; compact?: boolean }) {
  return <TooltipProvider delayDuration={200}><Tooltip>
    <TooltipTrigger asChild>
      <button type="button" aria-label={badge.title} className={`${compact ? 'h-11 w-11 p-1.5' : 'h-[54px] w-[54px]'} shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}>
        <span className="block h-full w-full" aria-hidden="true" data-level={authorBadgeLevel(badge.code).id}><AuthorBadgeSymbol code={badge.code} title={badge.title} /></span>
      </button>
    </TooltipTrigger>
    <Portal><TooltipContent className="max-w-64 text-xs leading-relaxed">
      <strong className="mb-1 block">{badge.title}</strong>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{authorBadgeLevel(badge.code).label}</p>
      <p>{badge.description}</p>
      <p className="mt-1 text-muted-foreground">Conquistado em {new Date(badge.earned_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
    </TooltipContent></Portal>
  </Tooltip></TooltipProvider>;
}
