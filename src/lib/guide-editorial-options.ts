// ─── Structured editorial metadata for Guide Flow ───────────────

export interface GuideOption {
  value: string;
  label: string;
  shortDescription: string;
  editorialMeaning?: string;
  editorialContext?: string;
  generationImpact: string;
}

// ─── Tipo de Guia ───────────────────────────────────────────────
export const TIPOS_GUIA: GuideOption[] = [
  {
    value: 'busca',
    label: 'Busca',
    shortDescription: 'Responde uma dúvida direta pesquisada pelo usuário.',
    editorialMeaning: 'O leitor veio do Google com uma pergunta objetiva e quer sair com uma resposta clara.',
    generationImpact: 'Priorizar resposta rápida, clareza, escaneabilidade e abertura objetiva.',
  },
  {
    value: 'exploracao',
    label: 'Exploração',
    shortDescription: 'Mostra opções, caminhos, recursos ou alternativas.',
    editorialMeaning: 'O leitor quer entender o cenário antes de agir — busca amplitude, não profundidade.',
    generationImpact: 'Priorizar visão geral, organização de possibilidades e comparação leve.',
  },
  {
    value: 'decisao',
    label: 'Decisão',
    shortDescription: 'Ajuda o usuário a escolher corretamente.',
    editorialMeaning: 'O leitor já sabe que precisa decidir, mas não sabe qual opção escolher.',
    generationImpact: 'Priorizar critérios, comparação, redução de dúvida e recomendação prática.',
  },
  {
    value: 'validacao',
    label: 'Validação',
    shortDescription: 'Confirma se algo serve, vale, é aceito ou funciona.',
    editorialMeaning: 'O leitor já tem uma opção em mente e quer confirmação ou alerta.',
    generationImpact: 'Priorizar resposta direta, limites, condições, exceções e cautela editorial.',
  },
  {
    value: 'expansao',
    label: 'Expansão',
    shortDescription: 'Mostra usos, benefícios ou possibilidades além do óbvio.',
    editorialMeaning: 'O leitor já conhece o básico e quer descobrir mais valor no que já usa.',
    generationImpact: 'Priorizar desdobramentos, ganho percebido e novas aplicações do tema.',
  },
  {
    value: 'aplicacao',
    label: 'Aplicação',
    shortDescription: 'Ensina como fazer ou usar algo na prática.',
    editorialMeaning: 'O leitor quer execução — precisa de passo a passo concreto.',
    generationImpact: 'Priorizar execução, ordem lógica, passo a passo e orientação acionável.',
  },
];

// ─── Categoria ──────────────────────────────────────────────────
export const CATEGORIAS: GuideOption[] = [
  {
    value: 'estudos-planejamento',
    label: 'Estudos e Planejamento',
    shortDescription: 'Organização, cronogramas, técnicas de estudo e preparação.',
    editorialContext: 'Conteúdo sobre como planejar, organizar e executar uma rotina de estudos eficiente.',
    generationImpact: 'Tom instrucional com foco em método e organização.',
  },
  {
    value: 'cursos-certificados-formacao',
    label: 'Cursos, Certificados e Formação',
    shortDescription: 'Cursos, plataformas, certificados e horas complementares.',
    editorialContext: 'Cursos, plataformas, certificados, horas complementares e usos acadêmicos ou profissionais da formação.',
    generationImpact: 'Deve referenciar plataformas reais e detalhar requisitos de certificação.',
  },
  {
    value: 'ferramentas-tecnologia',
    label: 'Ferramentas e Tecnologia',
    shortDescription: 'Apps, IA, sites e recursos tecnológicos úteis.',
    editorialContext: 'Ferramentas digitais, IA, apps, sites e recursos tecnológicos úteis para estudar, trabalhar e organizar melhor a rotina.',
    generationImpact: 'Deve ser prático, com links e comparações quando possível.',
  },
  {
    value: 'produtividade-rotina',
    label: 'Produtividade e Rotina',
    shortDescription: 'Hábitos, foco, gestão de tempo e bem-estar.',
    editorialContext: 'Técnicas de produtividade, gestão de tempo, hábitos saudáveis e equilíbrio na rotina de estudos.',
    generationImpact: 'Tom motivacional equilibrado com dicas acionáveis.',
  },
  {
    value: 'carreira-oportunidades',
    label: 'Carreira e Oportunidades',
    shortDescription: 'Mercado, concursos, estágios e crescimento profissional.',
    editorialContext: 'Orientação sobre carreira pública, concursos, estágios, processos seletivos e desenvolvimento profissional.',
    generationImpact: 'Deve incluir dados concretos e orientação prática de carreira.',
  },
  {
    value: 'provas-editais-regras',
    label: 'Provas, Editais e Regras',
    shortDescription: 'Editais, inscrições, bancas e regras de concursos.',
    editorialContext: 'Informações sobre editais, processos de inscrição, bancas organizadoras, regras e legislação de concursos.',
    generationImpact: 'Exige precisão factual e cautela — preferir fontes oficiais.',
  },
  {
    value: 'guias-praticos',
    label: 'Guias práticos do dia a dia',
    shortDescription: 'Tutoriais e soluções rápidas para o cotidiano.',
    editorialContext: 'Guias diretos e práticos para resolver questões do dia a dia relacionadas a estudo e carreira.',
    generationImpact: 'Tom direto, sem rodeios, foco em resolução rápida.',
  },
];

