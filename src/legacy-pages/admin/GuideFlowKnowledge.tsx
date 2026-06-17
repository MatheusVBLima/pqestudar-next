"use client";

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/admin/dashboard/PageHeader';
import { ImageGalleryTab } from '@/components/admin/guide-flow/ImageGalleryTab';
import { useGuideFlowKnowledge, type KnowledgeEntry, type ExtractionStatus } from '@/hooks/useGuideFlowKnowledge';
import { AI_MODEL_OPTIONS, AI_PROVIDER_OPTIONS, type GuideFlowAiProvider } from '@/components/admin/guide-flow/GuideFlowForm';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen, Loader2, Eye, EyeOff, RefreshCw, Package, PenTool, CheckCircle2, AlertCircle, FileQuestion, Clock, Image as ImageIcon, ChevronDown, Check, Globe2, Sparkles } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';

const CATEGORIES = [
  { value: 'editorial', label: '✍️ Editorial' },
  { value: 'tom', label: '🗣️ Tom e Linguagem' },
  { value: 'cta', label: '🎯 CTAs' },
  { value: 'seo', label: '🔍 SEO' },
  { value: 'estrutura', label: '🏗️ Estrutura' },
  { value: 'referencia', label: '📚 Referência' },
  { value: 'geral', label: '📋 Geral' },
];

const categoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

