import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ExternalLink } from 'lucide-react';

interface CtaNodeData {
  label?: string | null;
  url?: string | null;
  text?: string | null;
  ctaType?: string;
}

function CtaNodeComponent({ data }: { data: CtaNodeData }) {
  const { label, url, text, ctaType } = data;

  return (
    <div className="bg-card border border-orange-500/30 rounded-[1.2rem] shadow-card w-[280px] overflow-hidden cursor-pointer hover:shadow-lg hover:border-orange-500/50 transition-all">
      <Handle type="target" position={Position.Left} className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-card" />

      <div className="bg-orange-500/8 px-3 py-2 border-b border-orange-500/15 flex items-center gap-2">
        <Megaphone className="h-3.5 w-3.5 text-orange-500" />
        <span className="text-xs font-semibold">CTA {ctaType}</span>
        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 h-4 border-orange-500/30 text-orange-500">
          CTA
        </Badge>
      </div>

      <div className="p-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-1.5 font-medium text-primary">
          <Megaphone className="h-3 w-3" />
          {label || 'Sem label'}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{url || '/...'}</span>
        </div>
        {text && <p className="text-muted-foreground line-clamp-2 leading-relaxed">{text}</p>}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-card" />
    </div>
  );
}

export const CtaNode = memo(CtaNodeComponent);
