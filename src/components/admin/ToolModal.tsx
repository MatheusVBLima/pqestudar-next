import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import MarkdownEditor from "@/components/admin/MarkdownEditor";
import { Tool } from "@/hooks/useTools";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Upload, Link as LinkIcon, Star, Sparkles, ImageIcon, Plus, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/error-message";

interface ToolModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tool: Partial<Tool>) => Promise<void>;
  tool?: Tool | null;
  availableTags: string[];
}

interface InternalLink {
  label: string;
  url: string;
  imageUrl?: string | null;
  imageSource?: string | null;
  imagePath?: string | null;
}

type AssetSource = "upload" | "url";

function normalizeInternalLink(link: Partial<InternalLink>): InternalLink {
  return {
    label: link.label || "",
    url: link.url || "",
    imageUrl: link.imageUrl || null,
    imageSource: link.imageSource || null,
    imagePath: link.imagePath || null,
  };
}

function isAssetSource(value: string): value is AssetSource {
  return value === "upload" || value === "url";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ToolModal({ open, onClose, onSave, tool, availableTags }: ToolModalProps) {
  // ----- Básico -----
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [logoSource, setLogoSource] = useState<AssetSource>("url");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentSource, setAttachmentSource] = useState<AssetSource>("url");
  const [uploadedAttachment, setUploadedAttachment] = useState<File | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Cover (hero estilo guia)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverMode, setCoverMode] = useState<"upload" | "url">("upload");
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Featured
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredIndefinite, setFeaturedIndefinite] = useState(false);
  const [featuredStart, setFeaturedStart] = useState("");
  const [featuredEnd, setFeaturedEnd] = useState("");

  // ----- SEO -----
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // ----- Conteúdo -----
  const [contentMarkdown, setContentMarkdown] = useState("");

  // ----- CTAs -----
  const [ctaTopLabel, setCtaTopLabel] = useState("");
  const [ctaTopUrl, setCtaTopUrl] = useState("");
  const [ctaTopText, setCtaTopText] = useState("");
  const [ctaMiddleLabel, setCtaMiddleLabel] = useState("");
  const [ctaMiddleUrl, setCtaMiddleUrl] = useState("");
  const [ctaMiddleText, setCtaMiddleText] = useState("");
  const [ctaFinalLabel, setCtaFinalLabel] = useState("");
  const [ctaFinalUrl, setCtaFinalUrl] = useState("");
  const [ctaFinalText, setCtaFinalText] = useState("");

  // ----- Links Internos -----
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset on open/tool change
  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setSlug(tool.slug || "");
      setSlugManual(true);
      setDescription(tool.description);
      setUrl(tool.url || "");
      setIconUrl(tool.icon_url || "");
      setAttachmentUrl(tool.attachment_url || "");
      setCoverImageUrl(tool.cover_image_url || null);
      setCoverUrlInput(tool.cover_image_url || "");
      setCoverMode("upload");
      setSelectedTags(tool.tags || []);
      setIsVisible(tool.is_visible);
      setIsFeatured(tool.is_featured ?? false);
      setFeaturedIndefinite(tool.featured_indefinite ?? false);
      setFeaturedStart(tool.featured_start ? tool.featured_start.slice(0, 16) : "");
      setFeaturedEnd(tool.featured_end ? tool.featured_end.slice(0, 16) : "");
      setSeoTitle(tool.seo_title || "");
      setSeoDescription(tool.seo_description || "");
      setContentMarkdown(tool.content_markdown || "");
      setCtaTopLabel(tool.cta_top_label || "");
      setCtaTopUrl(tool.cta_top_url || "");
      setCtaTopText(tool.cta_top_text || "");
      setCtaMiddleLabel(tool.cta_middle_label || "");
      setCtaMiddleUrl(tool.cta_middle_url || "");
      setCtaMiddleText(tool.cta_middle_text || "");
      setCtaFinalLabel(tool.cta_final_label || "");
      setCtaFinalUrl(tool.cta_final_url || "");
      setCtaFinalText(tool.cta_final_text || "");
      const raw = Array.isArray(tool.internal_links) ? tool.internal_links : [];
      setInternalLinks(
        raw.map(normalizeInternalLink)
      );
    } else {
      setName("");
      setSlug("");
      setSlugManual(false);
      setDescription("");
      setUrl("");
      setIconUrl("");
      setAttachmentUrl("");
      setCoverImageUrl(null);
      setCoverUrlInput("");
      setCoverMode("upload");
      setSelectedTags([]);
      setIsVisible(true);
      setIsFeatured(false);
      setFeaturedIndefinite(false);
      setFeaturedStart("");
      setFeaturedEnd("");
      setSeoTitle("");
      setSeoDescription("");
      setContentMarkdown("");
      setCtaTopLabel(""); setCtaTopUrl(""); setCtaTopText("");
      setCtaMiddleLabel(""); setCtaMiddleUrl(""); setCtaMiddleText("");
      setCtaFinalLabel(""); setCtaFinalUrl(""); setCtaFinalText("");
      setInternalLinks([]);
    }
    setErrors({});
    setUploadedFile(null);
    setUploadPreview("");
    setImageError(false);
    setLogoSource("url");
    setUploadedAttachment(null);
    setAttachmentSource("url");
  }, [tool, open]);

  // Auto-slug
  useEffect(() => {
    if (!slugManual && name) setSlug(slugify(name));
  }, [name, slugManual]);

  // ---- Logo upload helpers ----
  const handleFileSelect = (file: File) => {
    const maxSize = 1.5 * 1024 * 1024;
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Use PNG, JPG, WEBP ou SVG");
      return;
    }
    if (file.size > maxSize) {
      toast.error("Imagem muito grande. Máx 1.5MB");
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogoToStorage = async (file: File, toolId: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const filePath = `${toolId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("tools-icons")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("tools-icons").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ---- Attachment upload helpers ----
  const handleAttachmentFileSelect = (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    const allowed = [
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/plain",
      "application/epub+zip",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Formato não suportado para anexo");
      return;
    }
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máx 10MB");
      return;
    }
    setUploadedAttachment(file);
  };

  const uploadAttachmentToStorage = async (file: File, toolId: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const filePath = `${toolId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("tools-attachments")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("tools-attachments").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ---- Cover upload ----
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Capa muito grande. Máx 2MB");
      return;
    }
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Use PNG, JPG, WEBP ou SVG");
      return;
    }
    setCoverUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const id = tool?.id || "new";
      // Reusing guide-covers bucket since it's already public + open to image uploads
      const path = `tools/${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("guide-covers")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("guide-covers").getPublicUrl(path);
      setCoverImageUrl(publicData.publicUrl);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erro no upload da capa"));
    } finally {
      setCoverUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  // ---- Internal links ----
  const addLink = () =>
    setInternalLinks([...internalLinks, { label: "", url: "", imageUrl: null, imageSource: null, imagePath: null }]);
  const removeLink = (i: number) => setInternalLinks(internalLinks.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: keyof InternalLink, value: string | null) => {
    const next = internalLinks.map((link, idx) =>
      idx === i ? { ...link, [field]: value } : link
    );
    setInternalLinks(next);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setErrors((p) => ({ ...p, tags: "" }));
  };

  // ---- Validation ----
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Nome é obrigatório";
    else if (name.length > 100) newErrors.name = "Máx 100 caracteres";

    if (!description.trim()) newErrors.description = "Descrição é obrigatória";
    else if (description.length > 500) newErrors.description = "Máx 500 caracteres";

    if (url && !url.match(/^https?:\/\/.+/)) newErrors.url = "URL deve começar com http(s)://";
    if (attachmentUrl && !attachmentUrl.match(/^https?:\/\/.+/))
      newErrors.attachmentUrl = "URL deve começar com http(s)://";
    if (iconUrl && !iconUrl.match(/^https?:\/\/.+/))
      newErrors.iconUrl = "URL deve começar com http(s)://";

    if (selectedTags.length === 0) newErrors.tags = "Selecione ao menos uma categoria";

    if (isFeatured && !featuredIndefinite) {
      if (!featuredStart) newErrors.featuredStart = "Informe início";
      if (!featuredEnd) newErrors.featuredEnd = "Informe fim";
      if (featuredStart && featuredEnd && featuredEnd < featuredStart)
        newErrors.featuredEnd = "Fim deve ser após o início";
    }

    // CTAs (label e URL juntos)
    if (ctaTopLabel && !ctaTopUrl) newErrors.ctaTopUrl = "URL obrigatória";
    if (!ctaTopLabel && ctaTopUrl) newErrors.ctaTopLabel = "Label obrigatório";
    if (ctaMiddleLabel && !ctaMiddleUrl) newErrors.ctaMiddleUrl = "URL obrigatória";
    if (!ctaMiddleLabel && ctaMiddleUrl) newErrors.ctaMiddleLabel = "Label obrigatório";
    if (ctaFinalLabel && !ctaFinalUrl) newErrors.ctaFinalUrl = "URL obrigatória";
    if (!ctaFinalLabel && ctaFinalUrl) newErrors.ctaFinalLabel = "Label obrigatório";

    // Links internos
    internalLinks.forEach((link, i) => {
      if (link.label && !link.url) newErrors[`link_${i}_url`] = "URL obrigatória";
      if (!link.label && link.url) newErrors[`link_${i}_label`] = "Texto obrigatório";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let finalIconUrl = iconUrl.trim() || undefined;
      let finalAttachmentUrl = attachmentUrl.trim() || undefined;

      if (logoSource === "upload" && uploadedFile) {
        setUploading(true);
        try {
          const id = tool?.id || crypto.randomUUID();
          finalIconUrl = await uploadLogoToStorage(uploadedFile, id);
        } catch (err) {
          toast.error("Erro ao fazer upload da logo");
          setSaving(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      if (attachmentSource === "upload" && uploadedAttachment) {
        setAttachmentUploading(true);
        try {
          const id = tool?.id || crypto.randomUUID();
          finalAttachmentUrl = await uploadAttachmentToStorage(uploadedAttachment, id);
        } catch (err) {
          toast.error("Erro ao fazer upload do anexo");
          setSaving(false);
          setAttachmentUploading(false);
          return;
        } finally {
          setAttachmentUploading(false);
        }
      }

      const validLinks = internalLinks
        .filter((l) => l.label.trim() && l.url.trim())
        .map((l) => ({
          label: l.label.trim(),
          url: l.url.trim(),
          imageUrl: l.imageUrl || null,
          imageSource: l.imageSource || null,
          imagePath: l.imagePath || null,
        }));

      await onSave({
        ...(tool?.id && { id: tool.id }),
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        url: url.trim() || undefined,
        attachment_url: finalAttachmentUrl,
        icon_url: finalIconUrl,
        cover_image_url: coverImageUrl,
        tags: selectedTags,
        is_visible: isVisible,
        is_featured: isFeatured,
        featured_indefinite: isFeatured ? featuredIndefinite : false,
        featured_start:
          isFeatured && !featuredIndefinite && featuredStart
            ? new Date(featuredStart).toISOString()
            : null,
        featured_end:
          isFeatured && !featuredIndefinite && featuredEnd
            ? new Date(featuredEnd).toISOString()
            : null,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        content_markdown: contentMarkdown,
        cta_top_label: ctaTopLabel.trim() || null,
        cta_top_url: ctaTopUrl.trim() || null,
        cta_top_text: ctaTopText.trim() || null,
        cta_middle_label: ctaMiddleLabel.trim() || null,
        cta_middle_url: ctaMiddleUrl.trim() || null,
        cta_middle_text: ctaMiddleText.trim() || null,
        cta_final_label: ctaFinalLabel.trim() || null,
        cta_final_url: ctaFinalUrl.trim() || null,
        cta_final_text: ctaFinalText.trim() || null,
        internal_links: validLinks,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? "Editar Ferramenta" : "Adicionar Ferramenta"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="ctas">CTAs</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          {/* ============= BÁSICO ============= */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Cover Image (hero estilo guia) */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <ImageIcon className="h-4 w-4" /> Imagem de capa (opcional)
              </Label>
              {coverImageUrl ? (
                <div className="space-y-2">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-accent">
                    <img
                      src={coverImageUrl}
                      alt="Capa da ferramenta"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setCoverImageUrl(null);
                      setCoverUrlInput("");
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Remover capa
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Button
                      variant={coverMode === "upload" ? "default" : "outline"}
                      size="sm"
                      type="button"
                      className="h-8 text-xs"
                      onClick={() => setCoverMode("upload")}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                    </Button>
                    <Button
                      variant={coverMode === "url" ? "default" : "outline"}
                      size="sm"
                      type="button"
                      className="h-8 text-xs"
                      onClick={() => setCoverMode("url")}
                    >
                      <LinkIcon className="h-3.5 w-3.5 mr-1" /> URL
                    </Button>
                  </div>
                  {coverMode === "upload" ? (
                    <div>
                      <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="text-sm file:mr-2 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        onChange={handleCoverUpload}
                        disabled={coverUploading}
                      />
                      {coverUploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={coverUrlInput}
                        onChange={(e) => setCoverUrlInput(e.target.value)}
                        placeholder="https://..."
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        className="h-9"
                        type="button"
                        onClick={() => {
                          if (coverUrlInput.trim()) setCoverImageUrl(coverUrlInput.trim());
                        }}
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

            <div className="space-y-2">
              <Label>
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((p) => ({ ...p, name: "" }));
                }}
                placeholder="Ex: ChatGPT Plus"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManual(true);
                }}
                placeholder="slug-da-ferramenta"
              />
              <p className="text-xs text-muted-foreground">Auto-gerado a partir do nome se vazio.</p>
            </div>

            <div className="space-y-2">
              <Label>
                Descrição curta <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((p) => ({ ...p, description: "" }));
                }}
                placeholder="Resumo que aparece no card e no hero da página"
                rows={3}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="space-y-2">
              <Label>Link externo da ferramenta</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErrors((p) => ({ ...p, url: "" }));
                }}
                placeholder="https://exemplo.com"
              />
              {errors.url && <p className="text-sm text-destructive">{errors.url}</p>}
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo / Ícone</Label>
              <Tabs value={logoSource} onValueChange={(v) => isAssetSource(v) && setLogoSource(v)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <LinkIcon className="w-4 h-4 mr-2" /> URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-2">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center border-muted-foreground/25">
                    {uploadPreview ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                          <img src={uploadPreview} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-xs text-muted-foreground">{uploadedFile?.name}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadedFile(null);
                            setUploadPreview("");
                          }}
                        >
                          <X className="w-3 h-3 mr-1" /> Remover
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Selecionar imagem
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(f);
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          PNG, JPG, WEBP ou SVG • Máx 1.5MB
                        </p>
                      </>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="url" className="space-y-2">
                  <div className="flex gap-3">
                    <Input
                      type="url"
                      value={iconUrl}
                      onChange={(e) => {
                        setIconUrl(e.target.value);
                        setImageError(false);
                        setErrors((p) => ({ ...p, iconUrl: "" }));
                      }}
                      placeholder="https://exemplo.com/logo.png"
                    />
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border shrink-0">
                      {iconUrl && !imageError ? (
                        <img
                          src={iconUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <Sparkles className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {errors.iconUrl && <p className="text-sm text-destructive">{errors.iconUrl}</p>}
                </TabsContent>
              </Tabs>
            </div>

            {/* Anexo */}
            <div className="space-y-2">
              <Label>Anexo (download opcional)</Label>
              <Tabs value={attachmentSource} onValueChange={(v) => isAssetSource(v) && setAttachmentSource(v)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <LinkIcon className="w-4 h-4 mr-2" /> URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-2">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center border-muted-foreground/25">
                    {uploadedAttachment ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{uploadedAttachment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedAttachment.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setUploadedAttachment(null)}
                        >
                          <X className="w-3 h-3 mr-1" /> Remover
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => attachmentInputRef.current?.click()}
                        >
                          Selecionar arquivo
                        </Button>
                        <input
                          ref={attachmentInputRef}
                          type="file"
                          accept=".pdf,.zip,.docx,.xlsx,.xls,.txt,.epub"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAttachmentFileSelect(f);
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          PDF, ZIP, DOCX, XLSX, TXT ou EPUB • Máx 10MB
                        </p>
                      </>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="url" className="space-y-2">
                  <Input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => {
                      setAttachmentUrl(e.target.value);
                      setErrors((p) => ({ ...p, attachmentUrl: "" }));
                    }}
                    placeholder="https://exemplo.com/arquivo.pdf"
                  />
                  {errors.attachmentUrl && (
                    <p className="text-sm text-destructive">{errors.attachmentUrl}</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Categorias */}
            <div className="space-y-2">
              <Label>
                Categorias <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer px-3 py-2 text-sm"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
              {errors.tags && <p className="text-sm text-destructive">{errors.tags}</p>}
            </div>

            {/* Visível */}
            <div className="flex items-center space-x-2">
              <Switch checked={isVisible} onCheckedChange={setIsVisible} />
              <Label className="cursor-pointer">Visível para o público</Label>
            </div>

            {/* Destaque */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">Destaque</span>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isFeatured}
                  onCheckedChange={(v) => {
                    setIsFeatured(v);
                    if (!v) {
                      setFeaturedIndefinite(false);
                      setFeaturedStart("");
                      setFeaturedEnd("");
                    }
                  }}
                />
                <Label className="cursor-pointer">Ferramenta em destaque</Label>
              </div>
              {isFeatured && (
                <div className="space-y-3 pl-2 border-l-2 border-amber-400/40">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={featuredIndefinite}
                      onCheckedChange={(v) => {
                        setFeaturedIndefinite(v);
                        if (v) {
                          setFeaturedStart("");
                          setFeaturedEnd("");
                        }
                      }}
                    />
                    <Label className="cursor-pointer text-sm">Sem prazo</Label>
                  </div>
                  {!featuredIndefinite && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Início</Label>
                        <Input
                          type="datetime-local"
                          value={featuredStart}
                          onChange={(e) => setFeaturedStart(e.target.value)}
                        />
                        {errors.featuredStart && (
                          <p className="text-xs text-destructive">{errors.featuredStart}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fim</Label>
                        <Input
                          type="datetime-local"
                          value={featuredEnd}
                          onChange={(e) => setFeaturedEnd(e.target.value)}
                        />
                        {errors.featuredEnd && (
                          <p className="text-xs text-destructive">{errors.featuredEnd}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============= SEO ============= */}
          <TabsContent value="seo" className="space-y-4 mt-4">
            <div>
              <Label>SEO Title</Label>
              <Input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Título para mecanismos de busca"
              />
              <p className="text-xs text-muted-foreground mt-1">{seoTitle.length}/60 caracteres</p>
            </div>
            <div>
              <Label>SEO Description</Label>
              <Textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Descrição para mecanismos de busca"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {seoDescription.length}/160 caracteres
              </p>
            </div>
          </TabsContent>

          {/* ============= CONTEÚDO ============= */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div>
              <Label>Conteúdo (Markdown)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Texto editorial completo da página da ferramenta. Use H2/H3, listas, links internos,
                imagens etc.
              </p>
              <MarkdownEditor
                value={contentMarkdown}
                onChange={setContentMarkdown}
                placeholder="## O que é&#10;&#10;Descrição da ferramenta...&#10;&#10;## Para quem serve&#10;&#10;..."
                rows={16}
              />
            </div>
          </TabsContent>

          {/* ============= CTAs ============= */}
          <TabsContent value="ctas" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              CTAs são opcionais. Se preencher o label, a URL é obrigatória (e vice-versa). O texto
              aparece acima do botão.
            </p>

            {/* Top */}
            <div className="space-y-3">
              <p className="text-sm font-medium">CTA Superior</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={ctaTopLabel}
                    onChange={(e) => setCtaTopLabel(e.target.value)}
                    placeholder="Ex: Acessar agora"
                  />
                  {errors.ctaTopLabel && (
                    <p className="text-xs text-destructive mt-1">{errors.ctaTopLabel}</p>
                  )}
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={ctaTopUrl}
                    onChange={(e) => setCtaTopUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {errors.ctaTopUrl && (
                    <p className="text-xs text-destructive mt-1">{errors.ctaTopUrl}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Texto/descrição (opcional)</Label>
                <MarkdownEditor
                  value={ctaTopText}
                  onChange={setCtaTopText}
                  placeholder="Frase exibida acima do botão..."
                  rows={4}
                  compact
                  showHeadings={false}
                />
              </div>
            </div>

            <Separator />

            {/* Middle */}
            <div className="space-y-3">
              <p className="text-sm font-medium">CTA Intermediário</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={ctaMiddleLabel}
                    onChange={(e) => setCtaMiddleLabel(e.target.value)}
                    placeholder="Ex: Testar agora"
                  />
                  {errors.ctaMiddleLabel && (
                    <p className="text-xs text-destructive mt-1">{errors.ctaMiddleLabel}</p>
                  )}
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={ctaMiddleUrl}
                    onChange={(e) => setCtaMiddleUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {errors.ctaMiddleUrl && (
                    <p className="text-xs text-destructive mt-1">{errors.ctaMiddleUrl}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Texto/descrição (opcional)</Label>
                <MarkdownEditor
                  value={ctaMiddleText}
                  onChange={setCtaMiddleText}
                  placeholder="Frase exibida acima do botão..."
                  rows={4}
                  compact
                  showHeadings={false}
                />
              </div>
            </div>

            <Separator />

            {/* Final */}
            <div className="space-y-3">
              <p className="text-sm font-medium">CTA Final</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={ctaFinalLabel}
                    onChange={(e) => setCtaFinalLabel(e.target.value)}
                    placeholder="Ex: Começar agora"
                  />
                  {errors.ctaFinalLabel && (
                    <p className="text-xs text-destructive mt-1">{errors.ctaFinalLabel}</p>
                  )}
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={ctaFinalUrl}
                    onChange={(e) => setCtaFinalUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {errors.ctaFinalUrl && (
                    <p className="text-xs text-destructive mt-1">{errors.ctaFinalUrl}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Texto/descrição (opcional)</Label>
                <MarkdownEditor
                  value={ctaFinalText}
                  onChange={setCtaFinalText}
                  placeholder="Frase exibida acima do botão..."
                  rows={4}
                  compact
                  showHeadings={false}
                />
              </div>
            </div>
          </TabsContent>

          {/* ============= LINKS ============= */}
          <TabsContent value="links" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Links úteis exibidos ao final da página da ferramenta. Aceita URLs internas (que
              começam com "/") ou externas.
            </p>

            {internalLinks.map((link, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <Input
                        value={link.label}
                        onChange={(e) => updateLink(i, "label", e.target.value)}
                        placeholder="Texto do link"
                      />
                      {errors[`link_${i}_label`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors[`link_${i}_label`]}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        value={link.url}
                        onChange={(e) => updateLink(i, "url", e.target.value)}
                        placeholder="/guias/... ou https://..."
                      />
                      {errors[`link_${i}_url`] && (
                        <p className="text-xs text-destructive mt-1">{errors[`link_${i}_url`]}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 text-destructive"
                    onClick={() => removeLink(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addLink}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar link
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploading || attachmentUploading || coverUploading}
          >
            {saving
              ? "Salvando..."
              : tool
              ? "Salvar alterações"
              : "Criar ferramenta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
