import type { Guide } from '@/hooks/useGuides';

export type TrailStage = 'busca' | 'exploracao' | 'decisao' | 'validacao' | 'expansao' | 'aplicacao';
export type TrailStageStatus = 'published' | 'partial' | 'draft' | 'missing';
export type TrailCoverageLevel = 'complete' | 'partial';
export type TrailAssociationRole = 'primary' | 'secondary';
export interface TrailGuideAssociation {
  guide: Guide;
  stage: TrailStage;
  role: TrailAssociationRole;
  coverage: TrailCoverageLevel;
  justification: string;
}
export interface TrailCoverageStatusOverride {
  subject: string;
  stage: TrailStage;
  status: Exclude<TrailStageStatus, 'missing'>;
}

export interface TrailSubjectCoverage {
  subject: string;
  stages: Record<TrailStage, { status: TrailStageStatus; guides: Guide[]; associations: TrailGuideAssociation[] }>;
  coveredCount: number;
  partialCount: number;
  draftCount: number;
  missingCount: number;
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
  { value: 'validacao', label: 'Validação', description: 'Redução de risco antes de agir.' },
  { value: 'decisao', label: 'Decisão', description: 'Critérios para escolher melhor.' },
  { value: 'aplicacao', label: 'Aplicação', description: 'Execução prática e passo a passo.' },
  { value: 'expansao', label: 'Expansão', description: 'Usos e benefícios adicionais.' },
];

export const TRAIL_PRODUCTION_PRIORITY: TrailStage[] = [
  'busca',
  'exploracao',
  'validacao',
  'decisao',
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
  return getGuideTrailAssociations(guide)[0]?.stage ?? null;
}

function isTrailStage(value: unknown): value is TrailStage {
  return typeof value === 'string' && TRAIL_STAGES.some((stage) => stage.value === value);
}

function markdownSignals(guide: Guide) {
  const markdown = guide.content_markdown ?? '';
  const headings = markdown.split('\n').filter((line) => /^#{2,3}\s+/.test(line)).join(' ');
  const firstParagraph = markdown
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s+/gm, '').trim())
    .find(Boolean) ?? '';
  return normalize(`${guide.title} ${guide.short_description} ${firstParagraph} ${headings} ${markdown.slice(0, 6000)}`);
}

const STAGE_FORMAT_SIGNALS: Record<TrailStage, string[]> = {
  busca: ['o que e', 'o que sao', 'como funciona', 'entenda', 'conceito', 'para que serve'],
  exploracao: ['onde encontrar', 'melhores opcoes', 'melhores plataformas', 'lista de', 'alternativas', 'plataformas'],
  validacao: ['confiavel', 'vale a pena', 'verificar', 'riscos', 'alerta', 'validade', 'cuidado', 'antes de'],
  decisao: ['como escolher', 'qual escolher', 'comparacao', 'comparar', 'criterios de escolha', 'melhor para'],
  aplicacao: ['passo a passo', 'como usar', 'como solicitar', 'como fazer', 'como conseguir', 'no curriculo', 'horas complementares'],
  expansao: ['beneficios', 'oportunidades', 'da direito', 'pode abrir', 'outros usos', 'alem de'],
};