const EXTRACTION_CONFIG: Record<ExtractionStatus, { label: string; icon: typeof CheckCircle2; className: string; description: string }> = {
  success: { label: 'Extraído', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', description: 'Conteúdo textual extraído com sucesso do arquivo.' },
  partial: { label: 'Parcial', icon: AlertCircle, className: 'text-amber-600 bg-amber-500/10 border-amber-500/20', description: 'Extração parcial — parte do conteúdo pode estar ausente.' },
  no_text: { label: 'Sem texto', icon: FileQuestion, className: 'text-orange-600 bg-orange-500/10 border-orange-500/20', description: 'Arquivo não contém texto extraível (ex: PDF escaneado).' },
  error: { label: 'Erro', icon: AlertCircle, className: 'text-red-600 bg-red-500/10 border-red-500/20', description: 'Erro durante a extração do conteúdo.' },
  pending: { label: 'Pendente', icon: Clock, className: 'text-blue-600 bg-blue-500/10 border-blue-500/20', description: 'Conteúdo ainda não foi extraído. Sincronize novamente.' },
  not_applicable: { label: 'Manual', icon: PenTool, className: 'text-muted-foreground bg-muted/50 border-muted', description: 'Entrada criada manualmente — sem extração automática.' },
};

type SourceFilter = 'all' | 'storage' | 'manual';

interface FormData {
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

const EMPTY_FORM: FormData = { title: '', content: '', category: 'geral', is_active: true, sort_order: 0 };
const controlPillClass = "h-9 rounded-[var(--admin-radius)] border border-border bg-card px-3 text-xs font-semibold text-foreground";
const counterPillClass = `${controlPillClass} inline-flex items-center gap-1.5`;

function InlineFilterSelect({
  value,
  options,
  widthClass,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  widthClass: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${controlPillClass} flex w-full items-center justify-between gap-3 pl-3 pr-4 text-left transition-colors hover:bg-accent/60 focus:outline-none focus:ring-2 focus:ring-primary`}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-[var(--admin-radius)] border border-border bg-card p-1 shadow-lg">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-[calc(var(--admin-radius)-2px)] px-2.5 py-2 text-left text-xs transition-colors ${
                  active
                    ? 'bg-primary/20 text-primary'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Check className={`h-3.5 w-3.5 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`} />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GuideFlowKnowledge() {
  const { entries, isLoading, isSyncing, isAnalyzing, createEntry, updateEntry, deleteEntry, syncStorage, analyzeWebsite } = useGuideFlowKnowledge();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<SourceFilter>('all');
  const [analysisUrl, setAnalysisUrl] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [analysisProvider, setAnalysisProvider] = useState<GuideFlowAiProvider>('lovable');
  const [analysisModel, setAnalysisModel] = useState(AI_MODEL_OPTIONS.lovable[0]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      is_active: entry.is_active,
      sort_order: entry.sort_order,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Título e conteúdo são obrigatórios.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await updateEntry(editingId, form);
        toast({ title: 'Entrada atualizada' });
      } else {
        await createEntry(form);
        toast({ title: 'Entrada criada' });
      }
      setModalOpen(false);
    } catch (err: unknown) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      toast({ title: 'Entrada removida' });
    } catch (err: unknown) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  const handleToggle = async (entry: KnowledgeEntry) => {
    try {
      await updateEntry(entry.id, { is_active: !entry.is_active });
      toast({ title: entry.is_active ? 'Entrada desativada' : 'Entrada ativada' });
    } catch (err: unknown) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    const result = await syncStorage();
    if (result) {
      toast({
        title: 'Sincronização concluída',
        description: `${result.totalFound} arquivo(s) — ${result.totalCreated} novo(s), ${result.totalExtracted} extraído(s), ${result.totalExisting} existente(s)${result.totalErrors > 0 ? `, ${result.totalErrors} erro(s)` : ''}`,
      });
    }
  };

  const handleAnalyzeUrl = async () => {
    const url = analysisUrl.trim();
    if (!url) {
      toast({ title: 'Link obrigatório', description: 'Informe a URL do site que deve ser analisado.', variant: 'destructive' });
      return;
    }

    const result = await analyzeWebsite({
      url,
      notes: analysisNotes,
      aiProvider: analysisProvider,
      textModel: analysisModel,
    });

    if (!result) return;
    toast({
      title: 'Contexto salvo na Biblioteca',
      description: `${result.title}${result.source_path ? ` — ${result.source_path}` : ''}`,
    });
  };

  const storageCount = entries.filter((e) => e.source_type === 'storage').length;
  const manualCount = entries.filter((e) => e.source_type === 'manual').length;
  const extractedCount = entries.filter((e) => e.extraction_status === 'success').length;
  const pendingCount = entries.filter((e) => e.extraction_status === 'pending').length;

  let filtered = entries;
  if (filterCategory !== 'all') filtered = filtered.filter((e) => e.category === filterCategory);
  if (filterSource !== 'all') filtered = filtered.filter((e) => e.source_type === filterSource);

  const activeCount = entries.filter((e) => e.is_active).length;

  const ExtractionBadge = ({ status }: { status: ExtractionStatus }) => {
    const config = EXTRACTION_CONFIG[status];
    const Icon = config.icon;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`text-[10px] shrink-0 gap-0.5 border ${config.className}`}>
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            {config.description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de Conhecimento"
        description="Regras editoriais, referências e imagens usadas pela IA na geração de guias."
      />

      <Tabs defaultValue="knowledge" className="w-full">
        <TabsList className="rounded-[var(--admin-radius)]">
          <TabsTrigger value="knowledge" className="gap-1.5 rounded-[var(--admin-radius)]">
            <BookOpen className="h-3.5 w-3.5" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5 rounded-[var(--admin-radius)]">
            <ImageIcon className="h-3.5 w-3.5" />
            Imagens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="mt-4">
          <ImageGalleryTab />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4 space-y-4">

      <Card className="rounded-[var(--admin-radius)] border-primary/20 bg-primary/5">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Globe2 className="h-4 w-4 text-primary" />
                Analisar site por link
              </h2>
              <p className="text-xs text-muted-foreground">
                Gera um arquivo .txt em Markdown no bucket guide-library e adiciona como contexto extraído.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_240px]">
            <div className="space-y-1.5">
              <Label>Link do site ou ferramenta</Label>
              <Input
                value={analysisUrl}
                onChange={(event) => setAnalysisUrl(event.target.value)}
                placeholder="https://exemplo.com"
                className="h-9 rounded-[var(--admin-radius)] bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label>IA da análise</Label>
              <InlineFilterSelect
                value={analysisProvider}
                widthClass="w-full"
                onChange={(value) => {
                  const provider = value as GuideFlowAiProvider;
                  setAnalysisProvider(provider);
                  setAnalysisModel(AI_MODEL_OPTIONS[provider][0]);
                }}
                options={AI_PROVIDER_OPTIONS.map((provider) => ({
                  value: provider.value,
                  label: provider.label,
                }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <InlineFilterSelect
                value={analysisModel}
                widthClass="w-full"
                onChange={setAnalysisModel}
                options={AI_MODEL_OPTIONS[analysisProvider].map((model) => ({
                  value: model,
                  label: model,
                }))}
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label>Orientação opcional</Label>
              <Textarea
                value={analysisNotes}
                onChange={(event) => setAnalysisNotes(event.target.value)}
                placeholder="Ex: foco em cursos gratuitos com certificado, regras de acesso e limites de aceitação."
                rows={2}
                className="rounded-[var(--admin-radius)] bg-background text-xs"
              />
            </div>
            <Button
              type="button"
              onClick={handleAnalyzeUrl}
              disabled={isAnalyzing || !analysisUrl.trim()}
              className="h-9 gap-1.5 rounded-[var(--admin-radius)] px-4 text-xs font-semibold"
            >
              {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isAnalyzing ? 'Analisando...' : 'Analisar link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={counterPillClass}>
            <BookOpen className="h-3 w-3" />
            {entries.length} entrada(s) — {activeCount} ativa(s)
          </Badge>
          <Badge variant="outline" className={counterPillClass}>
            <Package className="h-3 w-3" /> {storageCount} Storage
          </Badge>
          <Badge variant="outline" className={counterPillClass}>
            <PenTool className="h-3 w-3" /> {manualCount} Manual
          </Badge>
          <Badge variant="outline" className={`${counterPillClass} text-emerald-600 border-emerald-500/20`}>
            <CheckCircle2 className="h-3 w-3" /> {extractedCount} extraído(s)
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="outline" className={`${counterPillClass} text-blue-600 border-blue-500/20`}>
              <Clock className="h-3 w-3" /> {pendingCount} pendente(s)
            </Badge>
          )}

          <InlineFilterSelect
            value={filterCategory}
            widthClass="w-[160px]"
            onChange={setFilterCategory}
            options={[
              { value: 'all', label: 'Todas categorias' },
              ...CATEGORIES.map((category) => ({ value: category.value, label: category.label })),
            ]}
          />

          <InlineFilterSelect
            value={filterSource}
            widthClass="w-[150px]"
            onChange={(value) => setFilterSource(value as SourceFilter)}
            options={[
              { value: 'all', label: 'Todas origens' },
              { value: 'storage', label: 'Storage' },
              { value: 'manual', label: 'Manual' },
            ]}
          />

          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="hidden"
            aria-hidden="true"
          >
            <option value="all">Todas categorias</option>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={filterSource}
            onChange={(event) => setFilterSource(event.target.value as SourceFilter)}
            className="hidden"
            aria-hidden="true"
          >
            <option value="all">Todas origens</option>
            <option value="storage">Storage</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className={`${controlPillClass} gap-1.5 hover:bg-accent/60`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Storage'}
          </Button>
          <Button onClick={openCreate} className="h-9 gap-1.5 rounded-[var(--admin-radius)] px-4 text-xs font-semibold" size="sm">
            <Plus className="h-4 w-4" /> Nova entrada
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-[var(--admin-radius)]">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {entries.length === 0
                ? 'Nenhuma entrada na biblioteca. Sincronize o Storage ou crie regras editoriais manualmente.'
                : 'Nenhuma entrada com os filtros selecionados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <Card
              key={entry.id}
              className={`rounded-[var(--admin-radius)] transition-opacity ${!entry.is_active ? 'opacity-50' : ''}`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-medium truncate">{entry.title}</h3>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {categoryLabel(entry.category)}
                      </Badge>
                      {/* Source badge */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {entry.source_type === 'storage' ? (
                              <Badge variant="secondary" className="text-[10px] shrink-0 gap-0.5">
                                <Package className="h-2.5 w-2.5" />
                                {entry.source_bucket}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] shrink-0 gap-0.5">
                                <PenTool className="h-2.5 w-2.5" />
                                Manual
                              </Badge>
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-xs">
                            {entry.source_type === 'storage' ? (
                              <div>
                                <p><strong>Bucket:</strong> {entry.source_bucket}</p>
                                <p><strong>Arquivo:</strong> {entry.source_path}</p>
                                {entry.synced_at && (
                                  <p><strong>Sincronizado:</strong> {new Date(entry.synced_at).toLocaleString('pt-BR')}</p>
                                )}
                              </div>
                            ) : (
                              <p>Entrada criada manualmente</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {/* Extraction status badge */}
                      {entry.source_type === 'storage' && (
                        <ExtractionBadge status={entry.extraction_status} />
                      )}
                      {!entry.is_active && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          <EyeOff className="h-2.5 w-2.5 mr-0.5" /> Inativa
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {entry.extraction_status === 'success'
                        ? entry.content.substring(0, 200) + (entry.content.length > 200 ? '...' : '')
                        : entry.content
                      }
                    </p>
                    {entry.source_type === 'storage' && entry.content.length > 0 && entry.extraction_status === 'success' && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {entry.content.length.toLocaleString('pt-BR')} caracteres extraídos
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(entry)}
                      className="h-7 w-7 p-0"
                      title={entry.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {entry.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(entry)}
                      className="h-7 w-7 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog modal={false} open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar entrada' : 'Nova entrada'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Regra de tom editorial"
                className="rounded-[var(--admin-radius)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="rounded-[var(--admin-radius)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Cole aqui a regra editorial, referência ou diretriz..."
                rows={8}
                className="rounded-[var(--admin-radius)]"
              />
              <p className="text-xs text-muted-foreground">{form.content.length} caracteres</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                />
                <Label className="text-sm">Ativa</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Ordem</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-20 h-8 rounded-[var(--admin-radius)]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-[var(--admin-radius)]">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-1.5 rounded-[var(--admin-radius)]">
              {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
