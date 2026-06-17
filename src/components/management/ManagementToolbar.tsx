"use client";

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useManagementMode } from '@/hooks/useManagementMode';

interface ManagementToolbarProps {
  createLabel: string;
  createHref?: string;
  onCreate?: () => void;
  hint?: string;
  forceVisible?: boolean;
}

export function ManagementToolbar({ createLabel, createHref, onCreate, hint, forceVisible = false }: ManagementToolbarProps) {
  const { isManagementMode } = useManagementMode();
  if (!isManagementMode && !forceVisible) return null;

  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-[1.2rem] border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
      <div className="text-sm">
        <span className="font-semibold text-primary">
          {isManagementMode ? 'Modo de gerenciamento ativo' : 'Gerenciamento de conteúdo'}
        </span>
        {hint && <span className="ml-2 text-muted-foreground">{hint}</span>}
      </div>
      {onCreate ? (
        <Button size="sm" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          {createLabel}
        </Button>
      ) : createHref ? (
        <Button asChild size="sm">
          <Link href={createHref}>
            <Plus className="mr-1.5 h-4 w-4" />
            {createLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