function inferredAssociations(guide: Guide): TrailGuideAssociation[] {
  const text = markdownSignals(guide);
  const scores = TRAIL_STAGES.map(({ value }) => ({
    stage: value,
    score: STAGE_FORMAT_SIGNALS[value].reduce((score, signal) => score + (text.includes(signal) ? 1 : 0), 0),
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (scores.length === 0) return [];
  const primary = scores[0];
  const secondary = scores.slice(1, 3).filter((item) => item.score >= Math.max(1, primary.score - 1));
  return [
    { guide, stage: primary.stage, role: 'primary', coverage: 'complete', justification: 'A estrutura e a entrega principal da página correspondem a esta intenção.' },
    ...secondary.map((item): TrailGuideAssociation => ({
      guide,
      stage: item.stage,
      role: 'secondary',
      coverage: 'partial',
      justification: 'A página também responde parcialmente a esta intenção em seus subtítulos e orientações.',
    })),
  ];
}

function curatedCourseAssociations(guide: Guide): TrailGuideAssociation[] | null {
  const slug = normalize(guide.slug);
  const association = (stage: TrailStage, role: TrailAssociationRole, coverage: TrailCoverageLevel, justification: string): TrailGuideAssociation => ({
    guide, stage, role, coverage, justification,
  });
  if (slug.includes('plataformas-com-cursos-gratuitos-e-certificado-melhores-opcoes')) {
    return [association('exploracao', 'primary', 'complete', 'Apresenta alternativas e explica para quem cada plataforma serve.')];
  }
  if (slug.includes('como-escolher-cursos-online-com-certificado-que-realmente-valem-a-pena')) {
    return [
      association('decisao', 'primary', 'complete', 'Compara critérios e orienta a escolha do melhor curso para o objetivo do leitor.'),
      association('validacao', 'secondary', 'complete', 'Também cobre confiança, riscos, carga horária, validade e informações do certificado.'),
    ];
  }
  if (slug.includes('como-usar-certificados-de-cursos-online-no-curriculo-e-faculdade')) {
    return [association('aplicacao', 'primary', 'complete', 'Ensina como aplicar o certificado no currículo e na faculdade.')];
  }
  if (slug.includes('como-conseguir-horas-complementares-com-cursos-online')) {
    return [association('aplicacao', 'primary', 'complete', 'Ensina como usar cursos online para cumprir horas complementares.')];
  }
  if (slug.includes('cursos-gratuitos-podem-abrir-novas-oportunidades')) {
    return [association('expansao', 'primary', 'complete', 'Apresenta benefícios e novas oportunidades decorrentes dos cursos gratuitos.')];
  }
  if (slug.includes('cursos-gratuitos-dao-direito-a-carteira-de-estudante')) {
    return [association('expansao', 'secondary', 'partial', 'Responde a uma possibilidade específica relacionada aos benefícios dos cursos gratuitos.')];
  }
  return null;
}

export function getGuideTrailAssociations(guide: Guide, subject?: string): TrailGuideAssociation[] {
  const inputs = flowInputsOf(guide);
  const guideSubject = getGuideTrailSubject(guide);
  const requestedSubject = subject ? canonicalSubject(subject) : guideSubject;
  if (!requestedSubject) return [];

  if (normalize(requestedSubject) === normalize('Cursos gratuitos')) {
    const curated = curatedCourseAssociations(guide);
    if (curated) return curated;
  }

  if (!guideSubject || normalize(guideSubject) !== normalize(requestedSubject)) return [];
  const stored = inputs.tipo ?? inputs.trailStage ?? inputs.stage;
  const storedSecondary = inputs.etapasSecundarias ?? inputs.secondaryStages;
  const secondaryStages = Array.isArray(storedSecondary) ? storedSecondary.filter(isTrailStage).slice(0, 2) : [];
  if (isTrailStage(stored)) {
    const justification = typeof inputs.justificativaCobertura === 'string' && inputs.justificativaCobertura.trim()
      ? inputs.justificativaCobertura.trim()
      : 'Etapa principal definida no fluxo editorial.';
    return [
      { guide, stage: stored, role: 'primary', coverage: 'complete', justification },
      ...secondaryStages.map((stage): TrailGuideAssociation => ({
        guide,
        stage,
        role: 'secondary',
        coverage: 'partial',
        justification: 'Etapa secundária definida no fluxo editorial.',
      })),
    ];
  }

  return inferredAssociations(guide);
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

function emptyStages(): TrailSubjectCoverage['stages'] {
  return TRAIL_STAGES.reduce((acc, stage) => {
    acc[stage.value] = { status: 'missing', guides: [], associations: [] };
    return acc;
  }, {} as TrailSubjectCoverage['stages']);
}

function pickNextStage(stages: TrailSubjectCoverage['stages']) {
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
  if (normalize(subject) === normalize('Cursos gratuitos') && stage === 'busca') {
    return 'O que são cursos gratuitos online e como funcionam';
  }
  const lower = subject.toLowerCase();
  const titles: Record<TrailStage, string> = {
    busca: `${subject}: o que é e como funciona`,
    exploracao: `Melhores caminhos para ${lower}: opções para começar`,
    decisao: `Como escolher ${lower} sem perder tempo`,
    validacao: `${subject}: o que vale a pena conferir antes de agir`,
    expansao: `Como ${lower} pode abrir novas oportunidades`,
    aplicacao: `Como usar ${lower} na prática: passo a passo`,
  };
  return titles[stage];
}

export function trailQuestionFor(subject: string, stage: TrailStage) {
  if (normalize(subject) === normalize('Cursos gratuitos')) {
    const courseQuestions: Record<TrailStage, string> = {
      busca: 'O que são cursos gratuitos online e como funcionam?',
      exploracao: 'Onde encontrar cursos gratuitos online confiáveis?',
      validacao: 'Como verificar se o curso e o certificado são confiáveis?',
      decisao: 'Como escolher o melhor curso para meu objetivo?',
      aplicacao: 'Como usar o certificado depois de concluir o curso?',
      expansao: 'Que outros benefícios e oportunidades os cursos gratuitos podem oferecer?',
    };
    return courseQuestions[stage];
  }

  const questions: Record<TrailStage, string> = {
    busca: `${subject}: o que é e como funciona?`,
    exploracao: `Onde encontrar opções confiáveis sobre ${subject.toLowerCase()}?`,
    validacao: `${subject}: como verificar confiança, riscos e limitações?`,
    decisao: `Como escolher a melhor opção relacionada a ${subject.toLowerCase()}?`,
    aplicacao: `Como aplicar ${subject.toLowerCase()} na prática?`,
    expansao: `Que outros benefícios e oportunidades existem em ${subject.toLowerCase()}?`,
  };
  return questions[stage];
}

function reasonFor(subject: string, stage: TrailStage, stages: TrailSubjectCoverage['stages']) {
  const covered = TRAIL_STAGES.filter((item) => stages[item.value].status === 'published').map((item) => item.label);
  const missingLabel = TRAIL_STAGES.find((item) => item.value === stage)?.label ?? stage;

  if (covered.length === 0) {
    return `Ainda não há cobertura clara para ${subject}. A melhor próxima peça é uma página de ${missingLabel}, porque ela cria a porta de entrada do cluster.`;
  }

  return `Já existe cobertura em ${covered.join(', ')}, mas falta uma página de ${missingLabel}. Essa peça completa melhor a evolução do usuário dentro do assunto antes de avançar para etapas menos urgentes.`;
}

function recommendedLinks(stages: TrailSubjectCoverage['stages'], stage: TrailStage) {
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

export function buildTrailRecommendation(subject: string, stage: TrailStage, stages: TrailSubjectCoverage['stages']): TrailRecommendation {
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

export function buildTrailCoverage(
  guides: Guide[],
  subject: string,
  statusOverrides: TrailCoverageStatusOverride[] = [],
): TrailSubjectCoverage {
  const stages = emptyStages();
  const normalizedSubject = normalize(subject);

  guides.forEach((guide) => {
    const associations = getGuideTrailAssociations(guide, subject);
    associations.forEach((association) => {
      const bucket = stages[association.stage];
      bucket.associations.push(association);
      if (!bucket.guides.some((item) => item.id === guide.id)) bucket.guides.push(guide);
    });
  });

  TRAIL_STAGES.forEach(({ value }) => {
    const associations = stages[value].associations;
    if (associations.some((item) => item.guide.is_published && item.coverage === 'complete')) {
      stages[value].status = 'published';
    } else if (associations.some((item) => !item.guide.is_published)) {
      stages[value].status = 'draft';
    } else if (associations.some((item) => item.guide.is_published && item.coverage === 'partial')) {
      stages[value].status = 'partial';
    }
  });

  statusOverrides
    .filter((item) => normalize(item.subject) === normalizedSubject)
    .forEach((item) => {
      const current = stages[item.stage].status;
      if (item.status === 'published' || (item.status === 'draft' && current !== 'published') || current === 'missing') {
        stages[item.stage].status = item.status;
      }
    });

  const coveredCount = TRAIL_STAGES.filter(({ value }) => stages[value].status === 'published').length;
  const partialCount = TRAIL_STAGES.filter(({ value }) => stages[value].status === 'partial').length;
  const draftCount = TRAIL_STAGES.filter(({ value }) => stages[value].status === 'draft').length;
  const missingCount = TRAIL_STAGES.filter(({ value }) => stages[value].status === 'missing').length;
  const integrity = Math.round(((coveredCount + partialCount * 0.5) / TRAIL_STAGES.length) * 100);
  const missingStages = TRAIL_STAGES.map((stage) => stage.value).filter((stage) => stages[stage].status === 'missing');
  const nextStage = pickNextStage(stages);

  return {
    subject,
    stages,
    coveredCount,
    partialCount,
    draftCount,
    missingCount,
    integrity,
    missingStages,
    nextStage,
    recommendation: nextStage ? buildTrailRecommendation(subject, nextStage, stages) : null,
  };
}

export function buildAllTrailCoverages(guides: Guide[], statusOverrides: TrailCoverageStatusOverride[] = []) {
  const subjects = new Map<string, string>();
  getTrailSubjects(guides).forEach((subject) => subjects.set(normalize(subject), subject));
  statusOverrides.forEach((item) => {
    const canonical = canonicalSubject(item.subject);
    subjects.set(normalize(canonical), canonical);
  });
  return Array.from(subjects.values())
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((subject) => buildTrailCoverage(guides, subject, statusOverrides));
}
