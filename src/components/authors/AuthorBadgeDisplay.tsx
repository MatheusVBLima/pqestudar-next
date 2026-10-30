"use client";

import { Portal } from '@radix-ui/react-tooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { authorBadgeLevel } from '@/lib/author-badge-levels';
import type { AuthorBadge } from '@/lib/authors';
import { AuthorMedal } from './AuthorAdminDirectory';

export function AuthorBadgeDisplay({ badge }: { badge: AuthorBadge }) {
  return <TooltipProvider delayDuration={200}><Tooltip>
    <TooltipTrigger asChild>
      <button type="button" aria-label={badge.title} className="rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        <span aria-hidden="true"><AuthorMedal badge={badge} iconOnly /></span>
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
