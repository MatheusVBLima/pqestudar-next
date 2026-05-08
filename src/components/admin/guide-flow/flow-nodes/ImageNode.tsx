import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Image as ImageIcon, RefreshCw, Copy, Check, AlertTriangle, Loader2, Pencil, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImageNodeData {
  type: 'cover' | 'internal';
  position: string;
  prompt: string;
  alt_text: string;
  editorial_function?: string;
  status: 'success' | 'error' | 'generating' | 'pending' | 'prompt_only';
  url?: string;
  error?: string;
  onRegenerate?: (prompt: string, position: string) => void;
  onEditPrompt?: (position: string) => void;
}

export const ImageNode = memo(({ data }: { data: ImageNodeData }) => {
  const [copied, setCopied] = useState(false);

  const isCover = data.type === 'cover';
  const label = isCover ? 'Imagem de Capa' : `Imagem — ${data.position?.replace('after_section_', 'Seção ') ?? ''}`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(data.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <div className="bg-card border border-border rounded-[var(--admin-radius)] shadow-sm w-[300px] overflow-hidden group">
        <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />

        {/* Header */}
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground truncate">{label}</span>
          </div>
          <Badge
            variant={data.status === 'success' ? 'default' : data.status === 'error' ? 'destructive' : data.status === 'prompt_only' ? 'outline' : 'secondary'}
            className="text-[10px] px-1.5 py-0"
          >
            {data.status === 'success' ? '✓ Gerada' : data.status === 'error' ? '✗ Erro' : data.status === 'generating' ? 'Gerando...' : data.status === 'prompt_only' ? '📝 Prompt' : 'Pendente'}
          </Badge>
        </div>

        {/* Image preview */}
        <div className="p-2">
          {data.status === 'generating' && (
            <div className="flex items-center justify-center h-32 bg-muted/50 rounded-md">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {data.status === 'success' && data.url && (
            <img
              src={data.url}
              alt={data.alt_text}
              className="w-full h-32 object-cover rounded-md"
              loading="lazy"
            />
          )}

          {data.status === 'error' && (
            <div className="flex flex-col items-center justify-center h-32 bg-destructive/5 rounded-md gap-1.5">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-[10px] text-destructive">{data.error ?? 'Falha na geração'}</span>
            </div>
          )}

          {data.status === 'pending' && (
            <div className="flex items-center justify-center h-32 bg-muted/30 rounded-md">
              <span className="text-xs text-muted-foreground">Aguardando geração</span>
            </div>
          )}

          {data.status === 'prompt_only' && (
            <div className="flex flex-col items-center justify-center h-32 bg-primary/5 rounded-md gap-1.5 border border-dashed border-primary/20">
              <FileText className="h-5 w-5 text-primary/60" />
              <span className="text-[10px] text-primary/80 font-medium">Prompt pronto</span>
              <span className="text-[9px] text-muted-foreground">Sem asset gerado</span>
            </div>
          )}
        </div>

        {/* Prompt & metadata */}
        <div className="px-3 pb-2">
          {data.editorial_function && (
            <p className="text-[10px] text-primary/80 font-medium mb-1">
              📌 {data.editorial_function}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 mb-1.5">
            <span className="font-semibold">Prompt:</span> {data.prompt}
          </p>
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold">Alt:</span> {data.alt_text}
          </p>
        </div>

        {/* Actions */}
        <div className="px-3 pb-2 flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={handleCopyPrompt}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span className="ml-1">{copied ? 'Copiado' : 'Copiar'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Copiar prompt</TooltipContent>
          </Tooltip>

          {data.onEditPrompt && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => data.onEditPrompt?.(data.position)}
                >
                  <Pencil className="h-3 w-3" />
                  <span className="ml-1">Editar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Editar prompt e regenerar</TooltipContent>
            </Tooltip>
          )}

          {data.onRegenerate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => data.onRegenerate?.(data.prompt, data.position)}
                  disabled={data.status === 'generating'}
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="ml-1">Regerar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Regenerar com o mesmo prompt</TooltipContent>
            </Tooltip>
          )}
        </div>

        <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
      </div>
    </TooltipProvider>
  );
});

ImageNode.displayName = 'ImageNode';
