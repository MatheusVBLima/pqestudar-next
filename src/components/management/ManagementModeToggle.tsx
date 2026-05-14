"use client";

import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useManagementMode } from '@/hooks/useManagementMode';
import { cn } from '@/lib/utils';

export function ManagementModeToggle({ className }: { className?: string }) {
  const { canManage, isManagementMode, toggle } = useManagementMode();
  if (!canManage) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-pressed={isManagementMode}
      aria-label={isManagementMode ? 'Desativar modo de gerenciamento' : 'Ativar modo de gerenciamento'}
      title={isManagementMode ? 'Desativar modo de gerenciamento' : 'Ativar modo de gerenciamento'}
      className={cn(
        'h-9 w-9 p-0 rounded-[1.2rem] relative',
        isManagementMode && 'bg-primary/10 text-primary hover:bg-primary/15',
        className
      )}
    >
      <SlidersHorizontal className="h-4 w-4" />
      {isManagementMode && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
      )}
    </Button>
  );
}
