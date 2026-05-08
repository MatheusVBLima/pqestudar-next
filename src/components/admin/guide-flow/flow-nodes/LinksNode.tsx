import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Link2, ExternalLink } from 'lucide-react';

interface LinkNodeItem {
  label: string;
  url?: string;
}

interface LinksNodeData {
  links?: LinkNodeItem[];
}

function LinksNodeComponent({ data }: { data: LinksNodeData }) {
  const { links } = data;

  return (
    <div className="bg-card border border-indigo-500/30 rounded-[1.2rem] shadow-card w-[280px] overflow-hidden cursor-pointer hover:shadow-lg hover:border-indigo-500/50 transition-all">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-card" />

      <div className="bg-indigo-500/8 px-3 py-2 border-b border-indigo-500/15 flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-indigo-500" />
        <span className="text-xs font-semibold">Links Internos</span>
        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 h-4 border-indigo-500/30 text-indigo-500">
          {links?.length ?? 0}
        </Badge>
      </div>

      <div className="p-3 space-y-1 text-xs max-h-[180px] overflow-y-auto">
        {links?.map((link, i) => (
          <div key={i} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{link.label}</span>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-card" />
    </div>
  );
}

export const LinksNode = memo(LinksNodeComponent);
