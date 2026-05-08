import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeoNodeData {
  seo_title?: string;
  seo_description?: string;
}

function SeoNodeComponent({ data }: { data: SeoNodeData }) {
  const { seo_title, seo_description } = data;
  const titleLen = seo_title?.length ?? 0;
  const descLen = seo_description?.length ?? 0;

  return (
    <div className="bg-card border border-blue-500/30 rounded-[1.2rem] shadow-card w-[320px] overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-500/50 transition-all">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-card" />

      <div className="bg-blue-500/8 px-3 py-2 border-b border-blue-500/15 flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-xs font-semibold">SEO</span>
        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 h-4 border-blue-500/30 text-blue-500">
          SEO
        </Badge>
      </div>

      <div className="p-3 space-y-2 text-xs">
        <div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Title</span>
            <span className={cn('text-[10px]', titleLen > 60 ? 'text-red-500' : titleLen > 50 ? 'text-amber-500' : 'text-emerald-500')}>
              {titleLen}/60
            </span>
          </div>
          <p className="font-medium truncate mt-0.5">{seo_title}</p>
        </div>
        <div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Description</span>
            <span className={cn('text-[10px]', descLen > 160 ? 'text-red-500' : descLen > 140 ? 'text-amber-500' : 'text-emerald-500')}>
              {descLen}/160
            </span>
          </div>
          <p className="text-muted-foreground leading-relaxed line-clamp-3 mt-0.5">{seo_description}</p>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-card" />
    </div>
  );
}

export const SeoNode = memo(SeoNodeComponent);
