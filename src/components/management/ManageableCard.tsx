"use client";

import { type ReactNode } from 'react';
import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit, Eye, EyeOff, ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useManagementMode } from '@/hooks/useManagementMode';
import { Checkbox } from '@/components/ui/checkbox';

interface ManageableCardProps {
  id: string;
  sortable?: boolean;
  editHref?: string;
  onEdit?: () => void;
  viewHref?: string;
  isPublished?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (checked: boolean) => void;
  onTogglePublish?: () => void;
  onDelete?: () => void;
  className?: string;
  children: ReactNode;
}

export function ManageableCard({
  id,
  sortable = false,
  editHref,
  onEdit,
  viewHref,
  isPublished = true,
  selectable = false,
  selected = false,
  onSelectedChange,
  onTogglePublish,
  onDelete,
  className,
  children,
}: ManageableCardProps) {
  const { isManagementMode } = useManagementMode();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isManagementMode || !sortable,
  });

  if (!isManagementMode) return <>{children}</>;

  const style = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }
    : undefined;

  return (
    <div
      ref={sortable ? setNodeRef : undefined}
      style={style}
      className={cn(
        'relative rounded-[1.2rem] ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
        !isPublished && 'opacity-70',
        className
      )}
      {...(sortable ? attributes : {})}
    >
      <div className="pointer-events-none select-none">{children}</div>

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 rounded-t-[1.2rem] bg-background/95 px-2 py-1.5 backdrop-blur border-b border-primary/20">
        <div className="flex items-center gap-1">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange?.(Boolean(checked))}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label="Selecionar item"
              className="mx-1"
            />
          )}
          {sortable && (
            <button
              type="button"
              aria-label="Arrastar para reordenar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent cursor-grab active:cursor-grabbing"
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          {!isPublished && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Rascunho
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {viewHref && (
            <a
              href={viewHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visualizar"
              title="Visualizar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {onTogglePublish && (
            <button
              type="button"
              onClick={onTogglePublish}
              aria-label={isPublished ? 'Despublicar' : 'Publicar'}
              title={isPublished ? 'Despublicar' : 'Publicar'}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Editar"
              title="Editar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          ) : editHref ? (
            <Link
              href={editHref}
              aria-label="Editar"
              title="Editar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Edit className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Excluir"
              title="Excluir"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
