import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, MinusCircle, HelpCircle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedGuideData } from '../GuideFlowPreview';
import { resolveStructureMapping } from '@/lib/guide-structure-mapping';

type ComplianceStatus = 'conforme' | 'parcial' | 'nao_conforme' | 'nao_verificado' | 'nao_aplicavel' | 'sem_fonte';

interface DirectiveCheck {
  directive: string;
  sourceFile: string | null;
  status: ComplianceStatus;
  observation: string;
}

function evaluateDirectives(data: GeneratedGuideData, structureFiles: string[]): DirectiveCheck[] {
  const checks: DirectiveCheck[] = [];
  const mapping = resolveStructureMapping(structureFiles);

  const getMapping = (key: string) => mapping.find(m => m.key === key);

  // 1. Títulos
  const titulos = getMapping('titulos');
  if (titulos?.resolvedFile) {
    const titleLen = data.title.length;
    const hasBoldH2 = /^## \*\*/m.test(data.content_markdown);
    checks.push({
      directive: 'Estilo de Títulos',
      sourceFile: titulos.resolvedFile,
      status: titleLen > 10 && titleLen <= 70 && hasBoldH2 ? 'conforme' : titleLen > 10 ? 'parcial' : 'nao_conforme',
      observation: hasBoldH2
        ? `Título com ${titleLen} chars, H2 em negrito`
        : `Título com ${titleLen} chars${!hasBoldH2 ? ', H2 sem negrito' : ''}`,
    });
  } else {
    checks.push({ directive: 'Estilo de Títulos', sourceFile: null, status: 'sem_fonte', observation: 'Arquivo de diretriz não encontrado no bucket' });
  }

  // 2. Estrutura Textual
  const estrutura = getMapping('estrutura');
  if (estrutura?.resolvedFile) {
    const hasH2 = /^## /m.test(data.content_markdown);
    const hasH3 = /^### /m.test(data.content_markdown);
    const sections = (data.content_markdown.match(/^## /gm) || []).length;
    checks.push({
      directive: 'Estrutura Textual',
      sourceFile: estrutura.resolvedFile,
      status: hasH2 && sections >= 3 ? 'conforme' : hasH2 ? 'parcial' : 'nao_conforme',
      observation: hasH2
        ? `${sections} seções H2${hasH3 ? ', com sub-seções H3' : ''}`
        : 'Faltam seções H2 na hierarquia',
    });
  } else {
    checks.push({ directive: 'Estrutura Textual', sourceFile: null, status: 'sem_fonte', observation: 'Arquivo de diretriz não encontrado no bucket' });
  }

  // 3. Imagens
  const imagens = getMapping('imagens');
  if (imagens?.resolvedFile) {
    const hasImageTag = /<img/i.test(data.content_markdown);
    const hasImageSuggestion = !!data.cover_image_suggestion;
    checks.push({
      directive: 'Diretriz de Imagens',
      sourceFile: imagens.resolvedFile,
      status: hasImageTag || hasImageSuggestion ? 'conforme' : 'parcial',
      observation: hasImageTag
        ? 'Referências de imagem encontradas no conteúdo'
        : hasImageSuggestion
        ? 'Sugestão de capa presente, sem imagens no corpo'
        : 'Sem referências de imagem',
    });
  } else {
    checks.push({ directive: 'Diretriz de Imagens', sourceFile: null, status: 'sem_fonte', observation: 'Arquivo de diretriz não encontrado no bucket' });
  }

  // 4. Tipo de Guia
  const tipoGuia = getMapping('tipo_guia');
  if (tipoGuia?.resolvedFile) {
    const words = data.content_markdown.split(/\s+/).length;
    checks.push({
      directive: 'Função do Tipo de Guia',
      sourceFile: tipoGuia.resolvedFile,
      status: words >= 500 ? 'conforme' : words >= 300 ? 'parcial' : 'nao_conforme',
      observation: `${words} palavras no conteúdo`,
    });
  } else {
    checks.push({ directive: 'Função do Tipo de Guia', sourceFile: null, status: 'sem_fonte', observation: 'Arquivo de diretriz não encontrado no bucket' });
  }

  // 5. Linguagem
  const linguagem = getMapping('linguagem');
  if (linguagem?.resolvedFile) {
    const buzzwords = ['disruptivo', 'inovador', 'revolucionário', 'incrível', 'fantástico'];
    const found = buzzwords.filter(w => data.content_markdown.toLowerCase().includes(w));
    const genericOpeners = ['neste artigo', 'nesse artigo', 'vamos falar sobre'];
    const hasGeneric = genericOpeners.some(g => data.content_markdown.toLowerCase().includes(g));
    checks.push({
      directive: 'Linguagem Padrão',
      sourceFile: linguagem.resolvedFile,
      status: found.length === 0 && !hasGeneric ? 'conforme' : 'parcial',
      observation: found.length > 0
        ? `Buzzwords encontradas: ${found.join(', ')}`
        : hasGeneric
        ? 'Abertura genérica detectada'
        : 'Linguagem aderente ao padrão',
    });
  } else {
    checks.push({ directive: 'Linguagem Padrão', sourceFile: null, status: 'sem_fonte', observation: 'Arquivo de diretriz não encontrado no bucket' });
  }

  // 6. Ritmo
  const ritmo = getMapping('ritmo');
  if (ritmo?.resolvedFile) {
    const sentences = data.content_markdown.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const avgWords = sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length
      : 0;
    checks.push({
      directive: 'Ritmo de Leitura',
      sourceFile: ritmo.resolvedFile,
      status: avgWords > 0 && avgWords <= 25 ? 'conforme' : avgWords <= 30 ? 'parcial' : 'nao_conforme',
      observation: `Média de ${Math.round(avgWords)} palavras/frase (ideal ≤ 22)`,
    });
  } else {
    checks.push({ directive: 'Ritmo de Leitura', sourceFile: null, status: 'sem_fonte', observation: 'Arquivo de diretriz não encontrado no bucket' });
  }

  // 7. Links Internos
  const links = getMapping('links');
  if (links?.resolvedFile) {
    const linkCount = data.internal_links.length;
    const allInternal = data.internal_links.every(l => l.url.startsWith('/'));
    checks.push({
      directive: 'Sistema de Links Internos',
      sourceFile: links.resolvedFile,
      status: linkCount >= 2 && allInternal ? 'conforme' : linkCount >= 1 ? 'parcial' : 'nao_conforme',
      observation: linkCount === 0
        ? 'Nenhum link interno sugerido'
        : `${linkCount} link${linkCount > 1 ? 's' : ''} interno${linkCount > 1 ? 's' : ''}${!allInternal ? ' (alguns externos)' : ''}`,
    });
  } else {
    checks.push({ directive: 'Sistema de Links Internos', sourceFile: null, status: 'sem_fonte', observation: 'Arquivo de diretriz não encontrado no bucket' });
  }

  // ─── Internal validations (always present) ───
  const seoTitleLen = data.seo_title?.length ?? 0;
  const seoDescLen = data.seo_description?.length ?? 0;
  checks.push({
    directive: 'SEO — Título',
    sourceFile: 'Validação interna',
    status: seoTitleLen > 0 && seoTitleLen <= 60 ? 'conforme' : seoTitleLen > 0 ? 'parcial' : 'nao_conforme',
    observation: seoTitleLen === 0 ? 'Título SEO vazio' : `${seoTitleLen}/60 caracteres`,
  });
  checks.push({
    directive: 'SEO — Meta Description',
    sourceFile: 'Validação interna',
    status: seoDescLen > 0 && seoDescLen <= 160 ? 'conforme' : seoDescLen > 0 ? 'parcial' : 'nao_conforme',
    observation: seoDescLen === 0 ? 'Meta description vazia' : `${seoDescLen}/160 caracteres`,
  });

  const ctaCount = [data.cta_top, data.cta_middle, data.cta_final].filter(Boolean).length;
  checks.push({
    directive: 'CTAs Contextuais',
    sourceFile: 'Validação interna',
    status: ctaCount >= 2 ? 'conforme' : ctaCount >= 1 ? 'parcial' : 'nao_conforme',
    observation: `${ctaCount}/3 CTAs definidas`,
  });

  const missing: string[] = [];
  if (!data.title) missing.push('título');
  if (!data.slug) missing.push('slug');
  if (!data.category) missing.push('categoria');
  if (!data.short_description) missing.push('descrição');
  if (!data.content_markdown) missing.push('conteúdo');
  checks.push({
    directive: 'Campos Obrigatórios',
    sourceFile: 'Validação interna',
    status: missing.length === 0 ? 'conforme' : 'nao_conforme',
    observation: missing.length === 0 ? 'Todos preenchidos' : `Faltam: ${missing.join(', ')}`,
  });

  return checks;
}

const statusConfig: Record<ComplianceStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  conforme: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Conforme' },
  parcial: { icon: AlertTriangle, color: 'text-amber-500', label: 'Parcial' },
  nao_conforme: { icon: XCircle, color: 'text-red-500', label: 'Não conforme' },
  nao_verificado: { icon: HelpCircle, color: 'text-muted-foreground', label: 'Não verificado' },
  nao_aplicavel: { icon: MinusCircle, color: 'text-muted-foreground', label: 'N/A' },
  sem_fonte: { icon: XCircle, color: 'text-red-400', label: 'Sem fonte' },
};

interface IntegrityNodeData {
  guideData: GeneratedGuideData;
  structureFileNames: string[];
  hasLibrary: boolean;
  libraryName: string | null;
}

function IntegrityNodeComponent({ data }: { data: IntegrityNodeData }) {
  const { guideData, structureFileNames, hasLibrary, libraryName } = data;

  const checks = useMemo(() => evaluateDirectives(guideData, structureFileNames), [guideData, structureFileNames]);

  const scorable = checks.filter(c => c.status !== 'nao_aplicavel' && c.status !== 'nao_verificado' && c.status !== 'sem_fonte');
  const conforme = scorable.filter(c => c.status === 'conforme').length;
  const total = scorable.length;
  const score = total > 0 ? Math.round((conforme / total) * 100) : 0;
  const missingSource = checks.filter(c => c.status === 'sem_fonte').length;

  const color = score >= 80 ? 'emerald' : score >= 60 ? 'amber' : 'red';

  return (
    <div className="bg-card border border-emerald-500/30 rounded-[1.2rem] shadow-card w-[320px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-card" />

      <div className="bg-emerald-500/8 px-3 py-2 border-b border-emerald-500/15 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span className="text-xs font-semibold">Integridade por Diretriz</span>
        <Badge variant="outline" className="ml-auto text-[9px] h-4">
          {conforme}/{total}
        </Badge>
      </div>

      <div className="p-3 space-y-2">
        {/* Score */}
        <div className="flex items-center gap-3">
          <div className={cn('text-2xl font-bold', `text-${color}-500`)}>{score}%</div>
          <div className="flex-1">
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', `bg-${color}-500`)} style={{ width: `${score}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">Conformidade editorial</p>
          </div>
        </div>

        {/* Library status */}
        <div className={cn(
          'rounded-md px-2 py-1 text-[9px] flex items-center gap-1',
          hasLibrary ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
        )}>
          {hasLibrary ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
          {hasLibrary ? `Base factual: ${libraryName}` : 'Sem biblioteca — geração não validada'}
        </div>

        {/* Missing sources warning */}
        {missingSource > 0 && (
          <div className="rounded-md px-2 py-1 text-[9px] bg-red-500/10 text-red-600 flex items-center gap-1">
            <XCircle className="h-2.5 w-2.5" />
            {missingSource} dimensão(ões) sem arquivo fonte no bucket
          </div>
        )}

        {/* Directive checks */}
        <div className="max-h-[320px] overflow-y-auto space-y-1 pr-1">
          {checks.map((check, i) => {
            const cfg = statusConfig[check.status];
            const Icon = cfg.icon;
            return (
              <div key={i} className="rounded-md bg-muted/40 px-2 py-1.5 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn('h-3 w-3 shrink-0', cfg.color)} />
                  <span className="text-[10px] font-medium truncate flex-1">{check.directive}</span>
                  <span className={cn('text-[8px] px-1 py-0.5 rounded', cfg.color, 'bg-current/10')}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground pl-[18px]">{check.observation}</p>
                {check.sourceFile && (
                  <div className="flex items-center gap-1 pl-[18px]">
                    <Link2 className="h-2 w-2 text-muted-foreground/60" />
                    <p className="text-[8px] text-muted-foreground/60 italic truncate">{check.sourceFile}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const IntegrityNode = memo(IntegrityNodeComponent);