// ─── Intenção ───────────────────────────────────────────────────
export const INTENCOES: GuideOption[] = [
  {
    value: 'esclarecer-duvida',
    label: 'Esclarecer uma dúvida',
    shortDescription: 'O leitor quer entender algo rapidamente.',
    generationImpact: 'Responder cedo e com clareza, sem introdução longa e sem desviar do ponto principal.',
  },
  {
    value: 'comparar-opcoes',
    label: 'Comparar opções',
    shortDescription: 'O leitor quer ver diferenças entre alternativas.',
    generationImpact: 'Destacar diferenças, critérios e cenários de uso para cada opção.',
  },
  {
    value: 'ensinar-como-fazer',
    label: 'Ensinar como fazer',
    shortDescription: 'O leitor quer aprender um processo ou técnica.',
    generationImpact: 'Priorizar lógica prática, execução e passo a passo claro.',
  },
  {
    value: 'ajudar-a-decidir',
    label: 'Ajudar a decidir',
    shortDescription: 'O leitor precisa de orientação para escolher.',
    generationImpact: 'Reduzir dúvida, apresentar critérios claros e orientar escolha com confiança.',
  },
  {
    value: 'resolver-problema',
    label: 'Resolver um problema específico',
    shortDescription: 'O leitor está travado e quer destravamento.',
    generationImpact: 'Priorizar destravamento rápido, diagnóstico e próximo passo útil.',
  },
];

// ─── Categoria Pública ──────────────────────────────────────────
// Apenas para EXIBIÇÃO no site (badge visual).
// NÃO influencia geração de conteúdo, prompt da IA ou lógica editorial.
export const CATEGORIAS_PUBLICAS = [
  'Educação',
  'Carreira',
  'Ferramentas',
  'Guias',
  'Benefícios',
  'Oportunidades',
  'Listas',
  'Segurança',
] as const;

export type CategoriaPublica = typeof CATEGORIAS_PUBLICAS[number];

export function isCategoriaPublica(value: string | undefined | null): value is CategoriaPublica {
  return typeof value === 'string' && (CATEGORIAS_PUBLICAS as readonly string[]).includes(value);
}

/**
 * Mapeia uma Categoria Interna (operacional/editorial) para uma Categoria Pública
 * (badge visual). Usado como sugestão padrão — admin sempre pode trocar.
 */
export function mapInternaToPublica(internaValue: string | undefined | null): CategoriaPublica {
  if (!internaValue) return 'Guias';
  const v = internaValue.trim();
  // Aceita tanto value (slug) quanto label (texto exibido)
  switch (v) {
    case 'estudos-planejamento':
    case 'Estudos e Planejamento':
    case 'cursos-certificados-formacao':
    case 'Cursos, Certificados e Formação':
    case 'produtividade-rotina':
    case 'Produtividade e Rotina':
      return 'Educação';
    case 'carreira-oportunidades':
    case 'Carreira e Oportunidades':
      return 'Carreira';
    case 'ferramentas-tecnologia':
    case 'Ferramentas e Tecnologia':
      return 'Ferramentas';
    case 'provas-editais-regras':
    case 'Provas, Editais e Regras':
      return 'Oportunidades';
    case 'guias-praticos':
    case 'Guias práticos do dia a dia':
      return 'Guias';
    default:
      return 'Guias';
  }
}

// ─── Helpers ────────────────────────────────────────────────────
export function findOption(list: GuideOption[], value: string): GuideOption | undefined {
  return list.find(o => o.value === value);
}
