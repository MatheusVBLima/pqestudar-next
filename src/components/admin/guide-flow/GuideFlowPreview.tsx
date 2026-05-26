import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Plus, Trash2, GripVertical, Cog } from 'lucide-react';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import { CATEGORIAS, CATEGORIAS_PUBLICAS } from '@/lib/guide-editorial-options';

export interface ImagePrompt {
  type: 'cover' | 'internal';
  position: string;
  prompt: string;
  alt_text: string;
  editorial_function?: string;
  status: 'success' | 'error' | 'generating' | 'pending';
  url?: string;
  storage_path?: string;
  error?: string;
}

export interface GeneratedGuideData {
  title: string;
  slug: string;
  short_description: string;
  seo_title: string;
  seo_description: string;
  category: string;          // Categoria Interna (editorial/IA)
  public_category: string;   // Categoria Pública (badge visual)
  author_name: string;
  content_markdown: string;
  cta_top: { label: string; url: string; text: string } | null;
  cta_middle: { label: string; url: string; text: string } | null;
  cta_final: { label: string; url: string; text: string } | null;
  internal_links: Array<{ label: string; url: string }>;
  cover_image_suggestion?: string;
  cover_image_url?: string;
  image_prompts?: ImagePrompt[];
  generated_images?: ImagePrompt[];
}

interface Props {
  data: GeneratedGuideData;
  onChange: (data: GeneratedGuideData) => void;
}

function CtaEditor({ label, cta, onChange }: {
  label: string;
  cta: { label: string; url: string; text: string } | null;
  onChange: (cta: { label: string; url: string; text: string } | null) => void;
}) {
  if (!cta) {
    return (
      <div className="border border-dashed border-muted-foreground/30 rounded-[var(--admin-radius)] p-3 text-center">
        <p className="text-sm text-muted-foreground mb-2">{label} — não gerada</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ label: '', url: '', text: '' })}
          className="rounded-[var(--admin-radius)]"
        >
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-[var(--admin-radius)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <Input
        placeholder="Label do botão"
        value={cta.label}
        onChange={(e) => onChange({ ...cta, label: e.target.value })}
        className="rounded-[var(--admin-radius)] text-sm h-8"
      />
      <Input
        placeholder="URL (ex: /ferramentas)"
        value={cta.url}
        onChange={(e) => onChange({ ...cta, url: e.target.value })}
        className="rounded-[var(--admin-radius)] text-sm h-8"
      />
      <Textarea
        placeholder="Texto descritivo (Markdown)"
        value={cta.text}
        onChange={(e) => onChange({ ...cta, text: e.target.value })}
        rows={2}
        className="rounded-[var(--admin-radius)] text-sm"
      />
    </div>
  );
}

