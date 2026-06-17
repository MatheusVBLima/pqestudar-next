import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BookOpen, ExternalLink, Route } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface TrailGuidesNodeGuide {
  id: string;
  title: string;
  slug: string;
  public_category: string;
  category: string;
  short_description: string;
  cover_image_url: string | null;
  is_published: boolean;
}

export interface TrailGuidesNodeData {
  subject: string;
  stageLabel: string;
  statusLabel: string;
  guides: TrailGuidesNodeGuide[];
}

function TrailGuidesNodeComponent({ data }: { data: TrailGuidesNodeData }) {
  return (
    <div className="w-[360px] overflow-hidden rounded-[1rem] border border-primary/30 bg-card shadow-card">
      <Handle type="target" position={Position.Left} className="!bg-primary !h-3 !w-3 !border-2 !border-primary-foreground" />

      <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Route className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">{data.stageLabel}</p>
            <p className="truncate text-[10px] text-muted-foreground">{data.subject}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-primary/25 px-2 py-0.5 text-[9px] font-medium text-primary">
          {data.statusLabel}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <div>
          <p className="text-[11px] font-semibold text-foreground">Guias contados nesta etapa</p>
          <p className="text-[10px] text-muted-foreground">
            {data.guides.length > 0
              ? `${data.guides.length} guia${data.guides.length === 1 ? '' : 's'} vinculado${data.guides.length === 1 ? '' : 's'}`
              : 'Nenhum guia vinculado ainda'}
          </p>
        </div>

        {data.guides.length > 0 ? (
          <div className="nodrag nopan max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {data.guides.map((guide) => {
              const href = guide.slug ? `/guias/${guide.slug}?preview=1` : undefined;
              const category = guide.public_category || guide.category || (guide.is_published ? 'Publicado' : 'Em produção');
              const item = (
                <>
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                    {guide.cover_image_url ? (
                      <img src={guide.cover_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">{guide.title}</p>
                    <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{category}</p>
                  </div>
                  {href && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
                </>
              );

              return href ? (
                <a
                  key={guide.id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 p-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  {item}
                </a>
              ) : (
                <div key={guide.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 p-1.5">
                  {item}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-background/60 px-3 py-4 text-center text-[10px] text-muted-foreground">
            Esta etapa ainda está vazia para esse assunto. Quando um guia tiver o assunto e a etapa correspondentes, ele aparecerá aqui.
          </div>
        )}

        <p className="text-[9px] text-muted-foreground">
          Clique novamente em {data.stageLabel} no planejador para fechar este nó.
        </p>
      </div>
    </div>
  );
}

export const TrailGuidesNode = memo(TrailGuidesNodeComponent);
