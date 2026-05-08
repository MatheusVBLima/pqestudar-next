import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, Image as ImageIcon, Loader2, Copy, Check } from 'lucide-react';
import type { ImagePrompt } from './GuideFlowPreview';

interface ImagePromptEditorProps {
  open: boolean;
  onClose: () => void;
  image: ImagePrompt;
  onRegenerate: (prompt: string, position: string) => void;
  onUpdatePrompt: (position: string, newPrompt: string) => void;
}

export function ImagePromptEditor({ open, onClose, image, onRegenerate, onUpdatePrompt }: ImagePromptEditorProps) {
  const [editedPrompt, setEditedPrompt] = useState(image.prompt);
  const [copied, setCopied] = useState(false);
  const isModified = editedPrompt !== image.prompt;

  const handleSaveAndRegenerate = () => {
    onUpdatePrompt(image.position, editedPrompt);
    onRegenerate(editedPrompt, image.position);
    onClose();
  };

  const handleSaveOnly = () => {
    onUpdatePrompt(image.position, editedPrompt);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const positionLabel = image.type === 'cover'
    ? 'Imagem de Capa'
    : `Imagem Interna — ${image.position?.replace('after_section_', 'Seção ') ?? ''}`;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-primary" />
            {positionLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview */}
          {image.url && image.status === 'success' && (
            <div className="rounded-[var(--admin-radius)] overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.alt_text}
                className="w-full object-cover max-h-[200px]"
              />
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">
              {image.type === 'cover' ? '🖼️ Capa' : '📷 Interna'}
            </Badge>
            {image.editorial_function && (
              <Badge variant="secondary" className="text-[10px]">
                📌 {image.editorial_function}
              </Badge>
            )}
            <Badge
              variant={image.status === 'success' ? 'default' : image.status === 'error' ? 'destructive' : 'secondary'}
              className="text-[10px]"
            >
              {image.status === 'success' ? '✓ Gerada' : image.status === 'error' ? '✗ Erro' : image.status === 'generating' ? 'Gerando...' : 'Pendente'}
            </Badge>
          </div>

          {/* Alt text */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Texto alternativo</Label>
            <p className="text-xs bg-muted/50 px-3 py-2 rounded-[var(--admin-radius)]">
              {image.alt_text || '—'}
            </p>
          </div>

          {/* Editable prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Prompt visual</Label>
              {isModified && (
                <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30">
                  Editado
                </Badge>
              )}
            </div>
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              rows={5}
              className="text-xs rounded-[var(--admin-radius)] font-mono"
              placeholder="Descreva a imagem desejada..."
            />
            <p className="text-[10px] text-muted-foreground">
              {editedPrompt.length} caracteres — edite livremente antes de regenerar
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 rounded-[var(--admin-radius)]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar prompt'}
          </Button>

          <div className="flex gap-2 ml-auto">
            {isModified && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveOnly}
                className="gap-1.5 rounded-[var(--admin-radius)]"
              >
                Salvar prompt
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSaveAndRegenerate}
              disabled={image.status === 'generating'}
              className="gap-1.5 rounded-[var(--admin-radius)]"
            >
              {image.status === 'generating' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isModified ? 'Salvar e Regenerar' : 'Regenerar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
