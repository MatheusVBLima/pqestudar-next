import { useState, useEffect, useRef, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as pdfjs from 'pdfjs-dist';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, ImageIcon, FileText, Cog, Eye, Upload, ChevronDown, Wrench, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIPOS_GUIA, CATEGORIAS, INTENCOES, CATEGORIAS_PUBLICAS, mapInternaToPublica } from '@/lib/guide-editorial-options';
import { useTools, type Tool } from '@/hooks/useTools';
import {
  AI_MODEL_OPTIONS,
  AI_PROVIDER_OPTIONS,
  DEFAULT_GUIDE_FLOW_INPUTS,
  type GuideFlowAiProvider,
  type GuideFlowInputs,
} from '../GuideFlowForm';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type PdfTextItem = { str?: string };

interface InputNodeData {
  onGenerate?: (inputs: GuideFlowInputs) => void;
  isGenerating?: boolean;
  hasValidSources?: boolean;
  hasLibrary?: boolean;
  selectedLibrary?: string | null;
  onAutoSuggest?: (tema: string, palavraChave: string) => void;
  onInputsChange?: (inputs: GuideFlowInputs) => void;
  onTargetTypeChange?: (targetType: GuideFlowInputs['targetType']) => void;
  inputPatch?: { id: number; patch: Partial<GuideFlowInputs> } | null;
}

interface FlowSelectOption {
  value: string;
  label: string;
}

const hasToolPageInfo = (tool: Tool) =>
  Boolean(tool.content_markdown?.trim() || tool.what_is?.trim() || tool.who_for?.trim() || tool.how_helps?.trim() || tool.extra_markdown?.trim());

function FlowSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: FlowSelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((current) => !current);
    }
  };

  return (
    <div ref={rootRef} className="nodrag nopan relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-left text-xs ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          open && "border-primary ring-2 ring-ring ring-offset-2",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("ml-2 h-3.5 w-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-[1000] max-h-52 w-full min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-8 w-full items-center rounded-sm px-3 py-1.5 text-left text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground"
                )}
              >
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolPicker({
  value,
  tools,
  onSelect,
}: {
  value: string;
  tools: Tool[];
  onSelect: (tool: Tool) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedTool = tools.find((tool) => tool.name === value);
  const selectedToolHasInfo = selectedTool ? hasToolPageInfo(selectedTool) : false;
  const filteredTools = tools
    .filter((tool) => {
      const haystack = [tool.name, tool.description, ...(tool.tags ?? [])].join(' ').toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="nodrag nopan relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-xs ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          open && "border-primary ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
            {selectedTool?.icon_url ? (
              <img src={selectedTool.icon_url} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Wrench className="h-3 w-3 text-primary" />
            )}
          </span>
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || 'Selecione uma ferramenta...'}
          </span>
        </span>
        {selectedTool && (
          <span
            className={cn(
              "ml-auto hidden shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium sm:flex",
              selectedToolHasInfo
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/20 bg-amber-500/10 text-amber-700"
            )}
          >
            {selectedToolHasInfo ? (
              <CheckCircle2 className="h-2.5 w-2.5" />
            ) : (
              <AlertTriangle className="h-2.5 w-2.5" />
            )}
            {selectedToolHasInfo ? 'Com página' : 'Sem info'}
          </span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[1000] w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="border-b border-border p-1.5">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar ferramenta..."
              className="h-8 rounded-md text-xs"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredTools.length > 0 ? filteredTools.map((tool) => {
              const hasInfo = hasToolPageInfo(tool);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    onSelect(tool);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {tool.icon_url ? (
                      <img src={tool.icon_url} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Wrench className="h-4 w-4 text-primary" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-xs font-semibold">{tool.name}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none",
                          hasInfo
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-700"
                        )}
                      >
                        {hasInfo ? (
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        ) : (
                          <AlertTriangle className="h-2.5 w-2.5" />
                        )}
                        {hasInfo ? 'Com página' : 'Sem info'}
                      </span>
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">{tool.description}</span>
                  </span>
                </button>
              );
            }) : (
              <p className="px-2 py-3 text-center text-[10px] text-muted-foreground">Nenhuma ferramenta encontrada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InputNodeComponent({ data }: { data: InputNodeData }) {
  const { onGenerate, isGenerating, hasValidSources, hasLibrary, selectedLibrary, onAutoSuggest, onInputsChange, onTargetTypeChange, inputPatch } = data;
  const { tools } = useTools({ includeInvisible: true, pageSize: 1000 });
  const [inputs, setInputs] = useState<GuideFlowInputs>(DEFAULT_GUIDE_FLOW_INPUTS);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify parent of input changes for editorial summary
  useEffect(() => {
    onInputsChange?.(inputs);
  }, [inputs, onInputsChange]);

  useEffect(() => {
    onTargetTypeChange?.(inputs.targetType);
  }, [inputs.targetType, onTargetTypeChange]);

  useEffect(() => {
    if (!inputPatch) return;
    setInputs((current) => ({ ...current, ...inputPatch.patch }));
  }, [inputPatch?.id]);

  // Auto-suggest library when tema or palavraChave changes
  useEffect(() => {
    if (!onAutoSuggest) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (inputs.tema.trim() || inputs.palavraChave.trim()) {
        onAutoSuggest(inputs.tema, inputs.palavraChave);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputs.tema, inputs.palavraChave, onAutoSuggest]);

  const isTool = inputs.targetType === 'tool';
  const canSubmit = inputs.tema.trim() && (!isTool || inputs.ferramentaId) && (isTool || inputs.categoria) && (isTool || inputs.categoriaPublica) && !isGenerating;
  const advancedFieldsCount = [
    inputs.palavraChave.trim(),
    inputs.intencao,
    inputs.contextoAdicional.trim(),
  ].filter(Boolean).length;

  const advancedFields = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Palavra-chave</Label>
          <Input
            placeholder="Ex: rotina de estudos"
            value={inputs.palavraChave}
            onChange={(e) => setInputs((p) => ({ ...p, palavraChave: e.target.value }))}
            className="rounded-lg text-xs h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Intenção</Label>
          <FlowSelect
            value={inputs.intencao}
            onValueChange={(v) => setInputs((p) => ({ ...p, intencao: v }))}
            options={INTENCOES}
            placeholder="Selecione..."
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Contexto adicional</Label>
        <Textarea
          placeholder="Referências, regras editoriais..."
          value={inputs.contextoAdicional}
          onChange={(e) => setInputs((p) => ({ ...p, contextoAdicional: e.target.value }))}
          rows={2}
          className="rounded-lg text-xs resize-none"
        />
      </div>
    </>
  );

  const handleCategoriaInternaChange = (v: string) => {
    setInputs((p) => ({
      ...p,
      categoria: v,
      categoriaPublica: p.categoriaPublica || mapInternaToPublica(v),
    }));
  };

  const handlePdfContext = async (file: File | null) => {
    if (!file) return;
    setIsParsingPdf(true);
    setPdfName(file.name);

    try {
      const raw = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: raw }).promise;
      const chunks: string[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const text = (textContent.items as PdfTextItem[])
          .map((item) => item.str ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (text) chunks.push(`[PDF pagina ${pageNumber}]\n${text}`);
      }

      const extracted = chunks.join('\n\n---\n\n').slice(0, 24000);
      setInputs((p) => ({
        ...p,
        contextoAdicional: [
          p.contextoAdicional,
          `[Arquivo de referencia: ${file.name}]`,
          extracted,
        ].filter(Boolean).join('\n\n'),
      }));
    } finally {
      setIsParsingPdf(false);
    }
  };

  return (
    <div className="bg-card border-2 border-primary/40 rounded-[1.2rem] shadow-card w-[400px] overflow-visible">
      <Handle
        id="sources"
        type="target"
        position={Position.Left}
        className="!bg-primary !w-3 !h-3 !border-2 !border-card"
      />
      <Handle
        id="trail"
        type="target"
        position={Position.Top}
        className="!bg-primary !w-3 !h-3 !border-2 !border-card"
      />

      <div className="bg-primary/10 px-4 py-2.5 border-b border-primary/20 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Dados Iniciais</span>
      </div>

        <div className="p-4 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Destino</Label>
          <FlowSelect
            value={inputs.targetType}
            onValueChange={(v) => {
              const targetType = v as GuideFlowInputs['targetType'];
              setInputs((p) => ({
                ...p,
                targetType,
                ferramentaId: targetType === 'tool' ? p.ferramentaId : '',
                ferramentaSlug: targetType === 'tool' ? p.ferramentaSlug : '',
                ferramentaDescricao: targetType === 'tool' ? p.ferramentaDescricao : '',
                ferramentaCoverImageUrl: targetType === 'tool' ? p.ferramentaCoverImageUrl : '',
                ferramentaTags: targetType === 'tool' ? p.ferramentaTags : [],
                visualMode: targetType === 'tool' ? 'prompt_only' : p.visualMode,
                tipo: targetType === 'tool' ? '' : p.tipo,
                categoriaPublica: targetType === 'tool' ? (p.categoriaPublica || 'Ferramentas') : p.categoriaPublica,
              }));
            }}
            options={[
              { value: 'guide', label: 'Guia' },
              { value: 'tool', label: 'Ferramenta' },
            ]}
          />
        </div>

        {/* Source status indicators */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted">
            {hasValidSources ? (
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
            )}
            <span>Diretrizes</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted">
            {hasLibrary ? (
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
            )}
            <span className="truncate max-w-[120px]">{selectedLibrary ? selectedLibrary : 'Biblioteca'}</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{isTool ? 'Nome da ferramenta *' : 'Tema do guia *'}</Label>
          {isTool ? (
            <ToolPicker
              value={inputs.tema}
              tools={tools}
              onSelect={(tool) => setInputs((p) => ({
                ...p,
                ferramentaId: tool.id,
                ferramentaSlug: tool.slug ?? '',
                ferramentaDescricao: tool.description ?? '',
                ferramentaCoverImageUrl: tool.cover_image_url ?? '',
                ferramentaTags: tool.tags ?? [],
                tema: tool.name,
                palavraChave: p.palavraChave || tool.name,
                categoria: tool.tags?.[0] || p.categoria,
                categoriaPublica: tool.tags?.[0] || p.categoriaPublica || 'Ferramentas',
                contextoAdicional: [
                  p.contextoAdicional,
                  `Ferramenta selecionada: ${tool.name}\nDescrição: ${tool.description}\nURL atual: ${tool.slug ? `/ferramentas/${tool.slug}` : tool.url ?? ''}`,
                ].filter(Boolean).join('\n\n'),
              }))}
            />
          ) : (
            <Input
              placeholder="Ex: Como organizar uma rotina de estudos"
              value={inputs.tema}
              onChange={(e) => setInputs((p) => ({ ...p, tema: e.target.value }))}
              className="rounded-lg text-xs h-8"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2">
          <div className="space-y-1">
            <Label className="text-xs">IA do texto</Label>
            <FlowSelect
              value={inputs.aiProvider}
              onValueChange={(v) => {
                const aiProvider = v as GuideFlowAiProvider;
                setInputs((p) => ({
                  ...p,
                  aiProvider,
                  textModel: AI_MODEL_OPTIONS[aiProvider][0],
                }));
              }}
              options={AI_PROVIDER_OPTIONS}
              placeholder="IA..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Modelo</Label>
            <FlowSelect
              value={inputs.textModel}
              onValueChange={(v) => setInputs((p) => ({ ...p, textModel: v }))}
              options={AI_MODEL_OPTIONS[inputs.aiProvider].map((model) => ({ value: model, label: model }))}
              placeholder="Modelo..."
            />
          </div>
          <p className="col-span-2 text-[9px] text-muted-foreground leading-tight">
            Usa a secret correspondente configurada na Edge Function.
          </p>
        </div>

        {!isTool && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Tipo de guia</Label>
            <FlowSelect
              value={inputs.tipo}
              onValueChange={(v) => setInputs((p) => ({ ...p, tipo: v }))}
              options={TIPOS_GUIA}
              placeholder="Selecione..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Cog className="h-2.5 w-2.5 text-primary/70" />
              Categoria Interna *
            </Label>
            <FlowSelect
              value={inputs.categoria}
              onValueChange={handleCategoriaInternaChange}
              options={CATEGORIAS}
              placeholder="Editorial..."
            />
            <p className="text-[9px] text-muted-foreground leading-tight">Guia a IA · não exibida ao público</p>
          </div>
        </div>
        )}

        {!isTool && (
        <div className="space-y-1 pt-1 border-t border-border/40">
          <Label className="text-xs flex items-center gap-1">
            <Eye className="h-2.5 w-2.5 text-emerald-600" />
            Categoria Pública *
          </Label>
          <FlowSelect
            value={inputs.categoriaPublica}
            onValueChange={(v) => setInputs((p) => ({ ...p, categoriaPublica: v }))}
            options={CATEGORIAS_PUBLICAS.map((category) => ({ value: category, label: category }))}
            placeholder="Badge no site..."
          />
          <p className="text-[9px] text-muted-foreground leading-tight">Apenas badge visual · não influencia geração</p>
        </div>
        )}

        {isTool ? (
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Ajustes avançados</span>
                  {advancedFieldsCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                      {advancedFieldsCount} preenchido{advancedFieldsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-60 transition-transform", advancedOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <p className="text-[9px] text-muted-foreground leading-tight">
                Use quando quiser orientar SEO, intenção de busca ou regras específicas da geração.
              </p>
              {advancedFields}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          advancedFields
        )}

        {isTool && (
          <div className="space-y-1.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2">
            <Label className="text-xs flex items-center gap-1">
              <Upload className="h-3 w-3 text-primary" />
              PDF de referência da ferramenta
            </Label>
            <Input
              type="file"
              accept="application/pdf"
              disabled={isParsingPdf}
              onChange={(event) => void handlePdfContext(event.target.files?.[0] ?? null)}
              className="rounded-lg text-xs h-8"
            />
            <p className="text-[9px] text-muted-foreground leading-tight">
              {isParsingPdf ? 'Extraindo texto do PDF...' : pdfName ? `Contexto adicionado: ${pdfName}` : 'Use um PDF impresso do site ou material oficial para alimentar a geração.'}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Modo visual</Label>
          <RadioGroup
            value={inputs.visualMode}
            onValueChange={(v) => setInputs((p) => ({ ...p, visualMode: v as 'generate' | 'prompt_only' }))}
            className="flex gap-3"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="generate" id="vm-gen" className="h-3 w-3" />
              <label htmlFor="vm-gen" className="text-[10px] flex items-center gap-1 cursor-pointer">
                <ImageIcon className="h-2.5 w-2.5 text-primary" />
                Gerar imagens
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="prompt_only" id="vm-prompt" className="h-3 w-3" />
              <label htmlFor="vm-prompt" className="text-[10px] flex items-center gap-1 cursor-pointer">
                <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                Apenas prompts
              </label>
            </div>
          </RadioGroup>
        </div>

        <Button
          onClick={() => canSubmit && onGenerate?.(inputs)}
          disabled={!canSubmit}
          className="w-full rounded-lg gap-2 h-9 text-xs"
          size="sm"
        >
          {isGenerating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" /> {isTool ? 'Gerar ferramenta' : 'Gerar guia assistido'}</>
          )}
        </Button>

        {isTool && !inputs.ferramentaId && (
          <p className="text-[10px] text-amber-600 text-center">
            Selecione uma ferramenta existente para atualizar a pÃ¡gina dela.
          </p>
        )}

        {!hasLibrary && !hasValidSources && !isGenerating && (
          <p className="text-[10px] text-amber-600 text-center">
            ⚠ Sem fontes da Biblioteca — sincronize o Storage primeiro
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3 !border-2 !border-primary-foreground" />
    </div>
  );
}

export const InputNode = memo(InputNodeComponent);
