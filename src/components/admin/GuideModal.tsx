"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import MarkdownEditor, { htmlToMarkdown } from "@/components/admin/MarkdownEditor";
import { Guide } from "@/hooks/useGuides";
import { Plus, Trash2, Upload, Link2, X, ImageIcon, Copy, Check, Workflow, Cog, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORIAS, mapInternaToPublica } from "@/lib/guide-editorial-options";
import { useGuidePublicCategories } from "@/hooks/useGuidePublicCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (guide: Partial<Guide>) => Promise<void>;
  guide?: Guide | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface InternalLink {
  label: string;
  url: string;
  imageUrl?: string | null;
  imageSource?: 'url' | 'upload' | null;
  imagePath?: string | null;
}

// ---------- Link Image Field ----------
function LinkImageField({
  link,
  index,
  guideId,
  onUpdate,
}: {
  link: InternalLink;
  index: number;
  guideId?: string;
  onUpdate: (field: string, value: string | null) => void;
}) {
  const [mode, setMode] = useState<'upload' | 'url'>(link.imageSource === 'url' ? 'url' : 'upload');
  const [urlInput, setUrlInput] = useState(link.imageSource === 'url' ? (link.imageUrl || '') : '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasImage = !!link.imageUrl;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 1.5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Arquivo muito grande", description: "Máximo 1.5MB", variant: "destructive" });
      return;
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Use PNG, JPG, WEBP ou SVG", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const id = guideId || 'new';
      const path = `guides/${id}/links/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('guide-link-images')
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('guide-link-images')
        .getPublicUrl(path);

      onUpdate('imageUrl', publicData.publicUrl);
      onUpdate('imageSource', 'upload');
      onUpdate('imagePath', path);
    } catch (err: unknown) {
      toast({ title: "Erro no upload", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleUrlSave = () => {
    if (!urlInput.trim()) return;
    onUpdate('imageUrl', urlInput.trim());
    onUpdate('imageSource', 'url');
    onUpdate('imagePath', null);
  };

  const handleRemove = () => {
    onUpdate('imageUrl', null);
    onUpdate('imageSource', null);
    onUpdate('imagePath', null);
    setUrlInput('');
  };

  return (
    <div className="mt-2 space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <ImageIcon className="h-3 w-3" /> Imagem (opcional)
      </Label>

      {hasImage ? (
        <div className="flex items-center gap-3">
          <img
            src={link.imageUrl!}
            alt={`Preview ${link.label || `link ${index + 1}`}`}
            className="w-14 h-14 rounded-md object-cover border border-border"
            referrerPolicy="no-referrer"
          />
          <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemove}>
            <X className="h-3.5 w-3.5 mr-1" /> Remover
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-1">
            <Button
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              type="button"
              className="h-7 text-xs"
              onClick={() => setMode('upload')}
            >
              <Upload className="h-3 w-3 mr-1" /> Upload
            </Button>
            <Button
              variant={mode === 'url' ? 'default' : 'outline'}
              size="sm"
              type="button"
              className="h-7 text-xs"
              onClick={() => setMode('url')}
            >
              <Link2 className="h-3 w-3 mr-1" /> URL
            </Button>
          </div>

          {mode === 'upload' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                onChange={handleUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
              <Button size="sm" className="h-8 text-xs" onClick={handleUrlSave} disabled={!urlInput.trim()}>
                OK
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Internal Code Field ----------
function InternalCodeField({ code }: { code?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Código copiado" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">Código interno</Label>
      <div className="flex items-center gap-2">
        <Input
          value={code || "—"}
          readOnly
          disabled
          className="font-mono text-sm tracking-wider max-w-[180px]"
        />
        {code && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copiar código</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

export function GuideModal({ open, onClose, onSave, guide }: GuideModalProps) {
  const router = useRouter();
  const { data: publicCategoriesRows } = useGuidePublicCategories();
  const publicCategoryNames = (publicCategoriesRows ?? []).map((c) => c.name);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [category, setCategory] = useState(CATEGORIAS[0].label);
  const [publicCategory, setPublicCategory] = useState<string>("Guias");
  const [shortDescription, setShortDescription] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ctaTopLabel, setCtaTopLabel] = useState("");
  const [ctaTopUrl, setCtaTopUrl] = useState("");
  const [ctaTopText, setCtaTopText] = useState("");
  const [ctaMiddleLabel, setCtaMiddleLabel] = useState("");
  const [ctaMiddleUrl, setCtaMiddleUrl] = useState("");
  const [ctaMiddleText, setCtaMiddleText] = useState("");
  const [ctaFinalLabel, setCtaFinalLabel] = useState("");
  const [ctaFinalUrl, setCtaFinalUrl] = useState("");
  const [ctaFinalText, setCtaFinalText] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverMode, setCoverMode] = useState<'upload' | 'url'>('upload');
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (guide) {
      setTitle(guide.title);
      setSlug(guide.slug);
      setSlugManual(true);
      setCategory(guide.category);
      setPublicCategory(guide.public_category || mapInternaToPublica(guide.category));
      setShortDescription(guide.short_description);
      const content = guide.content_markdown || "";
      const hasHtml = /<\s*(?:p|ol|ul|li|h[1-6]|div|br|strong|em)\b[^>]*>/i.test(content);
      setContentMarkdown(hasHtml ? htmlToMarkdown(content) : content);
      setSeoTitle(guide.seo_title);
      setSeoDescription(guide.seo_description);
      setCtaTopLabel(guide.cta_top_label || "");
      setCtaTopUrl(guide.cta_top_url || "");
      setCtaTopText(guide.cta_top_text || "");
      setCtaMiddleLabel(guide.cta_middle_label || "");
      setCtaMiddleUrl(guide.cta_middle_url || "");
      setCtaMiddleText(guide.cta_middle_text || "");
      setCtaFinalLabel(guide.cta_final_label || "");
      setCtaFinalUrl(guide.cta_final_url || "");
      setCtaFinalText(guide.cta_final_text || "");
      setIsPublished(guide.is_published);
      setIsFeatured(guide.is_featured);
      setSortOrder(guide.sort_order);
      setAuthorName(guide.author_name || "");
      setCoverImageUrl(guide.cover_image_url || null);
      setCoverUrlInput(guide.cover_image_url || "");
      setCoverMode('upload');
      // Load links with image fields
      const rawLinks = Array.isArray(guide.internal_links) ? guide.internal_links : [];
      setInternalLinks(rawLinks.map((l) => ({
        label: l.label || '',
        url: l.url || '',
        imageUrl: l.imageUrl || null,
        imageSource: l.imageSource || null,
        imagePath: l.imagePath || null,
      })));
    } else {
      setTitle(""); setSlug(""); setSlugManual(false);
      setCategory(CATEGORIAS[0].label); setPublicCategory("Guias"); setShortDescription("");
      setContentMarkdown(""); setSeoTitle(""); setSeoDescription("");
      setCtaTopLabel(""); setCtaTopUrl(""); setCtaTopText("");
      setCtaMiddleLabel(""); setCtaMiddleUrl(""); setCtaMiddleText("");
      setCtaFinalLabel(""); setCtaFinalUrl(""); setCtaFinalText("");
      setIsPublished(false); setIsFeatured(false); setSortOrder(0);
      setAuthorName("");
      setCoverImageUrl(null); setCoverUrlInput(""); setCoverMode('upload');
      setInternalLinks([]);
    }
    setErrors({});
  }, [guide, open]);

  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Título obrigatório";
    if (!slug.trim()) errs.slug = "Slug obrigatório";
    if (!category.trim()) errs.category = "Categoria Interna obrigatória";
    if (!publicCategory || (publicCategoryNames.length > 0 && !publicCategoryNames.includes(publicCategory))) {
      errs.publicCategory = "Categoria Pública obrigatória";
    }
    if (!shortDescription.trim()) errs.shortDescription = "Descrição curta obrigatória";
    if (!seoTitle.trim()) errs.seoTitle = "SEO Title obrigatório";
    if (!seoDescription.trim()) errs.seoDescription = "SEO Description obrigatória";
    if (ctaTopLabel && !ctaTopUrl) errs.ctaTopUrl = "URL obrigatória quando label preenchido";
    if (!ctaTopLabel && ctaTopUrl) errs.ctaTopLabel = "Label obrigatório quando URL preenchida";
    if (ctaMiddleLabel && !ctaMiddleUrl) errs.ctaMiddleUrl = "URL obrigatória quando label preenchido";
    if (!ctaMiddleLabel && ctaMiddleUrl) errs.ctaMiddleLabel = "Label obrigatório quando URL preenchida";
    if (ctaFinalLabel && !ctaFinalUrl) errs.ctaFinalUrl = "URL obrigatória quando label preenchido";
    if (!ctaFinalLabel && ctaFinalUrl) errs.ctaFinalLabel = "Label obrigatório quando URL preenchida";
    internalLinks.forEach((link, i) => {
      if (link.label && !link.url) errs[`link_${i}_url`] = "URL obrigatória";
      if (!link.label && link.url) errs[`link_${i}_label`] = "Texto obrigatório";
      if (link.url && !link.url.startsWith("/")) errs[`link_${i}_url`] = "URL deve ser interna (começar com /)";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const validLinks = internalLinks
        .filter(l => l.label.trim() && l.url.trim())
        .map(l => ({
          label: l.label.trim(),
          url: l.url.trim(),
          imageUrl: l.imageUrl || null,
          imageSource: l.imageSource || null,
          imagePath: l.imagePath || null,
        }));
      const payload: Partial<Guide> = {
        title: title.trim(),
        slug: slug.trim(),
        category,
        public_category: publicCategory,
        short_description: shortDescription.trim(),
        content_markdown: contentMarkdown,
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        cta_top_label: ctaTopLabel.trim() || null,
        cta_top_url: ctaTopUrl.trim() || null,
        cta_middle_label: ctaMiddleLabel.trim() || null,
        cta_middle_url: ctaMiddleUrl.trim() || null,
        cta_final_label: ctaFinalLabel.trim() || null,
        cta_final_url: ctaFinalUrl.trim() || null,
        is_published: isPublished,
        is_featured: isFeatured,
        sort_order: sortOrder,
      };
      payload.cta_top_text = ctaTopText.trim() || null;
      payload.cta_middle_text = ctaMiddleText.trim() || null;
      payload.cta_final_text = ctaFinalText.trim() || null;
      payload.internal_links = validLinks;
      payload.author_name = authorName.trim() || "Equipe PqEstudar";
      payload.cover_image_url = coverImageUrl || null;
      if (guide) payload.id = guide.id;
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => setInternalLinks([...internalLinks, { label: "", url: "", imageUrl: null, imageSource: null, imagePath: null }]);
  const removeLink = (i: number) => setInternalLinks(internalLinks.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: string, value: string | null) => {
    const updated = [...internalLinks];
    updated[i] = { ...updated[i], [field]: value };
    setInternalLinks(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guide ? "Editar guia" : "Novo guia"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="ctas">CTAs</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Internal Code (read-only) */}
            {guide && (
              <InternalCodeField code={guide.internal_code} />
            )}
            <Separator />
            {/* Cover Image */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <ImageIcon className="h-4 w-4" /> Imagem de capa (opcional)
              </Label>
              {coverImageUrl ? (
                <div className="space-y-2">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-accent">
                    <img
                      src={coverImageUrl}
                      alt="Capa do guia"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => { setCoverImageUrl(null); setCoverUrlInput(""); }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Remover imagem
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Button
                      variant={coverMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      type="button"
                      className="h-8 text-xs"
                      onClick={() => setCoverMode('upload')}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                    </Button>
                    <Button
                      variant={coverMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      type="button"
                      className="h-8 text-xs"
                      onClick={() => setCoverMode('url')}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" /> URL
                    </Button>
                  </div>

                  {coverMode === 'upload' ? (
                    <div>
                      <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="text-sm file:mr-2 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
                            return;
                          }
                          const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
                          if (!allowed.includes(file.type)) {
                            toast({ title: "Formato não suportado", description: "Use PNG, JPG, WEBP ou SVG", variant: "destructive" });
                            return;
                          }
                          setCoverUploading(true);
                          try {
                            const ext = file.name.split('.').pop() || 'png';
                            const id = guide?.id || 'new';
                            const path = `${id}/${Date.now()}.${ext}`;
                            const { error: uploadError } = await supabase.storage
                              .from('guide-covers')
                              .upload(path, file, { upsert: false });
                            if (uploadError) throw uploadError;
                            const { data: publicData } = supabase.storage
                              .from('guide-covers')
                              .getPublicUrl(path);
                            setCoverImageUrl(publicData.publicUrl);
                          } catch (err: unknown) {
                            toast({ title: "Erro no upload", description: getErrorMessage(err), variant: "destructive" });
                          } finally {
                            setCoverUploading(false);
                            if (coverFileRef.current) coverFileRef.current.value = '';
                          }
                        }}
                        disabled={coverUploading}
                      />
                      {coverUploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={coverUrlInput}
                        onChange={e => setCoverUrlInput(e.target.value)}
                        placeholder="https://..."
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        className="h-9"
                        type="button"
                        onClick={() => { if (coverUrlInput.trim()) setCoverImageUrl(coverUrlInput.trim()); }}
                        disabled={!coverUrlInput.trim()}
                      >
                        OK
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do guia" />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={slug} onChange={e => { setSlug(e.target.value); setSlugManual(true); }} placeholder="slug-do-guia" />
              {errors.slug && <p className="text-xs text-destructive mt-1">{errors.slug}</p>}
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Cog className="h-3.5 w-3.5 text-primary/70" />
                Categoria Interna *
              </Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={category} onChange={e => {
                const v = e.target.value;
                setCategory(v);
                // sugere pública se vazia
                if (!publicCategory) setPublicCategory(mapInternaToPublica(v));
              }}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.label}>{c.label}</option>)}
                {/* fallback para valores legados que não estão na lista atual */}
                {!CATEGORIAS.some(c => c.label === category) && category && (
                  <option value={category}>{category} (legado)</option>
                )}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Editorial · guia a IA · não exibida ao público.</p>
              {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
            </div>
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                Categoria Pública *
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={publicCategory}
                onChange={e => setPublicCategory(e.target.value)}
              >
                {publicCategoryNames.map(c => <option key={c} value={c}>{c}</option>)}
                {/* fallback se a categoria atual não estiver mais ativa */}
                {publicCategory && publicCategoryNames.length > 0 && !publicCategoryNames.includes(publicCategory) && (
                  <option value={publicCategory}>{publicCategory} (legado)</option>
                )}
              </select>
              <p className="text-[10px] text-muted-foreground">Apenas badge no site · NÃO influencia geração.</p>
              {errors.publicCategory && <p className="text-xs text-destructive mt-1">{errors.publicCategory}</p>}
            </div>
            <div>
              <Label>Descrição curta *</Label>
              <Textarea value={shortDescription} onChange={e => setShortDescription(e.target.value)} placeholder="Resumo que aparece no card" rows={3} />
              {errors.shortDescription && <p className="text-xs text-destructive mt-1">{errors.shortDescription}</p>}
            </div>
            <Separator />
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                <Label>Publicado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                <Label>Destaque</Label>
              </div>
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
            </div>
            <div>
              <Label>Autor</Label>
              <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Equipe PqEstudar" />
              <p className="text-xs text-muted-foreground mt-1">Se vazio, será salvo como "Equipe PqEstudar"</p>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4 mt-4">
            <div>
              <Label>SEO Title *</Label>
              <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Título para mecanismos de busca" />
              {errors.seoTitle && <p className="text-xs text-destructive mt-1">{errors.seoTitle}</p>}
              <p className="text-xs text-muted-foreground mt-1">{seoTitle.length}/60 caracteres</p>
            </div>
            <div>
              <Label>SEO Description *</Label>
              <Textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="Descrição para mecanismos de busca" rows={3} />
              {errors.seoDescription && <p className="text-xs text-destructive mt-1">{errors.seoDescription}</p>}
              <p className="text-xs text-muted-foreground mt-1">{seoDescription.length}/160 caracteres</p>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div>
              <Label>Conteúdo (Markdown)</Label>
              <MarkdownEditor value={contentMarkdown} onChange={setContentMarkdown} placeholder="## Seção&#10;&#10;Conteúdo do guia em Markdown..." rows={16} />
            </div>
          </TabsContent>

          <TabsContent value="ctas" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              CTAs são opcionais. Se preencher o label, a URL é obrigatória (e vice-versa). O texto é exibido acima do botão.
            </p>

            {/* CTA Superior */}
            <div className="space-y-3">
              <p className="text-sm font-medium">CTA Superior</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input value={ctaTopLabel} onChange={e => setCtaTopLabel(e.target.value)} placeholder="Ex: Ver ferramentas" />
                  {errors.ctaTopLabel && <p className="text-xs text-destructive mt-1">{errors.ctaTopLabel}</p>}
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={ctaTopUrl} onChange={e => setCtaTopUrl(e.target.value)} placeholder="https://..." />
                  {errors.ctaTopUrl && <p className="text-xs text-destructive mt-1">{errors.ctaTopUrl}</p>}
                </div>
              </div>
              <div>
                <Label>Texto/descrição (opcional)</Label>
                <MarkdownEditor value={ctaTopText} onChange={setCtaTopText} placeholder="Frase exibida acima do botão..." rows={4} compact showHeadings={false} />
              </div>
            </div>

            <Separator />

            {/* CTA Intermediário */}
            <div className="space-y-3">
              <p className="text-sm font-medium">CTA Intermediário</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input value={ctaMiddleLabel} onChange={e => setCtaMiddleLabel(e.target.value)} placeholder="Ex: Explorar concursos" />
                  {errors.ctaMiddleLabel && <p className="text-xs text-destructive mt-1">{errors.ctaMiddleLabel}</p>}
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={ctaMiddleUrl} onChange={e => setCtaMiddleUrl(e.target.value)} placeholder="https://..." />
                  {errors.ctaMiddleUrl && <p className="text-xs text-destructive mt-1">{errors.ctaMiddleUrl}</p>}
                </div>
              </div>
              <div>
                <Label>Texto/descrição (opcional)</Label>
                <MarkdownEditor value={ctaMiddleText} onChange={setCtaMiddleText} placeholder="Frase exibida acima do botão..." rows={4} compact showHeadings={false} />
              </div>
            </div>

            <Separator />

            {/* CTA Final */}
            <div className="space-y-3">
              <p className="text-sm font-medium">CTA Final</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input value={ctaFinalLabel} onChange={e => setCtaFinalLabel(e.target.value)} placeholder="Ex: Começar agora" />
                  {errors.ctaFinalLabel && <p className="text-xs text-destructive mt-1">{errors.ctaFinalLabel}</p>}
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={ctaFinalUrl} onChange={e => setCtaFinalUrl(e.target.value)} placeholder="https://..." />
                  {errors.ctaFinalUrl && <p className="text-xs text-destructive mt-1">{errors.ctaFinalUrl}</p>}
                </div>
              </div>
              <div>
                <Label>Texto/descrição (opcional)</Label>
                <MarkdownEditor value={ctaFinalText} onChange={setCtaFinalText} placeholder="Frase exibida acima do botão..." rows={4} compact showHeadings={false} />
              </div>
            </div>
          </TabsContent>

          {/* Links Internos tab */}
          <TabsContent value="links" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Links internos exibidos na seção "Links úteis" ao final do guia. URLs devem começar com "/".
            </p>

            {internalLinks.map((link, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          value={link.label}
                          onChange={e => updateLink(i, "label", e.target.value)}
                          placeholder="Texto do link"
                        />
                        {errors[`link_${i}_label`] && <p className="text-xs text-destructive mt-1">{errors[`link_${i}_label`]}</p>}
                      </div>
                      <div>
                        <Input
                          value={link.url}
                          onChange={e => updateLink(i, "url", e.target.value)}
                          placeholder="/guias/... ou /ferramentas"
                        />
                        {errors[`link_${i}_url`] && <p className="text-xs text-destructive mt-1">{errors[`link_${i}_url`]}</p>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="mt-0.5 text-destructive" onClick={() => removeLink(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <LinkImageField
                  link={link}
                  index={i}
                  guideId={guide?.id}
                  onUpdate={(field, value) => updateLink(i, field, value)}
                />
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addLink}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar link
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6">
          <div>
            {guide && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onClose();
                  router.push(`/admin/fluxo-guias?guide=${guide.id}`);
                }}
              >
                <Workflow className="h-4 w-4" />
                {guide.flow_data ? 'Abrir no Fluxo' : 'Editar no Fluxo'}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : guide ? "Salvar alterações" : "Criar guia"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
