import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Copy, Check, ExternalLink, Loader2, Image as ImageIcon, RefreshCw, Calendar, HardDrive } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';

interface StorageImage {
  name: string;
  bucket: string;
  publicUrl: string;
  createdAt: string;
  size: number;
  linkedGuideSlug?: string;
}

interface StorageMetadata {
  size?: number;
}

export function ImageGalleryTab() {
  const [images, setImages] = useState<StorageImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<StorageImage | null>(null);
  const [guideCovers, setGuideCovers] = useState<Map<string, string>>(new Map());

  const loadImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: files, error } = await supabase.storage.from('guide-covers').list('', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      // Get public URLs
      const items: StorageImage[] = (files ?? [])
        .filter(f => f.name && /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name))
        .map(f => {
          const { data: urlData } = supabase.storage.from('guide-covers').getPublicUrl(f.name);
          return {
            name: f.name,
            bucket: 'guide-covers',
            publicUrl: urlData.publicUrl,
            createdAt: f.created_at ?? '',
            size: (f.metadata as StorageMetadata | null)?.size ?? 0,
          };
        });

      setImages(items);

      // Check which images are linked to guides
      const { data: guides } = await supabase
        .from('guides')
        .select('slug, cover_image_url')
        .not('cover_image_url', 'is', null);

      if (guides) {
        const map = new Map<string, string>();
        for (const g of guides) {
          if (g.cover_image_url) {
            // Extract filename from URL
            const parts = g.cover_image_url.split('/');
            const filename = parts[parts.length - 1];
            if (filename) map.set(filename, g.slug);
          }
        }
        setGuideCovers(map);
      }
    } catch (err: unknown) {
      toast({ title: 'Erro ao carregar imagens', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({ title: 'URL copiada' });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="rounded-[var(--admin-radius)]">
        <CardContent className="py-12 text-center">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma imagem encontrada no bucket guide-covers.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <ImageIcon className="h-3 w-3" />
            {images.length} imagem(ns)
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <HardDrive className="h-3 w-3" />
            guide-covers
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadImages} className="gap-1.5 rounded-[var(--admin-radius)]">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {images.map((img) => {
          const linkedSlug = guideCovers.get(img.name);
          return (
            <Card key={img.name} className="rounded-[var(--admin-radius)] overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
              <div
                className="aspect-video bg-muted relative overflow-hidden"
                onClick={() => setPreviewImage(img)}
              >
                <img
                  src={img.publicUrl}
                  alt={img.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {linkedSlug && (
                  <Badge className="absolute top-1.5 left-1.5 text-[9px] bg-primary/90">
                    Em uso
                  </Badge>
                )}
              </div>
              <CardContent className="p-2 space-y-1">
                <p className="text-[10px] text-foreground font-medium truncate" title={img.name}>
                  {img.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {formatDate(img.createdAt)}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => { e.stopPropagation(); handleCopy(img.publicUrl); }}
                        >
                          {copiedUrl === img.publicUrl ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Copiar URL</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {linkedSlug && (
                  <p className="text-[9px] text-primary truncate">
                    → {linkedSlug}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{previewImage?.name}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-3">
              <div className="rounded-[var(--admin-radius)] overflow-hidden bg-muted">
                <img
                  src={previewImage.publicUrl}
                  alt={previewImage.name}
                  className="w-full object-contain max-h-[400px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <HardDrive className="h-2.5 w-2.5" />
                  {previewImage.bucket}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {formatDate(previewImage.createdAt)}
                </Badge>
                {previewImage.size > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {formatSize(previewImage.size)}
                  </Badge>
                )}
                {guideCovers.get(previewImage.name) && (
                  <Badge className="text-[10px] bg-primary/90">
                    Vinculada ao guia: {guideCovers.get(previewImage.name)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-[var(--admin-radius)] flex-1"
                  onClick={() => handleCopy(previewImage.publicUrl)}
                >
                  {copiedUrl === previewImage.publicUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedUrl === previewImage.publicUrl ? 'Copiada!' : 'Copiar URL'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-[var(--admin-radius)]"
                  asChild
                >
                  <a href={previewImage.publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