export function GuideFlowPreview({ data, onChange }: Props) {
  const update = <K extends keyof GeneratedGuideData>(key: K, value: GeneratedGuideData[K]) => {
    onChange({ ...data, [key]: value });
  };

  const addLink = () => {
    update('internal_links', [...data.internal_links, { label: '', url: '' }]);
  };

  const removeLink = (index: number) => {
    update('internal_links', data.internal_links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const links = [...data.internal_links];
    links[index] = { ...links[index], [field]: value };
    update('internal_links', links);
  };

  return (
    <Tabs defaultValue="basico" className="w-full">
      <TabsList className="w-full grid grid-cols-5 rounded-[var(--admin-radius)]">
        <TabsTrigger value="basico" className="rounded-[var(--admin-radius)] text-xs">Básico</TabsTrigger>
        <TabsTrigger value="seo" className="rounded-[var(--admin-radius)] text-xs">SEO</TabsTrigger>
        <TabsTrigger value="conteudo" className="rounded-[var(--admin-radius)] text-xs">Conteúdo</TabsTrigger>
        <TabsTrigger value="ctas" className="rounded-[var(--admin-radius)] text-xs">CTAs</TabsTrigger>
        <TabsTrigger value="links" className="rounded-[var(--admin-radius)] text-xs">Links</TabsTrigger>
      </TabsList>

      <TabsContent value="basico" className="space-y-4 mt-4">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input value={data.title} onChange={(e) => update('title', e.target.value)} className="rounded-[var(--admin-radius)]" />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input value={data.slug} onChange={(e) => update('slug', e.target.value)} className="rounded-[var(--admin-radius)]" />
        </div>
        <div className="space-y-1.5">
          <Label>Descrição curta</Label>
          <Textarea value={data.short_description} onChange={(e) => update('short_description', e.target.value)} rows={2} className="rounded-[var(--admin-radius)]" />
          <p className="text-xs text-muted-foreground">{data.short_description.length}/160</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Cog className="h-3.5 w-3.5 text-primary/70" />
              Categoria Interna
            </Label>
            <Select value={data.category} onValueChange={(v) => update('category', v)}>
              <SelectTrigger className="rounded-[var(--admin-radius)]">
                <SelectValue placeholder="Editorial..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.label}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Guia a IA · não exibida ao público.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Autor</Label>
            <Input value={data.author_name} onChange={(e) => update('author_name', e.target.value)} className="rounded-[var(--admin-radius)]" />
          </div>
        </div>
        <div className="space-y-1.5 rounded-[var(--admin-radius)] border border-emerald-500/20 bg-emerald-500/5 p-3">
          <Label className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-emerald-600" />
            Categoria Pública *
          </Label>
          <Select value={data.public_category} onValueChange={(v) => update('public_category', v)}>
            <SelectTrigger className="rounded-[var(--admin-radius)] bg-background">
              <SelectValue placeholder="Badge no site..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS_PUBLICAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">Apenas badge visual no site · NÃO influencia geração.</p>
        </div>
        {data.cover_image_suggestion && (
          <div className="p-3 bg-muted rounded-[var(--admin-radius)]">
            <p className="text-xs font-medium text-muted-foreground mb-1">💡 Sugestão de imagem de capa</p>
            <p className="text-sm">{data.cover_image_suggestion}</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="seo" className="space-y-4 mt-4">
        <div className="space-y-1.5">
          <Label>SEO Title</Label>
          <Input value={data.seo_title} onChange={(e) => update('seo_title', e.target.value)} className="rounded-[var(--admin-radius)]" />
          <p className="text-xs text-muted-foreground">{data.seo_title.length}/60</p>
        </div>
        <div className="space-y-1.5">
          <Label>SEO Description</Label>
          <Textarea value={data.seo_description} onChange={(e) => update('seo_description', e.target.value)} rows={3} className="rounded-[var(--admin-radius)]" />
          <p className="text-xs text-muted-foreground">{data.seo_description.length}/160</p>
        </div>
      </TabsContent>

      <TabsContent value="conteudo" className="mt-4">
        <MarkdownEditor
          value={data.content_markdown}
          onChange={(val) => update('content_markdown', val)}
        />
      </TabsContent>

      <TabsContent value="ctas" className="space-y-4 mt-4">
        <CtaEditor label="CTA Superior" cta={data.cta_top} onChange={(v) => update('cta_top', v)} />
        <CtaEditor label="CTA Intermediária" cta={data.cta_middle} onChange={(v) => update('cta_middle', v)} />
        <CtaEditor label="CTA Final" cta={data.cta_final} onChange={(v) => update('cta_final', v)} />
      </TabsContent>

      <TabsContent value="links" className="space-y-4 mt-4">
        {data.internal_links.map((link, i) => (
          <div key={i} className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Input
                placeholder="Texto do link"
                value={link.label}
                onChange={(e) => updateLink(i, 'label', e.target.value)}
                className="rounded-[var(--admin-radius)] text-sm h-8"
              />
              <Input
                placeholder="URL interna"
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
                className="rounded-[var(--admin-radius)] text-sm h-8"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeLink(i)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLink} className="rounded-[var(--admin-radius)] gap-1">
          <Plus className="h-3 w-3" /> Adicionar link
        </Button>
      </TabsContent>
    </Tabs>
  );
}
