import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedGuideData } from '../GuideFlowPreview';

function computeQuickScore(data: GeneratedGuideData): { score: number; errors: number; warnings: number; ok: number } {
  let errors = 0;
  let warnings = 0;
  let ok = 0;

  // Required fields
  if (!data.title) errors++; else ok++;
  if (!data.slug) errors++; else ok++;
  if (!data.category) errors++; else ok++;
  if (!data.content_markdown) errors++; else ok++;
  if (!data.short_description) errors++; else ok++;

  // SEO
  const tLen = data.seo_title?.length ?? 0;
  if (!tLen) errors++;
  else if (tLen > 60) warnings++;
  else ok++;

  const dLen = data.seo_description?.length ?? 0;
  if (!dLen) errors++;
  else if (dLen > 160) warnings++;
  else ok++;

  // Content quality
  const words = data.content_markdown?.split(/\s+/).filter(Boolean).length ?? 0;
  if (words < 300) warnings++;
  else ok++;

  // CTAs
  if (!data.cta_top && !data.cta_middle && !data.cta_final) warnings++;
  else ok++;

  const total = errors + warnings + ok;
  const score = total > 0 ? Math.round((ok / total) * 100) : 0;

  return { score, errors, warnings, ok };
}

function ValidationNodeComponent({ data }: { data: { guideData: GeneratedGuideData } }) {
  const { guideData } = data;
  const { score, errors, warnings, ok } = useMemo(() => computeQuickScore(guideData), [guideData]);

  const color = score >= 80 ? 'emerald' : score >= 60 ? 'amber' : 'red';

  return (
    <div className="bg-card border border-emerald-500/30 rounded-[1.2rem] shadow-card w-[240px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-card" />

      <div className="bg-emerald-500/8 px-3 py-2 border-b border-emerald-500/15 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-xs font-semibold">Validação</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Score */}
        <div className="text-center">
          <div className={cn('text-3xl font-bold', `text-${color}-500`)}>{score}%</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Score editorial</p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', `bg-${color}-500`)}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle2 className="h-3 w-3" /> {ok}
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="h-3 w-3" /> {warnings}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="h-3 w-3" /> {errors}
          </span>
        </div>
      </div>
    </div>
  );
}

export const ValidationNode = memo(ValidationNodeComponent);
