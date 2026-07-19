"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/dashboard/PageHeader';
import { FlowCanvas } from '@/components/admin/guide-flow/FlowCanvas';
import { EditorialSummaryPanel } from '@/components/admin/guide-flow/EditorialSummaryPanel';
import type { GeneratedGuideData, ImagePrompt } from '@/components/admin/guide-flow/GuideFlowPreview';
import { DEFAULT_GUIDE_FLOW_INPUTS, type GuideFlowInputs } from '@/components/admin/guide-flow/GuideFlowForm';
import { hasValidationErrors } from '@/components/admin/guide-flow/GuideFlowValidation';
import { findOption, TIPOS_GUIA, CATEGORIAS, INTENCOES, mapInternaToPublica } from '@/lib/guide-editorial-options';
import { useGuidesMutations } from '@/hooks/useGuidesMutations';
import { useGuideFlowSources } from '@/hooks/useGuideFlowSources';
import { updateToolAction } from '@/app/actions/tools';
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { Save, Send, RotateCcw } from 'lucide-react';
import { getErrorMessage } from '@/lib/error-message';
import { PUBLIC_SUPABASE_URL } from '@/lib/runtime-env';

const EMPTY_GUIDE: GeneratedGuideData = {
  title: '', slug: '', short_description: '', seo_title: '', seo_description: '',
  category: '', public_category: 'Guias', author_name: 'Matheus Dias', content_markdown: '',
  cta_top: null, cta_middle: null, cta_final: null, internal_links: [], cover_image_suggestion: '',
  image_prompts: [], generated_images: [],
};

const TOOL_PLACEHOLDER_IMAGE = '/images/pqestudar-em-construcao.png';

const capitalizeGuideTitle = (title: string) =>
  title.replace(/^(\s*)(\S)/u, (_, leadingSpace: string, firstChar: string) =>
    `${leadingSpace}${firstChar.toLocaleUpperCase('pt-BR')}`
  );

type GuideFlowStoredData = Partial<GeneratedGuideData> & { inputs?: GuideFlowInputs };
type GuideRow = Tables<'guides'> & { flow_data?: GuideFlowStoredData | null };
type ToolRow = Tables<'tools'>;

