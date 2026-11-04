"use client";

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Portal } from '@radix-ui/react-tooltip';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AuthorProfileVisits } from './AuthorProfileVisits';

export function AuthorProfileActions({ authorId }: { authorId: string }) {
  const { canAccessAdmin, loading } = useUserRoles();
  return <div className="flex items-center gap-1">
    <AuthorProfileVisits authorId={authorId} />
    {!loading && canAccessAdmin && <TooltipProvider delayDuration={200}><Tooltip>
      <TooltipTrigger asChild><Link href={`/admin/autores?editar=${encodeURIComponent(authorId)}`} aria-label="Editar perfil do autor" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil size={14} strokeWidth={1.6} aria-hidden="true" /></Link></TooltipTrigger>
      <Portal><TooltipContent side="bottom" align="end">Editar perfil</TooltipContent></Portal>
    </Tooltip></TooltipProvider>}
  </div>;
}
