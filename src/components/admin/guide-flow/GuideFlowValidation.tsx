import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { GeneratedGuideData } from './GuideFlowPreview';
import { isCategoriaPublica } from '@/lib/guide-editorial-options';

type Status = 'ok' | 'warn' | 'error';

interface ValidationItem {
  label: string;
  status: Status;
  detail?: string;
  suggestion?: string;
}

interface ValidationGroup {
  title: string;
  icon: string;
  items: ValidationItem[];
}

/* ─── helpers ─── */

const WEAK_CTA_TERMS = ['saiba mais', 'clique aqui', 'veja mais', 'leia mais', 'acesse'];
const BUZZWORDS = ['disruptivo', 'inovador', 'revolucionário', 'incrível', 'fantástico', 'surreal', 'game changer', 'hack'];
const GENERIC_INTRO_TERMS = ['neste artigo', 'neste guia', 'neste post', 'neste texto', 'vamos falar sobre', 'hoje vamos'];

function avgWordsPerSentence(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0);
  return Math.round(totalWords / sentences.length);
}

function countImages(md: string): number {
  const mdImages = (md.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const htmlImages = (md.match(/<img\s/gi) || []).length;
  return mdImages + htmlImages;
}

/* ─── validation groups ─── */

function getStructureValidations(data: GeneratedGuideData): ValidationGroup {
  const items: ValidationItem[] = [];
  const wordCount = data.content_markdown.trim().split(/\s+/).filter(Boolean).length;
  const h2Count = (data.content_markdown.match(/^## /gm) || []).length;
  const h3Count = (data.content_markdown.match(/^### /gm) || []).length;
  const hrCount = (data.content_markdown.match(/^---$/gm) || []).length;
  const listCount = (data.content_markdown.match(/^[-*] /gm) || []).length;
  const hasFaq = /faq|perguntas\s+frequentes/i.test(data.content_markdown);

  // Word count
  if (wordCount < 50) {
    items.push({ label: 'Contagem', status: 'error', detail: `${wordCount} palavras (mínimo 50)`, suggestion: 'Adicione mais conteúdo para cobrir o tema adequadamente.' });
  } else if (wordCount < 300) {
    items.push({ label: 'Contagem', status: 'warn', detail: `${wordCount} palavras (ideal > 300)`, suggestion: 'Guias com 300+ palavras performam melhor em SEO.' });
  } else {
    items.push({ label: 'Contagem', status: 'ok', detail: `${wordCount} palavras` });
  }

  // H2 sections
  if (h2Count === 0) {
    items.push({ label: 'Seções H2', status: 'error', detail: 'Nenhuma encontrada', suggestion: 'Divida o conteúdo em seções com ## para melhor escaneabilidade.' });
  } else if (h2Count < 3 && wordCount > 400) {
    items.push({ label: 'Seções H2', status: 'warn', detail: `${h2Count} seções (poucos para o tamanho)`, suggestion: 'Considere dividir em mais seções H2 para facilitar a leitura.' });
  } else {
    items.push({ label: 'Seções H2', status: 'ok', detail: `${h2Count} seções` });
  }

  // H3 subsections
  if (h2Count >= 3 && h3Count === 0) {
    items.push({ label: 'Subseções H3', status: 'warn', detail: 'Nenhuma encontrada', suggestion: 'Subtítulos H3 ajudam a detalhar temas complexos.' });
  } else if (h3Count > 0) {
    items.push({ label: 'Subseções H3', status: 'ok', detail: `${h3Count} subseções` });
  }

  // Lists
  if (wordCount > 300 && listCount === 0) {
    items.push({ label: 'Listas', status: 'warn', detail: 'Nenhuma lista encontrada', suggestion: 'Listas melhoram escaneabilidade em textos longos.' });
  } else if (listCount > 0) {
    items.push({ label: 'Listas', status: 'ok', detail: `${listCount} itens` });
  }

  // Separators
  if (h2Count >= 3 && hrCount === 0) {
    items.push({ label: 'Separadores (---)', status: 'warn', detail: 'Nenhum', suggestion: 'Separadores ajudam a dar respiro visual entre seções.' });
  }

  // FAQ
  if (wordCount > 500 && !hasFaq) {
    items.push({ label: 'FAQ', status: 'warn', detail: 'Ausente', suggestion: 'Uma seção de FAQ melhora SEO e resolve dúvidas comuns.' });
  } else if (hasFaq) {
    items.push({ label: 'FAQ', status: 'ok', detail: 'Presente' });
  }

  return { title: 'Estrutura', icon: '🏗️', items };
}

function getFieldsValidations(data: GeneratedGuideData): ValidationGroup {
  const items: ValidationItem[] = [];

  // Title
  if (!data.title.trim()) {
    items.push({ label: 'Título', status: 'error', detail: 'Obrigatório' });
  } else if (data.title.length > 80) {
    items.push({ label: 'Título', status: 'warn', detail: `${data.title.length} chars (ideal < 80)` });
  } else {
    items.push({ label: 'Título', status: 'ok' });
  }

  // Slug
  if (!data.slug.trim()) {
    items.push({ label: 'Slug', status: 'error', detail: 'Obrigatório' });
  } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
    items.push({ label: 'Slug', status: 'warn', detail: 'Caracteres inválidos' });
  } else {
    items.push({ label: 'Slug', status: 'ok' });
  }

  // Short description
  if (!data.short_description.trim()) {
    items.push({ label: 'Descrição curta', status: 'error', detail: 'Obrigatória' });
  } else if (data.short_description.length > 160) {
    items.push({ label: 'Descrição curta', status: 'warn', detail: `${data.short_description.length}/160` });
  } else {
    items.push({ label: 'Descrição curta', status: 'ok' });
  }

  // Categoria Interna (editorial)
  if (!data.category.trim()) {
    items.push({ label: 'Categoria Interna', status: 'error', detail: 'Obrigatória' });
  } else {
    items.push({ label: 'Categoria Interna', status: 'ok' });
  }

  // Categoria Pública (badge visual)
  if (!data.public_category?.trim()) {
    items.push({ label: 'Categoria Pública', status: 'error', detail: 'Obrigatória (badge)' });
  } else if (!isCategoriaPublica(data.public_category)) {
    items.push({ label: 'Categoria Pública', status: 'error', detail: 'Valor inválido' });
  } else {
    items.push({ label: 'Categoria Pública', status: 'ok', detail: data.public_category });
  }

  return { title: 'Campos obrigatórios', icon: '📋', items };
}

function getSeoValidations(data: GeneratedGuideData): ValidationGroup {
  const items: ValidationItem[] = [];

  // SEO Title
  if (!data.seo_title.trim()) {
    items.push({ label: 'SEO Title', status: 'warn', detail: 'Recomendado', suggestion: 'Título SEO melhora CTR nos resultados de busca.' });
  } else if (data.seo_title.length > 60) {
    items.push({ label: 'SEO Title', status: 'warn', detail: `${data.seo_title.length}/60`, suggestion: 'Títulos acima de 60 chars são cortados no Google.' });
  } else if (data.seo_title.length < 20) {
    items.push({ label: 'SEO Title', status: 'warn', detail: `${data.seo_title.length}/60 (curto)`, suggestion: 'Um título mais descritivo pode melhorar o ranking.' });
  } else {
    items.push({ label: 'SEO Title', status: 'ok', detail: `${data.seo_title.length}/60` });
  }

  // SEO Description
  if (!data.seo_description.trim()) {
    items.push({ label: 'SEO Description', status: 'warn', detail: 'Recomendada', suggestion: 'Meta description melhora CTR e contextualiza o conteúdo.' });
  } else if (data.seo_description.length > 160) {
    items.push({ label: 'SEO Description', status: 'warn', detail: `${data.seo_description.length}/160`, suggestion: 'Descrições acima de 160 chars são cortadas.' });
  } else {
    items.push({ label: 'SEO Description', status: 'ok', detail: `${data.seo_description.length}/160` });
  }

  // Slug contains keyword-like terms
  if (data.seo_title.trim() && data.slug.trim()) {
    const titleWords = data.seo_title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const slugWords = data.slug.split('-');
    const overlap = titleWords.filter((w) => slugWords.includes(w)).length;
    if (overlap === 0) {
      items.push({ label: 'Slug vs SEO', status: 'warn', detail: 'Sem termos em comum', suggestion: 'Inclua a palavra-chave principal no slug.' });
    } else {
      items.push({ label: 'Slug vs SEO', status: 'ok', detail: `${overlap} termo(s) em comum` });
    }
  }

  return { title: 'SEO', icon: '🔍', items };
}

function getToneValidations(data: GeneratedGuideData): ValidationGroup {
  const items: ValidationItem[] = [];
  const content = data.content_markdown.toLowerCase();

  // Avg words per sentence
  const avg = avgWordsPerSentence(data.content_markdown);
  if (avg > 28) {
    items.push({ label: 'Clareza', status: 'warn', detail: `Média de ${avg} palavras/frase`, suggestion: 'Frases com mais de 22 palavras reduzem a legibilidade. Quebre em frases menores.' });
  } else if (avg > 0) {
    items.push({ label: 'Clareza', status: 'ok', detail: `Média de ${avg} palavras/frase` });
  }

  // Buzzwords
  const foundBuzz = BUZZWORDS.filter((b) => content.includes(b));
  if (foundBuzz.length > 0) {
    items.push({ label: 'Buzzwords', status: 'warn', detail: foundBuzz.join(', '), suggestion: 'Evite termos vagos. Prefira linguagem direta e concreta.' });
  } else {
    items.push({ label: 'Buzzwords', status: 'ok', detail: 'Nenhum detectado' });
  }

  // Generic intro
  const foundGeneric = GENERIC_INTRO_TERMS.filter((t) => content.includes(t));
  if (foundGeneric.length > 0) {
    items.push({ label: 'Intro genérica', status: 'warn', detail: `"${foundGeneric[0]}"`, suggestion: 'Comece com uma resposta direta ao tema, sem frases genéricas.' });
  } else {
    items.push({ label: 'Intro direta', status: 'ok' });
  }

  // First paragraph check (should answer the topic quickly)
  const firstParagraph = data.content_markdown.split(/\n\n/)[0] || '';
  const firstParaWords = firstParagraph.trim().split(/\s+/).length;
  if (firstParaWords > 60) {
    items.push({ label: '1º parágrafo', status: 'warn', detail: `${firstParaWords} palavras`, suggestion: 'O primeiro parágrafo deve ser uma resposta rápida (até ~50 palavras).' });
  }

  return { title: 'Tom e linguagem', icon: '✍️', items };
}

function getCtaValidations(data: GeneratedGuideData): ValidationGroup {
  const items: ValidationItem[] = [];

  const ctas = [
    { key: 'Superior', cta: data.cta_top, ideal: 'leve (convite suave)' },
    { key: 'Intermediária', cta: data.cta_middle, ideal: 'contextual (relacionada ao conteúdo)' },
    { key: 'Final', cta: data.cta_final, ideal: 'forte (conversão direta)' },
  ];

  const configuredCount = ctas.filter((c) => c.cta).length;
  if (configuredCount === 0) {
    items.push({ label: 'CTAs', status: 'warn', detail: '0/3 configuradas', suggestion: 'Adicione pelo menos 2 CTAs para guiar o leitor.' });
  } else if (configuredCount < 2) {
    items.push({ label: 'CTAs', status: 'warn', detail: `${configuredCount}/3 configurada(s)` });
  } else {
    items.push({ label: 'CTAs', status: 'ok', detail: `${configuredCount}/3` });
  }

  for (const { key, cta, ideal } of ctas) {
    if (!cta) continue;

    // Empty label
    if (!cta.label.trim()) {
      items.push({ label: `CTA ${key}`, status: 'error', detail: 'Label vazia' });
      continue;
    }

    // Empty URL
    if (!cta.url.trim()) {
      items.push({ label: `CTA ${key}`, status: 'error', detail: 'URL vazia' });
      continue;
    }

    // Weak terms
    const weak = WEAK_CTA_TERMS.find((t) => cta.label.toLowerCase().includes(t));
    if (weak) {
      items.push({ label: `CTA ${key}`, status: 'warn', detail: `Termo fraco: "${weak}"`, suggestion: `Use uma CTA mais específica e acionável. Ideal: ${ideal}.` });
    } else {
      items.push({ label: `CTA ${key}`, status: 'ok', detail: cta.label.slice(0, 30) });
    }

    // Check URL is internal
    if (cta.url.trim() && !cta.url.startsWith('/') && !cta.url.startsWith('#')) {
      items.push({ label: `URL ${key}`, status: 'warn', detail: 'URL externa', suggestion: 'CTAs devem apontar para páginas internas do portal.' });
    }
  }

  return { title: 'CTAs', icon: '🎯', items };
}

function getLinksValidations(data: GeneratedGuideData): ValidationGroup {
  const items: ValidationItem[] = [];

  if (data.internal_links.length === 0) {
    items.push({ label: 'Links úteis', status: 'warn', detail: 'Nenhum link adicionado', suggestion: 'Adicione 2-5 links internos relacionados ao tema.' });
  } else {
    const valid = data.internal_links.filter((l) => l.label.trim() && l.url.trim()).length;
    const incomplete = data.internal_links.length - valid;

    if (incomplete > 0) {
      items.push({ label: 'Links incompletos', status: 'warn', detail: `${incomplete} link(s) sem label ou URL` });
    }

    if (valid > 0) {
      items.push({ label: 'Links úteis', status: 'ok', detail: `${valid} configurado(s)` });
    }

    // Check for duplicate URLs
    const urls = data.internal_links.map((l) => l.url.trim()).filter(Boolean);
    const unique = new Set(urls);
    if (unique.size < urls.length) {
      items.push({ label: 'Links duplicados', status: 'warn', detail: `${urls.length - unique.size} URL(s) repetida(s)` });
    }

    // Check for external links in internal links section
    const external = data.internal_links.filter((l) => l.url.trim() && !l.url.startsWith('/') && !l.url.startsWith('#'));
    if (external.length > 0) {
      items.push({ label: 'Links externos', status: 'warn', detail: `${external.length} link(s) externo(s)`, suggestion: 'Links úteis devem ser internos do portal.' });
    }
  }

  return { title: 'Links', icon: '🔗', items };
}

function getImageValidations(data: GeneratedGuideData): ValidationGroup {
  const items: ValidationItem[] = [];
  const imgCount = countImages(data.content_markdown);
  const wordCount = data.content_markdown.trim().split(/\s+/).filter(Boolean).length;

  if (imgCount === 0 && wordCount > 300) {
    items.push({ label: 'Imagens no corpo', status: 'warn', detail: 'Nenhuma imagem', suggestion: 'Guias longos se beneficiam de imagens ilustrativas entre seções.' });
  } else if (imgCount > 0) {
    items.push({ label: 'Imagens no corpo', status: 'ok', detail: `${imgCount} imagem(ns)` });
  }

  // Check alt text
  const htmlImgsNoAlt = (data.content_markdown.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  if (htmlImgsNoAlt > 0) {
    items.push({ label: 'Alt text', status: 'warn', detail: `${htmlImgsNoAlt} sem alt`, suggestion: 'Adicione atributo alt descritivo em todas as imagens.' });
  } else if (imgCount > 0) {
    items.push({ label: 'Alt text', status: 'ok', detail: 'Todas com alt' });
  }

  // Cover image suggestion
  if (data.cover_image_suggestion) {
    items.push({ label: 'Capa sugerida', status: 'ok', detail: 'Sim' });
  } else {
    items.push({ label: 'Capa sugerida', status: 'warn', detail: 'Sem sugestão', suggestion: 'Considere adicionar uma sugestão de imagem de capa.' });
  }

  return { title: 'Imagens', icon: '🖼️', items };
}

/* ─── component ─── */

const statusIcon = {
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  error: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
};

interface Props {
  data: GeneratedGuideData;
}

function ValidationGroupCard({ group }: { group: ValidationGroup }) {
  const [expanded, setExpanded] = useState(true);
  const errors = group.items.filter((i) => i.status === 'error').length;
  const warnings = group.items.filter((i) => i.status === 'warn').length;

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{group.icon}</span>
        <span className="flex-1 text-left">{group.title}</span>
        {errors > 0 && <span className="text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-full">{errors}</span>}
        {warnings > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">{warnings}</span>}
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          {group.items.map((item, idx) => (
            <div key={`${item.label}-${idx}`}>
              <div
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded text-xs',
                  item.status === 'error' && 'bg-red-500/5',
                  item.status === 'warn' && 'bg-amber-500/5',
                )}
              >
                {statusIcon[item.status]}
                <span className="flex-1 font-medium">{item.label}</span>
                {item.detail && <span className="text-[11px] text-muted-foreground">{item.detail}</span>}
              </div>
              {item.suggestion && (
                <p className="text-[10px] text-muted-foreground pl-8 pr-2 pb-1 leading-tight">{item.suggestion}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GuideFlowValidation({ data }: Props) {
  const groups = [
    getFieldsValidations(data),
    getSeoValidations(data),
    getStructureValidations(data),
    getToneValidations(data),
    getCtaValidations(data),
    getLinksValidations(data),
    getImageValidations(data),
  ];

  const allItems = groups.flatMap((g) => g.items);
  const errors = allItems.filter((i) => i.status === 'error').length;
  const warnings = allItems.filter((i) => i.status === 'warn').length;
  const oks = allItems.filter((i) => i.status === 'ok').length;

  const score = Math.max(0, Math.round(((oks) / Math.max(allItems.length, 1)) * 100));
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Info className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Validação editorial</span>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> {oks}
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-3 w-3" /> {warnings}
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" /> {errors}
          </span>
        </div>
        <span className={cn('text-sm font-bold', scoreColor)}>{score}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500',
          )}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {groups.map((group) => (
          <ValidationGroupCard key={group.title} group={group} />
        ))}
      </div>

      {errors > 0 && (
        <p className="text-xs text-red-500 px-1">
          Corrija os itens obrigatórios antes de salvar.
        </p>
      )}
    </div>
  );
}

export function hasValidationErrors(data: GeneratedGuideData): boolean {
  return !data.title.trim() || !data.slug.trim() || !data.short_description.trim() || !data.category.trim() ||
    !isCategoriaPublica(data.public_category) ||
    data.content_markdown.trim().split(/\s+/).filter(Boolean).length < 50;
}
