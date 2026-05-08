/**
 * Maps copy audit issue categories to editor field applicability.
 * Determines which issues can be auto-fixed via editor fields vs manual template changes.
 */

export type Applicability = 'auto' | 'manual' | 'na';

export interface ClassifiedIssue {
  issue: string;
  category: string;
  impact: string;
  evidence: string;
  fix: string;
  priority: number;
  applicability: Applicability;
  reason: string;
  suggestedFields: string[];
}

interface IssueRule {
  /** Substring match on issue text (lowercase) */
  match: string[];
  applicability: Applicability;
  reason: string;
  suggestedFields: string[];
}

const RULES: IssueRule[] = [
  // Headline issues → auto-applicable via header_title / title_tag
  {
    match: ['h1 ausente', 'h1 muito longo', 'h1 muito curto', 'h1 genérico', 'múltiplos h1', 'headline'],
    applicability: 'auto',
    reason: 'Pode ser corrigido via campo "Título do Hero (H1)" ou "Title Tag".',
    suggestedFields: ['header_title', 'title_tag', 'titulo'],
  },
  // Title tag issues
  {
    match: ['title tag', 'título da página', 'meta title', 'meta_title'],
    applicability: 'auto',
    reason: 'Pode ser corrigido via campo "Title Tag" ou "Meta Title".',
    suggestedFields: ['title_tag', 'meta_title', 'titulo'],
  },
  // Meta description issues → auto-applicable
  {
    match: ['meta description', 'meta_description', 'descrição meta'],
    applicability: 'auto',
    reason: 'Pode ser corrigido via campo "Meta Description".',
    suggestedFields: ['meta_description'],
  },
  // Clarity issues on text → partially applicable via resumo_editorial / header_description
  {
    match: [
      'sentenças muito longas', 'sentenças longas', 'frases longas', 'frases muito longas',
      'buzzwords', 'jargão', 'excesso de buzzwords',
      'parágrafos longos', 'parágrafos muito longos', 'parágrafos excessivamente longos',
      'linguagem genérica', 'termos genéricos', 'texto genérico',
      'clareza', 'legibilidade',
    ],
    applicability: 'auto',
    reason: 'Pode ser melhorado via campos "Resumo Editorial" ou "Descrição do Hero".',
    suggestedFields: ['resumo_editorial', 'header_description', 'conteudo_principal'],
  },
  // CTA issues → NOT fixable via editor fields (template/component level)
  {
    match: ['cta principal ausente', 'cta sem verbo', 'cta fraco', 'cta ausente no final', 'call to action', 'cta ausente'],
    applicability: 'manual',
    reason: 'CTAs são definidos nos componentes/templates da página, não nos campos editáveis.',
    suggestedFields: [],
  },
  // Structure issues → NOT fixable via editor
  {
    match: ['poucos headings', 'ausência de listas', 'parágrafos excessivamente', 'estrutura', 'hierarquia de headings'],
    applicability: 'manual',
    reason: 'A estrutura da página (headings, listas, parágrafos) é definida no template/componente.',
    suggestedFields: [],
  },
  // Social proof → NOT fixable via editor
  {
    match: ['falta de prova social', 'prova social', 'depoimentos'],
    applicability: 'manual',
    reason: 'Prova social é definida nos componentes/seções da página, não nos campos editáveis.',
    suggestedFields: [],
  },
];

/**
 * Classify a single issue by applicability based on known rules.
 */
export function classifyIssue(
  issue: { issue: string; category: string; impact: string; evidence: string; fix: string; priority: number },
  availableFieldKeys: string[],
): ClassifiedIssue {
  const issueLower = issue.issue.toLowerCase();

  for (const rule of RULES) {
    if (rule.match.some(m => issueLower.includes(m))) {
      // If auto but the required fields don't exist in the profile, downgrade to manual
      if (rule.applicability === 'auto') {
        const hasField = rule.suggestedFields.some(f => availableFieldKeys.includes(f));
        if (!hasField) {
          return {
            ...issue,
            applicability: 'manual',
            reason: `Campos necessários (${rule.suggestedFields.join(', ')}) não estão disponíveis neste perfil de editor.`,
            suggestedFields: rule.suggestedFields,
          };
        }
      }
      return {
        ...issue,
        applicability: rule.applicability,
        reason: rule.reason,
        suggestedFields: rule.suggestedFields,
      };
    }
  }

  // Default: unknown issues are manual
  return {
    ...issue,
    applicability: 'na',
    reason: 'Issue não mapeada para campos editáveis conhecidos.',
    suggestedFields: [],
  };
}

/**
 * Classify all issues from a finding.
 */
export function classifyIssues(
  issues: Array<{ issue: string; category: string; impact: string; evidence: string; fix: string; priority: number }>,
  availableFieldKeys: string[],
): ClassifiedIssue[] {
  return issues.map(i => classifyIssue(i, availableFieldKeys));
}

/**
 * Get summary counts.
 */
export function getApplicabilitySummary(classified: ClassifiedIssue[]) {
  const auto = classified.filter(c => c.applicability === 'auto').length;
  const manual = classified.filter(c => c.applicability === 'manual').length;
  const na = classified.filter(c => c.applicability === 'na').length;
  return { auto, manual, na, total: classified.length };
}
