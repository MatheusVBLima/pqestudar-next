import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Type, Tag, User, FileText, Pencil, Eye } from 'lucide-react';

interface MetaNodeData {
  title?: string;
  slug?: string;
  category?: string;
  public_category?: string;
  author_name?: string;
  short_description?: string;
}

function MetaNodeComponent({ data }: { data: MetaNodeData }) {
  const { title, slug, category, public_category, author_name, short_description } = data;

  return (
    <div className="bg-card border border-primary/30 rounded-[1.2rem] shadow-card w-[320px] overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group">
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-card" />

      <div className="bg-primary/8 px-3 py-2 border-b border-primary/15 flex items-center gap-2">
        <Type className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">Metadados</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto mr-1" />
        <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-primary/30 text-primary">
          META
        </Badge>
      </div>

      <div className="p-3 space-y-2 text-xs">
        <div>
          <span className="text-muted-foreground">Título:</span>
          <p className="font-medium truncate mt-0.5">{title}</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="h-3 w-3 shrink-0" />
          <span className="truncate">{slug}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] h-5" title="Categoria Interna (editorial)">
            <Tag className="h-2.5 w-2.5 mr-1 opacity-60" />{category || '—'}
          </Badge>
          {public_category && (
            <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" title="Categoria Pública (badge visual)">
              <Eye className="h-2.5 w-2.5 mr-1" />{public_category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <User className="h-3 w-3" /> <span className="text-[10px]">{author_name}</span>
        </div>
        {short_description && (
          <p className="text-muted-foreground leading-relaxed line-clamp-2">
            <FileText className="h-3 w-3 inline mr-1" />
            {short_description}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-card" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-card" />
    </div>
  );
}

export const MetaNode = memo(MetaNodeComponent);
