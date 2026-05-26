import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIAS, CATEGORIAS_PUBLICAS } from '@/lib/guide-editorial-options';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import {
  Type, Search, FileText, Megaphone, Link2, AlertTriangle,
  CheckCircle, Loader2, Plus, Trash2, Save, Cog, Eye,
} from 'lucide-react';
import type { GeneratedGuideData } from './GuideFlowPreview';

const KNOWN_AUTHORS = [
  'Equipe PqEstudar',
  'Matheus Dias',
  'Marília Brasileiro',
];

type EditorNodeType = 'meta' | 'seo' | 'content' | 'cta' | 'links';

interface NodeEditorData {
  nodeType: EditorNodeType;
  nodeId: string;
  label: string;
  // Meta
  title?: string;
  slug?: string;
  category?: string;
  author_name?: string;
  short_description?: string;
  // SEO
  seo_title?: string;
  seo_description?: string;
  // Content
  content?: string;
  sectionIndex?: number;
  // CTA
  ctaType?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaText?: string;
  // Links
  links?: Array<{ label: string; url: string }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: NodeEditorData | null;
  guideData: GeneratedGuideData;
  onSave: (updated: GeneratedGuideData) => void;
}

// ─── Slug validation ───
function useSlugValidation(slug: string, originalSlug: string) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'conflict'>('idle');

  useEffect(() => {
    if (!slug || slug === originalSlug) {
      setStatus('idle');
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('checking');
      const { data, error } = await supabase
        .from('guides')
        .select('id')
        .eq('slug', slug)
        .limit(1);

      if (!error && data && data.length > 0) {
        setStatus('conflict');
      } else {
        setStatus('ok');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, originalSlug]);

  return status;
}

export function NodeEditorSheet({ open, onClose, data, guideData, onSave }: Props) {
  const [local, setLocal] = useState<GeneratedGuideData>(guideData);
  const [originalSlug] = useState(guideData.slug);

  useEffect(() => {
    setLocal(guideData);
  }, [guideData, open]);

  const slugStatus = useSlugValidation(local.slug, originalSlug);

  const update = <K extends keyof GeneratedGuideData>(key: K, value: GeneratedGuideData[K]) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  if (!data) return null;

  const iconMap: Record<EditorNodeType, React.ElementType> = {
    meta: Type, seo: Search, content: FileText, cta: Megaphone, links: Link2,
  };
  const Icon = iconMap[data.nodeType];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">{data.label}</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Edite os campos e clique em Salvar para aplicar as mudanças ao fluxo.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 pb-20">
          {data.nodeType === 'meta' && <MetaEditor local={local} update={update} slugStatus={slugStatus} />}
          {data.nodeType === 'seo' && <SeoEditor local={local} update={update} />}
          {data.nodeType === 'content' && <ContentEditor local={local} update={update} sectionIndex={data.sectionIndex} />}
          {data.nodeType === 'cta' && <CtaEditor local={local} update={update} ctaKey={data.nodeId as 'cta_top' | 'cta_middle' | 'cta_final'} />}
          {data.nodeType === 'links' && <LinksEditor local={local} update={update} />}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t flex items-center justify-between gap-3">
          {slugStatus === 'conflict' && data.nodeType === 'meta' && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Slug em conflito — ajuste antes de salvar</span>
            </div>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={slugStatus === 'conflict'}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Meta Editor ───
function MetaEditor({ local, update, slugStatus }: {
  local: GeneratedGuideData;
  update: <K extends keyof GeneratedGuideData>(key: K, value: GeneratedGuideData[K]) => void;
  slugStatus: 'idle' | 'checking' | 'ok' | 'conflict';
}) {
  const [customAuthor, setCustomAuthor] = useState(
    !KNOWN_AUTHORS.includes(local.author_name)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Título</Label>
        <Input value={local.title} onChange={(e) => update('title', e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-2">
          Slug
          {slugStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {slugStatus === 'ok' && <CheckCircle className="h-3 w-3 text-emerald-500" />}
          {slugStatus === 'conflict' && (
            <span className="flex items-center gap-1 text-destructive text-xs font-normal">
              <AlertTriangle className="h-3 w-3" /> Já existe um guia com este slug
            </span>
          )}
        </Label>
        <Input
          value={local.slug}
          onChange={(e) => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          className={cn(slugStatus === 'conflict' && 'border-destructive focus-visible:ring-destructive')}
        />
        <p className="text-[10px] text-muted-foreground">Apenas letras minúsculas, números e hífens.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Cog className="h-3.5 w-3.5 text-primary/70" />
          Categoria Interna
        </Label>
        <Select value={local.category} onValueChange={(v) => update('category', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Editorial..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map(c => (
              <SelectItem key={c.value} value={c.label}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">Usada para guiar a IA · não exibida ao público.</p>
      </div>

      <div className="space-y-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
        <Label className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-emerald-600" />
          Categoria Pública *
        </Label>
        <Select value={local.public_category} onValueChange={(v) => update('public_category', v)}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Badge no site..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_PUBLICAS.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">Apenas badge visual · NÃO influencia geração.</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Autor</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-muted-foreground"
            onClick={() => setCustomAuthor(!customAuthor)}
          >
            {customAuthor ? 'Escolher da lista' : 'Digitar manualmente'}
          </Button>
        </div>
        {customAuthor ? (
          <Input
            value={local.author_name}
            onChange={(e) => update('author_name', e.target.value)}
            placeholder="Nome do autor"
          />
        ) : (
          <Select value={local.author_name} onValueChange={(v) => update('author_name', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KNOWN_AUTHORS.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Descrição curta</Label>
        <Textarea
          value={local.short_description}
          onChange={(e) => update('short_description', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{local.short_description.length}/160</p>
      </div>
    </div>
  );
}

// ─── SEO Editor ───
function SeoEditor({ local, update }: {
  local: GeneratedGuideData;
  update: <K extends keyof GeneratedGuideData>(key: K, value: GeneratedGuideData[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>SEO Title</Label>
          <span className={cn('text-xs', (local.seo_title?.length ?? 0) > 60 ? 'text-destructive' : 'text-muted-foreground')}>
            {local.seo_title?.length ?? 0}/60
          </span>
        </div>
        <Input value={local.seo_title} onChange={(e) => update('seo_title', e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>SEO Description</Label>
          <span className={cn('text-xs', (local.seo_description?.length ?? 0) > 160 ? 'text-destructive' : 'text-muted-foreground')}>
            {local.seo_description?.length ?? 0}/160
          </span>
        </div>
        <Textarea value={local.seo_description} onChange={(e) => update('seo_description', e.target.value)} rows={4} />
      </div>

      {/* Preview */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
        <p className="text-xs font-medium text-blue-600 truncate">{local.seo_title || 'Título SEO'}</p>
        <p className="text-[11px] text-emerald-700 truncate">pqestudar.com.br/guias/{local.slug}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2">{local.seo_description || 'Descrição SEO'}</p>
      </div>
    </div>
  );
}

// ─── Content Section Editor ───
function ContentEditor({ local, update, sectionIndex }: {
  local: GeneratedGuideData;
  update: <K extends keyof GeneratedGuideData>(key: K, value: GeneratedGuideData[K]) => void;
  sectionIndex?: number;
}) {
  // Parse sections from markdown
  const sections = parseSections(local.content_markdown);
  const idx = sectionIndex ?? 0;
  const section = sections[idx];

  const [sectionContent, setSectionContent] = useState(section?.content ?? '');

  useEffect(() => {
    const s = parseSections(local.content_markdown);
    setSectionContent(s[idx]?.content ?? '');
  }, [local.content_markdown, idx]);

  const handleContentChange = (newContent: string) => {
    setSectionContent(newContent);
    // Replace just this section in the full markdown
    const allSections = parseSections(local.content_markdown);
    allSections[idx] = { ...allSections[idx], content: newContent };
    const rebuilt = allSections.map(s => s.content).join('\n\n');
    update('content_markdown', rebuilt);
  };

  const wordCount = sectionContent.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">{wordCount} palavras</Badge>
        <Badge variant="outline" className="text-[10px]">Seção {(sectionIndex ?? 0) + 1}</Badge>
      </div>
      <MarkdownEditor value={sectionContent} onChange={handleContentChange} />
    </div>
  );
}

// ─── CTA Editor ───
function CtaEditor({ local, update, ctaKey }: {
  local: GeneratedGuideData;
  update: <K extends keyof GeneratedGuideData>(key: K, value: GeneratedGuideData[K]) => void;
  ctaKey: 'cta_top' | 'cta_middle' | 'cta_final';
}) {
  const cta = local[ctaKey];

  const updateCta = (field: string, value: string) => {
    update(ctaKey, { ...(cta || { label: '', url: '', text: '' }), [field]: value });
  };

  if (!cta) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-muted-foreground">CTA não gerada</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => update(ctaKey, { label: '', url: '', text: '' })}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar CTA
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Label do botão</Label>
        <Input value={cta.label} onChange={(e) => updateCta('label', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>URL</Label>
        <Input value={cta.url} onChange={(e) => updateCta('url', e.target.value)} placeholder="/ferramentas" />
      </div>
      <div className="space-y-1.5">
        <Label>Texto descritivo</Label>
        <Textarea value={cta.text} onChange={(e) => updateCta('text', e.target.value)} rows={3} />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => update(ctaKey, null)}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover CTA
      </Button>
    </div>
  );
}

// ─── Links Editor ───
function LinksEditor({ local, update }: {
  local: GeneratedGuideData;
  update: <K extends keyof GeneratedGuideData>(key: K, value: GeneratedGuideData[K]) => void;
}) {
  const links = local.internal_links;

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    update('internal_links', updated);
  };

  const removeLink = (index: number) => {
    update('internal_links', links.filter((_, i) => i !== index));
  };

  const addLink = () => {
    update('internal_links', [...links, { label: '', url: '' }]);
  };

  return (
    <div className="space-y-3">
      {links.map((link, i) => (
        <div key={i} className="flex items-start gap-2 p-2 rounded-lg border bg-muted/20">
          <div className="flex-1 space-y-1.5">
            <Input
              placeholder="Texto do link"
              value={link.label}
              onChange={(e) => updateLink(i, 'label', e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="URL interna"
              value={link.url}
              onChange={(e) => updateLink(i, 'url', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeLink(i)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addLink} className="gap-1.5 w-full">
        <Plus className="h-3.5 w-3.5" /> Adicionar link
      </Button>
    </div>
  );
}

// ─── Utility: parse sections from markdown ───
function parseSections(markdown: string): Array<{ title: string; content: string }> {
  const lines = markdown.split('\n');
  const sections: Array<{ title: string; content: string }> = [];
  let currentLines: string[] = [];
  let currentTitle = 'Introdução';

  const flush = () => {
    const text = currentLines.join('\n').trim();
    if (text) sections.push({ title: currentTitle, content: currentLines.join('\n') });
    currentLines = [];
  };

  for (const line of lines) {
    if (/^## /.test(line)) {
      flush();
      currentTitle = line.replace(/^##\s*\*?\*?/, '').replace(/\*?\*?\s*$/, '').trim();
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }
  flush();
  return sections;
}
