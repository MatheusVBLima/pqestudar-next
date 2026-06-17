import type { Guide } from '@/hooks/useGuides';

export type TrailStage = 'busca' | 'exploracao' | 'decisao' | 'validacao' | 'expansao' | 'aplicacao';
export type TrailStageStatus = 'published' | 'draft' | 'missing';

export interface TrailSubjectCoverage {
  subject: string;
  stages: Record<TrailStage, { status: TrailStageStatus; guides: Guide[] }>;
  coveredCount: number;
  integrity: number;
  missingStages: TrailStage[];
  nextStage: TrailStage | null;
  recommendation: TrailRecommendation | null;
}

export interface TrailRecommendation {
  subject: string;
  stage: TrailStage;
  title: string;
  keyword: string;
  intent: string;
  internalCategory: string;
  publicCategory: string;
  reason: string;
  context: string;
  links: Array<{ label: string; url: string }>;
}

export const TRAIL_STAGES: Array<{ value: TrailStage; label: string; description: string }> = [
  { value: 'busca', label: 'Busca', description: 'Primeiro contato e resposta direta.' },
  { value: 'exploracao', label: 'Exploração', description: 'Opções, caminhos e alternativas.' },
  { value: 'decisao', label: 'Decisão', description: 'Critérios para escolher melhor.' },
  { value: 'validacao', label: 'Validação', description: 'Redução de risco antes de agir.' },
  { value: 'expansao', label: 'Expansão', description: 'Usos e benefícios adicionais.' },
  { value: 'aplicacao', label: 'Aplicação', description: 'Execução prática e passo a passo.' },
];

export const TRAIL_PRODUCTION_PRIORITY: TrailStage[] = [
  'busca',
  'exploracao',
  'decisao',
  'validacao',
  'aplicacao',
  'expansao',
];

export const DEFAULT_TRAIL_SUBJECTS = [
  'Cursos gratuitos',
  'Horas complementares',
  'Carteirinha de estudante',
  'Concurso público',
  'ENEM',
  'Currículo',
  'Inteligência artificial',
  'Benefícios sociais',
];

const SUBJECT_KEYWORDS: Array<{ subject: string; terms: string[] }> = [
  { subject: 'Cursos gratuitos', terms: ['curso gratuito', 'cursos gratuitos', 'certificado', 'plataforma de curso'] },
  { subject: 'Horas complementares', terms: ['hora complementar', 'horas complementares', 'atividade complementar'] },
  { subject: 'Carteirinha de estudante', terms: ['carteirinha', 'documento do estudante', 'meia-entrada'] },
  { subject: 'Concurso público', terms: ['concurso', 'concursos', 'edital', 'banca'] },
  { subject: 'ENEM', terms: ['enem', 'sisu', 'prouni', 'redação'] },
  { subject: 'Currículo', terms: ['currículo', 'curriculo', 'linkedin', 'perfil profissional'] },
  { subject: 'Inteligência artificial', terms: ['inteligência artificial', 'inteligencia artificial', 'ia ', 'chatgpt'] },
  { subject: 'Benefícios sociais', terms: ['benefício social', 'beneficios sociais', 'cadúnico', 'cadunico', 'bolsa família'] },
];

const STAGE_KEYWORDS: Array<{ stage: TrailStage; terms: string[] }> = [
  { stage: 'busca', terms: ['como conseguir', 'como encontrar', 'o que é', 'o que sao', 'o que são', 'para que serve'] },
  { stage: 'exploracao', terms: ['melhores', 'sites', 'plataformas', 'opções', 'opcoes', 'onde encontrar'] },
  { stage: 'decisao', terms: ['como escolher', 'qual ', 'vale mais', 'melhor para começar', 'comparar'] },
  { stage: 'validacao', terms: ['é aceito', 'e aceito', 'vale para', 'funciona', 'é confiável', 'e confiavel'] },
  { stage: 'expansao', terms: ['ajudar no currículo', 'ajudar no curriculo', 'benefícios', 'beneficios', 'fortalecer', 'usar para'] },
  { stage: 'aplicacao', terms: ['como colocar', 'como baixar', 'passo a passo', 'como usar', 'como fazer'] },
];