export default function GuideFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createGuide, updateGuide } = useGuidesMutations();
  const sources = useGuideFlowSources();
  const { applyTargetDefaults } = sources;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [guideData, setGuideData] = useState<GeneratedGuideData | null>(null);
  const [linkedGuideId, setLinkedGuideId] = useState<string | null>(null);
  const [linkedToolId, setLinkedToolId] = useState<string | null>(null);
  const [currentInputs, setCurrentInputs] = useState<GuideFlowInputs>(DEFAULT_GUIDE_FLOW_INPUTS);

  // Load guide from URL param ?guide=ID
  useEffect(() => {
    const guideId = searchParams?.get('guide') ?? null;
    if (!guideId) return;

    (async () => {
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .eq('id', guideId)
        .single();

      if (error || !data) {
        toast({ title: 'Guia não encontrado', variant: 'destructive' });
        return;
      }

      const guide = data as unknown as GuideRow;
      setLinkedGuideId(guide.id);

      if (guide.flow_data) {
        // Restore full flow state
        const fd = guide.flow_data;
        setGuideData({
          title: fd.title ?? guide.title,
          slug: fd.slug ?? guide.slug,
          short_description: fd.short_description ?? guide.short_description,
          seo_title: fd.seo_title ?? guide.seo_title ?? '',
          seo_description: fd.seo_description ?? guide.seo_description ?? '',
          category: fd.category ?? guide.category,
          public_category: fd.public_category ?? guide.public_category ?? mapInternaToPublica(guide.category),
          author_name: fd.author_name ?? guide.author_name ?? 'Matheus Dias',
          content_markdown: fd.content_markdown ?? guide.content_markdown ?? '',
          cta_top: fd.cta_top ?? null,
          cta_middle: fd.cta_middle ?? null,
          cta_final: fd.cta_final ?? null,
          internal_links: fd.internal_links ?? [],
          cover_image_suggestion: fd.cover_image_suggestion ?? '',
          cover_image_url: fd.cover_image_url ?? guide.cover_image_url ?? '',
          image_prompts: fd.image_prompts ?? [],
          generated_images: fd.generated_images ?? [],
        });
        if (fd.inputs) setCurrentInputs({ ...DEFAULT_GUIDE_FLOW_INPUTS, ...fd.inputs });
        toast({ title: 'Fluxo restaurado', description: `"${guide.title}" carregado do estado salvo.` });
      } else {
        // Build flow state from guide fields (no flow_data persisted)
        setGuideData({
          title: guide.title,
          slug: guide.slug,
          short_description: guide.short_description,
          seo_title: guide.seo_title ?? '',
          seo_description: guide.seo_description ?? '',
          category: guide.category,
          public_category: guide.public_category ?? mapInternaToPublica(guide.category),
          author_name: guide.author_name ?? 'Matheus Dias',
          content_markdown: guide.content_markdown ?? '',
          cta_top: guide.cta_top_label ? { label: guide.cta_top_label, url: guide.cta_top_url, text: guide.cta_top_text } : null,
          cta_middle: guide.cta_middle_label ? { label: guide.cta_middle_label, url: guide.cta_middle_url, text: guide.cta_middle_text } : null,
          cta_final: guide.cta_final_label ? { label: guide.cta_final_label, url: guide.cta_final_url, text: guide.cta_final_text } : null,
          internal_links: Array.isArray(guide.internal_links)
            ? (guide.internal_links as Array<{ label: string; url: string }>)
            : [],
          cover_image_suggestion: '',
          cover_image_url: guide.cover_image_url ?? '',
          image_prompts: [],
          generated_images: [],
        });
        toast({ title: 'Guia carregado', description: `"${guide.title}" aberto no fluxo (sem estado de fluxo prévio).` });
      }
    })();
  }, [searchParams]);

  // Load tool from URL param ?tool=ID
  useEffect(() => {
    const toolId = searchParams?.get('tool') ?? null;
    if (!toolId) return;

    (async () => {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', toolId)
        .single();

      if (error || !data) {
        toast({ title: 'Ferramenta não encontrada', variant: 'destructive' });
        return;
      }

      const tool = data as ToolRow;
      setLinkedToolId(tool.id);
      setLinkedGuideId(null);
      const restoredInputs: GuideFlowInputs = {
        ...DEFAULT_GUIDE_FLOW_INPUTS,
        targetType: 'tool',
        ferramentaId: tool.id,
        ferramentaSlug: tool.slug ?? '',
        ferramentaDescricao: tool.description ?? '',
        ferramentaCoverImageUrl: tool.cover_image_url ?? '',
        ferramentaTags: tool.tags ?? [],
        tema: tool.name,
        categoria: tool.tags?.[0] ?? '',
        categoriaPublica: tool.tags?.[0] ?? 'Ferramentas',
        palavraChave: tool.name,
      };
      setCurrentInputs(restoredInputs);
      applyTargetDefaults('tool');
      setGuideData({
        ...EMPTY_GUIDE,
        title: tool.name,
        slug: tool.slug ?? '',
        short_description: tool.description,
        seo_title: tool.seo_title ?? '',
        seo_description: tool.seo_description ?? '',
        category: tool.tags?.[0] ?? '',
        public_category: tool.tags?.[0] ?? 'Ferramentas',
        author_name: 'PqEstudar',
        content_markdown: tool.content_markdown ?? '',
        cta_top: tool.cta_top_label ? { label: tool.cta_top_label, url: tool.cta_top_url ?? '', text: tool.cta_top_text ?? '' } : null,
        cta_middle: tool.cta_middle_label ? { label: tool.cta_middle_label, url: tool.cta_middle_url ?? '', text: tool.cta_middle_text ?? '' } : null,
        cta_final: tool.cta_final_label ? { label: tool.cta_final_label, url: tool.cta_final_url ?? '', text: tool.cta_final_text ?? '' } : null,
        internal_links: Array.isArray(tool.internal_links) ? tool.internal_links as Array<{ label: string; url: string }> : [],
        cover_image_url: tool.cover_image_url ?? '',
      });
      toast({ title: 'Ferramenta carregada', description: `"${tool.name}" aberta no fluxo.` });
    })();
  }, [searchParams, applyTargetDefaults]);

  const handleInputsChange = useCallback((inputs: GuideFlowInputs) => {
    setCurrentInputs(inputs);
    if (inputs.targetType === 'tool' && inputs.ferramentaId) {
      setLinkedToolId(inputs.ferramentaId);
      setLinkedGuideId(null);
    }
  }, []);

  const handleTargetTypeChange = useCallback((targetType: GuideFlowInputs['targetType']) => {
    setCurrentInputs((prev) => prev.targetType === targetType ? prev : { ...prev, targetType });
    applyTargetDefaults(targetType);
  }, [applyTargetDefaults]);

  const handleGenerate = useCallback(async (inputs: GuideFlowInputs) => {
    setIsGenerating(true);
    sources.autoSuggest(inputs.tema, inputs.palavraChave);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Sessão expirada', description: 'Faça login novamente.', variant: 'destructive' });
        return;
      }

      // Build context from active Biblioteca entries
      const structureContext = sources.activeStructureEntries
        .map(e => `[Diretriz: ${e.title}]\n${e.content}`)
        .join('\n\n---\n\n');

      const resolvedLibraryEntries = sources.resolveLibraryEntries(inputs.tema, inputs.palavraChave);

      const libraryContext = resolvedLibraryEntries
        .map(e => `[Biblioteca: ${e.title}]\n${e.content}`)
        .join('\n\n---\n\n');

      const selectedLibraryName = resolvedLibraryEntries.length > 0
        ? resolvedLibraryEntries.map(e => e.title).join(', ')
        : null;

      // Resolve editorial metadata for the prompt
      const tipoOption = findOption(TIPOS_GUIA, inputs.tipo);
      const categoriaOption = findOption(CATEGORIAS, inputs.categoria);
      const intencaoOption = findOption(INTENCOES, inputs.intencao);

      const resp = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            ...inputs,
            visualMode: inputs.visualMode || 'generate',
            selectedLibrary: selectedLibraryName,
            structureContext,
            libraryContext,
            editorialMeta: {
              tipo: tipoOption ? {
                label: tipoOption.label,
                meaning: tipoOption.editorialMeaning,
                impact: tipoOption.generationImpact,
              } : null,
              categoria: categoriaOption ? {
                label: categoriaOption.label,
                context: categoriaOption.editorialContext,
                impact: categoriaOption.generationImpact,
              } : null,
              intencao: intencaoOption ? {
                label: intencaoOption.label,
                impact: intencaoOption.generationImpact,
              } : null,
            },
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast({ title: 'Erro na geração', description: err.error, variant: 'destructive' });
        return;
      }

      const generated = await resp.json();
      const isToolFlow = inputs.targetType === 'tool';
      const selectedToolName = inputs.tema || generated.title || '';
      const selectedToolSlug = inputs.ferramentaSlug || generated.slug || '';
      const preservedToolDescription = inputs.ferramentaDescricao || guideData?.short_description || '';
      const preservedToolCover = inputs.ferramentaCoverImageUrl || guideData?.cover_image_url || '';
      const preservedToolTags = inputs.ferramentaTags?.length ? inputs.ferramentaTags : [];

      setGuideData({
        title: isToolFlow ? selectedToolName : capitalizeGuideTitle(generated.title ?? ''),
        slug: isToolFlow ? selectedToolSlug : (generated.slug ?? ''),
        short_description: isToolFlow ? preservedToolDescription : (generated.short_description ?? ''),
        seo_title: generated.seo_title ?? '',
        seo_description: generated.seo_description ?? '',
        category: isToolFlow ? (preservedToolTags[0] ?? inputs.categoria) : (generated.category ?? (categoriaOption?.label || inputs.categoria)),
        public_category: isToolFlow ? (preservedToolTags[0] ?? (inputs.categoriaPublica || 'Ferramentas')) : (inputs.categoriaPublica || mapInternaToPublica(inputs.categoria)),
        author_name: generated.author_name ?? 'Matheus Dias',
        content_markdown: generated.content_markdown ?? '',
        cta_top: generated.cta_top ?? null,
        cta_middle: generated.cta_middle ?? null,
        cta_final: generated.cta_final ?? null,
        internal_links: generated.internal_links ?? [],
        cover_image_suggestion: isToolFlow ? '' : (generated.cover_image_suggestion ?? ''),
        cover_image_url: isToolFlow ? preservedToolCover : (generated.cover_image_url ?? ''),
        image_prompts: generated.image_prompts ?? [],
        generated_images: generated.generated_images ?? [],
      });

      const hasLib = resolvedLibraryEntries.length > 0;
      const hasStruct = sources.activeStructureEntries.length > 0;
      toast({
        title: 'Guia gerado com sucesso',
        description: hasLib && hasStruct
          ? `Gerado com ${sources.activeStructureEntries.length} diretriz(es) e ${resolvedLibraryEntries.length} biblioteca(s).`
          : hasStruct
            ? 'Gerado com diretrizes editoriais — sem biblioteca factual.'
            : 'Gerado sem fontes da Biblioteca — revisão manual recomendada.',
      });
    } catch (err: unknown) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [sources, guideData]);

  const handleRegenerateImage = useCallback(async (prompt: string, position: string) => {
    if (!guideData) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      toast({ title: 'Regenerando imagem...', description: `Posição: ${position}` });

      await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/guide-flow-generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            action: 'regenerate-image',
            prompt,
            position,
            slug: guideData.slug,
          }),
        }
      );

      // For now, we use a simplified approach - call the image API directly via a dedicated mechanism
      // The edge function handles image generation internally during guide generation
      // For regeneration, we update the prompt and re-trigger
      toast({ title: 'Use o prompt copiado', description: 'Cole o prompt em uma ferramenta de geração de imagem e atualize manualmente.', });
    } catch (err: unknown) {
      toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
    }
  }, [guideData]);

  const handleUpdateImagePrompt = useCallback((position: string, newPrompt: string) => {
    if (!guideData) return;
    const updateList = (list: ImagePrompt[] | undefined) =>
      (list ?? []).map(img => img.position === position ? { ...img, prompt: newPrompt } : img);
    setGuideData({
      ...guideData,
      image_prompts: updateList(guideData.image_prompts),
      generated_images: updateList(guideData.generated_images),
    });
    toast({ title: 'Prompt atualizado', description: `Posição: ${position}` });
  }, [guideData]);

  /** Inject internal images into the markdown content at their correct positions */
  const buildFinalMarkdown = (data: GeneratedGuideData): string => {
    const isToolFlow = currentInputs.targetType === 'tool';
    const internalImages = (data.generated_images ?? data.image_prompts ?? [])
      .filter(img => img.type === 'internal' && ((img.status === 'success' && img.url) || isToolFlow));

    if (internalImages.length === 0) return data.content_markdown;

    const imageUrlFor = (img: ImagePrompt) =>
      img.status === 'success' && img.url ? img.url : TOOL_PLACEHOLDER_IMAGE;

    // Parse positions like "after_section_1", "after_section_2" etc.
    const imagesBySection = new Map<number, typeof internalImages>();
    for (const img of internalImages) {
      const match = img.position?.match(/after_section_(\d+)/);
      const sectionIndex = match ? parseInt(match[1], 10) : null;
      if (sectionIndex !== null) {
        const list = imagesBySection.get(sectionIndex) || [];
        list.push(img);
        imagesBySection.set(sectionIndex, list);
      }
    }

    if (imagesBySection.size === 0) {
      // No positional info — append all at the end
      const suffix = internalImages
        .map(img => `\n\n<img src="${imageUrlFor(img)}" alt="${img.alt_text || 'Imagem em construção do PqEstudar'}" width="100%" loading="lazy" decoding="async" />\n`)
        .join('');
      return data.content_markdown + suffix;
    }

    // Split markdown by H2 headings to identify sections
    const lines = data.content_markdown.split('\n');
    const sections: { startLine: number; endLine: number }[] = [];
    let currentStart = -1;

    for (let i = 0; i < lines.length; i++) {
      if (/^##\s/.test(lines[i])) {
        if (currentStart >= 0) {
          sections.push({ startLine: currentStart, endLine: i - 1 });
        }
        currentStart = i;
      }
    }
    if (currentStart >= 0) {
      sections.push({ startLine: currentStart, endLine: lines.length - 1 });
    }

    // Build result by inserting images after the corresponding sections
    const result = [...lines];
    // Process in reverse order so line insertions don't shift indices
    const sortedSections = Array.from(imagesBySection.entries()).sort((a, b) => b[0] - a[0]);

    for (const [sectionIndex, images] of sortedSections) {
      const section = sections[sectionIndex - 1]; // 1-indexed
      if (!section) continue;

      const imgTags = images
        .map(img => `<img src="${imageUrlFor(img)}" alt="${img.alt_text || 'Imagem em construção do PqEstudar'}" width="100%" loading="lazy" decoding="async" />`)
        .join('\n\n');

      result.splice(section.endLine + 1, 0, '', imgTags, '');
    }

    return result.join('\n');
  };

  const handleSave = async (publish: boolean) => {
    if (!guideData) return;
    const isToolFlow = currentInputs.targetType === 'tool';
    if (!isToolFlow && hasValidationErrors(guideData)) {
      toast({ title: 'Erros de validação', description: 'Corrija os campos obrigatórios antes de salvar.', variant: 'destructive' });
      return;
    }

    if (isToolFlow && (!guideData.title.trim() || !guideData.short_description.trim())) {
      toast({ title: 'Campos obrigatórios', description: 'Informe nome e descrição da ferramenta antes de salvar.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const selectedToolId = currentInputs.ferramentaId || linkedToolId;
      const selectedToolSlug = currentInputs.ferramentaSlug || guideData.slug;

      if (isToolFlow && !selectedToolId) {
        toast({ title: 'Ferramenta obrigatÃ³ria', description: 'Selecione uma ferramenta existente para atualizar.', variant: 'destructive' });
        return;
      }

      const finalMarkdown = buildFinalMarkdown(guideData);
      const normalizedGuideData = isToolFlow
        ? guideData
        : { ...guideData, title: capitalizeGuideTitle(guideData.title) };

      // Persist the full flow state for future re-opening
      const flowDataPayload = {
        ...normalizedGuideData,
        inputs: currentInputs,
      };

      if (isToolFlow) {
        const generatedTags = Array.from(new Set([
          guideData.public_category,
          guideData.category,
          currentInputs.palavraChave,
        ].map((value) => value?.trim()).filter(Boolean))) as string[];
        const preservedTags = currentInputs.ferramentaTags?.length ? currentInputs.ferramentaTags : generatedTags;

        const toolPayload: Record<string, unknown> = {
          name: currentInputs.tema || guideData.title,
          slug: selectedToolSlug,
          description: currentInputs.ferramentaDescricao || guideData.short_description,
          seo_title: guideData.seo_title || null,
          seo_description: guideData.seo_description || null,
          content_markdown: finalMarkdown,
          cover_image_url: currentInputs.ferramentaCoverImageUrl || guideData.cover_image_url || null,
          is_visible: publish,
          tags: preservedTags,
          internal_links: [],
          cta_top_label: guideData.cta_top?.label || null,
          cta_top_url: guideData.cta_top?.url || null,
          cta_top_text: guideData.cta_top?.text || null,
          cta_middle_label: guideData.cta_middle?.label || null,
          cta_middle_url: guideData.cta_middle?.url || null,
          cta_middle_text: guideData.cta_middle?.text || null,
          cta_final_label: guideData.cta_final?.label || null,
          cta_final_url: guideData.cta_final?.url || null,
          cta_final_text: guideData.cta_final?.text || null,
        };

        const result = await updateToolAction({ id: selectedToolId, ...toolPayload });

        if (result.error) throw new Error(result.error);

        toast({
          title: publish ? 'Ferramenta publicada!' : 'Ferramenta salva!',
          description: `"${guideData.title}" foi ${publish ? 'publicada' : 'salva como rascunho'}.`,
        });
        router.push(`/ferramentas/${selectedToolSlug}?preview=1`);
        return;
      }

      const guidePayload: TablesUpdate<'guides'> = {
        title: normalizedGuideData.title,
        slug: guideData.slug,
        short_description: guideData.short_description,
        seo_title: guideData.seo_title,
        seo_description: guideData.seo_description,
        category: guideData.category,
        public_category: guideData.public_category,
        author_name: guideData.author_name,
        content_markdown: finalMarkdown,
        cover_image_url: guideData.cover_image_url || null,
        is_published: publish,
        internal_links: guideData.internal_links as unknown as Json,
        cta_top_label: guideData.cta_top?.label || null,
        cta_top_url: guideData.cta_top?.url || null,
        cta_top_text: guideData.cta_top?.text || null,
        cta_middle_label: guideData.cta_middle?.label || null,
        cta_middle_url: guideData.cta_middle?.url || null,
        cta_middle_text: guideData.cta_middle?.text || null,
        cta_final_label: guideData.cta_final?.label || null,
        cta_final_url: guideData.cta_final?.url || null,
        cta_final_text: guideData.cta_final?.text || null,
        flow_data: flowDataPayload as unknown as Json,
      };

      if (linkedGuideId) {
        // Update existing guide
        await updateGuide.mutateAsync({ id: linkedGuideId, ...guidePayload });
      } else {
        // Create new guide
        await createGuide.mutateAsync({
          ...guidePayload,
          internal_code: `FLOW-${Date.now()}`,
          is_featured: false,
          sort_order: 0,
        } as TablesInsert<'guides'>);
      }

      toast({
        title: publish ? 'Guia publicado!' : 'Rascunho salvo!',
        description: `"${guideData.title}" foi ${publish ? 'publicado' : 'salvo como rascunho'}.`,
      });
      router.push('/guias');
    } catch (err: unknown) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setGuideData(null);
    setLinkedGuideId(null);
    setLinkedToolId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Fluxos"
          description="Criação assistida de guias e páginas de ferramentas com base na Biblioteca de Conhecimento."
        />
        <div className="flex items-center gap-2">
          {guideData && (
            <>
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 rounded-[var(--admin-radius)]">
                <RotateCcw className="h-3.5 w-3.5" /> Recomeçar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving} className="gap-1.5 rounded-[var(--admin-radius)]">
                <Save className="h-3.5 w-3.5" /> Rascunho
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving} className="gap-1.5 rounded-[var(--admin-radius)]">
                <Send className="h-3.5 w-3.5" /> Publicar
              </Button>
            </>
          )}
        </div>
      </div>

      <FlowCanvas
        guideData={guideData}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        onGuideDataChange={setGuideData}
        sources={sources}
        onInputsChange={handleInputsChange}
        onTargetTypeChange={handleTargetTypeChange}
        onRegenerateImage={handleRegenerateImage}
        onUpdateImagePrompt={handleUpdateImagePrompt}
      />

      <EditorialSummaryPanel
        tipo={currentInputs.tipo}
        categoria={currentInputs.categoria}
        intencao={currentInputs.intencao}
        activeStructureCount={sources.activeStructureEntries.length}
        totalStructureCount={sources.structureEntries.length}
        activeLibraryNames={sources.activeLibraryEntries.map(e => e.title)}
        selectionMode={sources.selectionMode}
      />
    </div>
  );
}