const STAGE_INTENT: Record<TrailStage, string> = {
  busca: 'esclarecer-duvida',
  exploracao: 'comparar-opcoes',
  decisao: 'ajudar-a-decidir',
  validacao: 'esclarecer-duvida',
  expansao: 'resolver-problema',
  aplicacao: 'ensinar-como-fazer',
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function capitalizeFirstWord(value: string) {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  return cleaned.replace(/^(\S)/u, (match) => match.toLocaleUpperCase('pt-BR'));
}

function canonicalSubject(value: string) {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  const normalized = normalize(cleaned);
  const defaultSubject = DEFAULT_TRAIL_SUBJECTS.find((subject) => normalize(subject) === normalized);
  if (defaultSubject) return defaultSubject;
  return capitalizeFirstWord(cleaned);
}

function flowInputsOf(guide: Guide): Record<string, unknown> {
  const flowData = guide.flow_data;
  if (!flowData || typeof flowData !== 'object' || Array.isArray(flowData)) return {};
  const inputs = (flowData as Record<string, unknown>).inputs;
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return {};
  return inputs as Record<string, unknown>;
}

export function getGuideTrailSubject(guide: Guide): string | null {
  const inputs = flowInputsOf(guide);
  const stored =
    inputs.assuntoPrincipal ??
    inputs.trailSubject ??
    inputs.editorialSubject ??
    inputs.subject;

  if (typeof stored === 'string' && stored.trim()) return canonicalSubject(stored);

  const haystack = normalize(`${guide.title} ${guide.short_description} ${guide.category} ${guide.public_category}`);
  return SUBJECT_KEYWORDS.find(({ terms }) => terms.some((term) => haystack.includes(normalize(term))))?.subject ?? null;
}

export function getGuideTrailStage(guide: Guide): TrailStage | null {
  const inputs = flowInputsOf(guide);
  const stored = inputs.tipo ?? inputs.trailStage ?? inputs.stage;
  if (typeof stored === 'string' && TRAIL_STAGES.some((stage) => stage.value === stored)) return stored as TrailStage;

  const haystack = normalize(`${guide.title} ${guide.short_description}`);
  return STAGE_KEYWORDS.find(({ terms }) => terms.some((term) => haystack.includes(normalize(term))))?.stage ?? null;
}

export function getTrailSubjects(guides: Guide[]) {
  const subjects = new Map<string, string>();
  DEFAULT_TRAIL_SUBJECTS.forEach((subject) => subjects.set(normalize(subject), subject));

  guides.forEach((guide) => {
    const subject = getGuideTrailSubject(guide);
    if (subject) {
      const key = normalize(subject);
      if (!subjects.has(key)) subjects.set(key, subject);
    }
  });

  return Array.from(subjects.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function emptyStages(): Record<TrailStage, { status: TrailStageStatus; guides: Guide[] }> {
  return TRAIL_STAGES.reduce((acc, stage) => {
    acc[stage.value] = { status: 'missing', guides: [] };
    return acc;
  }, {} as Record<TrailStage, { status: TrailStageStatus; guides: Guide[] }>);
}

function pickNextStage(stages: Record<TrailStage, { status: TrailStageStatus; guides: Guide[] }>) {
  return TRAIL_PRODUCTION_PRIORITY.find((stage) => stages[stage].status === 'missing') ?? null;
}

function bestInternalCategory(subject: string) {
  const n = normalize(subject);
  if (n.includes('concurso') || n.includes('enem')) return 'provas-editais-regras';
  if (n.includes('curriculo')) return 'carreira-oportunidades';
  if (n.includes('inteligencia') || n.includes('ferrament')) return 'ferramentas-tecnologia';
  if (n.includes('curso') || n.includes('hora complementar')) return 'cursos-certificados-formacao';
  return 'guias-praticos';
}

function publicCategoryFor(subject: string) {
  const n = normalize(subject);
  if (n.includes('concurso')) return 'Oportunidades';
  if (n.includes('curriculo')) return 'Carreira';
  if (n.includes('inteligencia')) return 'Ferramentas';
  if (n.includes('beneficio') || n.includes('carteirinha')) return 'Benefícios';
  return 'Educação';
}

function recommendationTitle(subject: string, stage: TrailStage) {
  const lower = subject.toLowerCase();
  const titles: Record<TrailStage, string> = {
    busca: `Como entender ${lower} sem complicação`,
    exploracao: `Melhores caminhos para ${lower}: opções para começar`,
    decisao: `Como escolher ${lower} sem perder tempo`,
    validacao: `${subject}: o que vale a pena conferir antes de agir`,
    expansao: `Como ${lower} pode abrir novas oportunidades`,
    aplicacao: `Como usar ${lower} na prática: passo a passo`,
  };
  return titles[stage];
}

function reasonFor(subject: string, stage: TrailStage, stages: Record<TrailStage, { status: TrailStageStatus; guides: Guide[] }>) {
  const covered = TRAIL_STAGES.filter((item) => stages[item.value].status !== 'missing').map((item) => item.label);
  const missingLabel = TRAIL_STAGES.find((item) => item.value === stage)?.label ?? stage;

  if (covered.length === 0) {
    return `Ainda não há cobertura clara para ${subject}. A melhor próxima peça é uma página de ${missingLabel}, porque ela cria a porta de entrada do cluster.`;
  }

  return `Já existe cobertura em ${covered.join(', ')}, mas falta uma página de ${missingLabel}. Essa peça completa melhor a evolução do usuário dentro do assunto antes de avançar para etapas menos urgentes.`;
}

function recommendedLinks(stages: Record<TrailStage, { status: TrailStageStatus; guides: Guide[] }>, stage: TrailStage) {
  const preferredByStage: Record<TrailStage, TrailStage[]> = {
    busca: ['exploracao', 'validacao', 'aplicacao'],
    exploracao: ['busca', 'validacao', 'decisao'],
    decisao: ['exploracao', 'validacao', 'aplicacao'],
    validacao: ['busca', 'exploracao', 'decisao'],
    expansao: ['busca', 'validacao', 'aplicacao'],
    aplicacao: ['decisao', 'validacao', 'expansao'],
  };

  return preferredByStage[stage]
    .flatMap((item) => stages[item].guides)
    .filter((guide) => guide.is_published)
    .slice(0, 3)
    .map((guide) => ({ label: guide.title, url: `/guias/${guide.slug}` }));
}

export function buildTrailRecommendation(subject: string, stage: TrailStage, stages: Record<TrailStage, { status: TrailStageStatus; guides: Guide[] }>): TrailRecommendation {
  const links = recommendedLinks(stages, stage);
  const title = recommendationTitle(subject, stage);
  const keyword = title
    .replace(/^Como\s+/i, '')
    .replace(/:.*$/, '')
    .toLowerCase();

  return {
    subject,
    stage,
    title,
    keyword,
    intent: STAGE_INTENT[stage],
    internalCategory: bestInternalCategory(subject),
    publicCategory: publicCategoryFor(subject),
    reason: reasonFor(subject, stage, stages),
    context: [
      `Planejador de Trilha: assunto principal "${subject}".`,
      `Etapa recomendada: ${TRAIL_STAGES.find((item) => item.value === stage)?.label}.`,
      reasonFor(subject, stage, stages),
      links.length > 0
        ? `Links internos recomendados: ${links.map((link) => `${link.label} (${link.url})`).join('; ')}.`
        : 'Ainda há poucos links internos publicados neste assunto; priorize criar uma peça pilar clara.',
    ].join('\n'),
    links,
  };
}

export function buildTrailCoverage(guides: Guide[], subject: string): TrailSubjectCoverage {
  const stages = emptyStages();
  const normalizedSubject = normalize(subject);

  guides.forEach((guide) => {
    const guideSubject = getGuideTrailSubject(guide);
    const guideStage = getGuideTrailStage(guide);
    if (!guideSubject || !guideStage || normalize(guideSubject) !== normalizedSubject) return;

    stages[guideStage].guides.push(guide);
  });

  TRAIL_STAGES.forEach(({ value }) => {
    const guidesForStage = stages[value].guides;
    if (guidesForStage.some((guide) => guide.is_published)) {
      stages[value].status = 'published';
    } else if (guidesForStage.length > 0) {
      stages[value].status = 'draft';
    }
  });

  const coveredCount = TRAIL_STAGES.filter(({ value }) => stages[value].status !== 'missing').length;
  const integrity = Math.round((coveredCount / TRAIL_STAGES.length) * 100);
  const missingStages = TRAIL_STAGES.map((stage) => stage.value).filter((stage) => stages[stage].status === 'missing');
  const nextStage = pickNextStage(stages);

  return {
    subject,
    stages,
    coveredCount,
    integrity,
    missingStages,
    nextStage,
    recommendation: nextStage ? buildTrailRecommendation(subject, nextStage, stages) : null,
  };
}

export function buildAllTrailCoverages(guides: Guide[]) {
  return getTrailSubjects(guides).map((subject) => buildTrailCoverage(guides, subject));
}
