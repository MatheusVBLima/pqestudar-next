import type { DomSnapshot } from './iframe-audit-engine';

interface Issue {
  category: string;
  issue: string;
  impact: string;
  evidence: string;
  fix: string;
  priority: number;
}

export interface CopyAnalysisResult {
  url: string;
  path: string;
  score: number;
  issues: Issue[];
  raw: Record<string, unknown>;
}

const WEAK_CTAS = [
  'saiba mais', 'clique aqui', 'enviar', 'entrar', 'submit', 'sign up',
  'learn more', 'click here', 'get started', 'começar',
];

const VAGUE_TERMS = [
  'inovador', 'otimizar', 'melhor', 'completo', 'incrível', 'revolucionário',
  'líder', 'top', 'excelente', 'fantástico', 'único', 'exclusivo',
  'solução completa', 'plataforma integrada', 'all-in-one',
];

const BUZZWORDS = [
  'streamline', 'optimize', 'innovative', 'cutting-edge', 'world-class',
  'best-in-class', 'leverage', 'synergy', 'paradigm', 'disruptive',
  'otimizar', 'inovador', 'sinergia', 'paradigma', 'disruptivo',
  'revolucionário', 'next-gen', 'state-of-the-art',
];

const SOCIAL_PROOF_TERMS = [
  'depoimento', 'avaliações', 'avaliação', 'alunos', 'usuários',
  'clientes', 'empresas', 'estrelas', 'nota', 'aprovados',
  'testimonial', 'review', 'rating', 'students', 'users',
];

const ACTION_VERBS = [
  'acess', 'começ', 'inscreva', 'crie', 'descubra', 'baixe', 'receba',
  'garanta', 'experimente', 'conheça', 'veja', 'explore',
  'start', 'get', 'create', 'download', 'try',
];

export function analyzeCopy(snapshot: DomSnapshot): CopyAnalysisResult {
  let score = 100;
  const issues: Issue[] = [];
  const penalties: { issue: string; points: number }[] = [];

  const add = (issue: Issue, pts: number) => {
    issues.push(issue);
    penalties.push({ issue: issue.issue, points: pts });
    score -= pts;
  };

  // ═══ 1) Headline ═══
  if (snapshot.h1Count === 0) {
    add({ category: 'Headline', issue: 'H1 ausente', impact: 'High', evidence: 'Nenhum H1 encontrado na página.', fix: 'Adicione um H1 claro com a proposta de valor principal.', priority: 1 }, 15);
  } else {
    if (snapshot.h1Text && snapshot.h1Text.length > 90) {
      add({ category: 'Headline', issue: 'H1 muito longo', impact: 'Medium', evidence: `H1 tem ${snapshot.h1Text.length} caracteres: "${snapshot.h1Text.slice(0, 60)}…"`, fix: 'Reduza o H1 para no máximo 90 caracteres.', priority: 3 }, 8);
    } else if (snapshot.h1Text && snapshot.h1Text.length < 15) {
      add({ category: 'Headline', issue: 'H1 muito curto', impact: 'Low', evidence: `H1 tem apenas ${snapshot.h1Text.length} caracteres: "${snapshot.h1Text}"`, fix: 'Expanda o H1 para comunicar a proposta de valor.', priority: 4 }, 3);
    }
    if (snapshot.h1Text) {
      const h1Lower = snapshot.h1Text.toLowerCase();
      const vagueMatch = VAGUE_TERMS.filter(t => h1Lower.includes(t));
      if (vagueMatch.length > 0) {
        add({ category: 'Headline', issue: 'H1 genérico/vago', impact: 'Medium', evidence: `H1 contém termos vagos: ${vagueMatch.join(', ')}`, fix: 'Substitua termos genéricos por benefícios concretos.', priority: 2 }, 8);
      }
    }
    if (snapshot.h1Count > 1) {
      add({ category: 'Headline', issue: 'Múltiplos H1', impact: 'Low', evidence: `Encontrados ${snapshot.h1Count} tags H1.`, fix: 'Use apenas um H1 por página.', priority: 4 }, 3);
    }
  }

  // ═══ 2) CTA ═══
  const hasActionCTA = snapshot.ctaButtons.some(btn => {
    const lower = btn.toLowerCase();
    return ACTION_VERBS.some(v => lower.includes(v));
  });

  if (snapshot.ctaButtons.length === 0) {
    add({ category: 'CTA', issue: 'CTA principal ausente', impact: 'High', evidence: 'Nenhum botão ou link de ação detectado.', fix: 'Adicione pelo menos um CTA com verbo de ação + benefício.', priority: 1 }, 15);
  } else {
    if (!hasActionCTA) {
      add({ category: 'CTA', issue: 'CTA sem verbo de ação claro', impact: 'Medium', evidence: `CTAs encontrados: ${snapshot.ctaButtons.slice(0, 5).join(', ')}`, fix: 'Use a fórmula [Verbo de Ação] + [O que a pessoa ganha].', priority: 2 }, 8);
    }
    const weakFound = snapshot.ctaButtons.filter(btn => WEAK_CTAS.some(w => btn.toLowerCase().includes(w)));
    if (weakFound.length > 0) {
      add({ category: 'CTA', issue: 'CTA fraco detectado', impact: 'Medium', evidence: `CTAs fracos: ${weakFound.slice(0, 3).join(', ')}`, fix: 'Substitua CTAs genéricos por CTAs que descrevam o benefício.', priority: 2 }, 8);
    }
    if (!snapshot.ctaPositions.includes('bottom') && snapshot.ctaPositions.length > 0) {
      add({ category: 'Conversão', issue: 'CTA ausente no final da página', impact: 'Low', evidence: `CTAs encontrados apenas em: ${snapshot.ctaPositions.join(', ')}`, fix: 'Adicione um CTA de encerramento no final da página.', priority: 4 }, 3);
    }
  }

  // ═══ 3) Clareza ═══
  if (snapshot.avgSentenceLength > 22) {
    add({ category: 'Clareza', issue: 'Sentenças muito longas', impact: 'Medium', evidence: `Média de ${snapshot.avgSentenceLength} palavras por sentença.`, fix: 'Reduza sentenças para no máximo 20 palavras.', priority: 3 }, 8);
  }

  const buzzwordsFound = BUZZWORDS.filter(b => snapshot.plainText.toLowerCase().includes(b.toLowerCase()));
  if (buzzwordsFound.length >= 3) {
    add({ category: 'Clareza', issue: 'Excesso de buzzwords/jargão', impact: 'Low', evidence: `Termos encontrados: ${buzzwordsFound.join(', ')}`, fix: 'Substitua buzzwords por linguagem concreta.', priority: 4 }, 3);
  } else if (buzzwordsFound.length > 0) {
    add({ category: 'Clareza', issue: 'Buzzwords detectados', impact: 'Low', evidence: `Termos: ${buzzwordsFound.join(', ')}`, fix: 'Considere substituir por linguagem mais simples.', priority: 5 }, 3);
  }

  // ═══ 4) Estrutura ═══
  if (snapshot.headingsTotal <= 1 && snapshot.wordCount > 200) {
    add({ category: 'Estrutura', issue: 'Poucos headings para o volume de texto', impact: 'Medium', evidence: `Apenas ${snapshot.headingsTotal} heading(s) para ${snapshot.wordCount} palavras.`, fix: 'Adicione H2/H3 a cada seção.', priority: 3 }, 8);
  }
  if (snapshot.wordCount > 500 && !snapshot.hasLists) {
    add({ category: 'Estrutura', issue: 'Ausência de listas em página longa', impact: 'Medium', evidence: `Página com ${snapshot.wordCount} palavras sem nenhuma lista.`, fix: 'Quebre informações em listas/bullets.', priority: 3 }, 8);
  }
  if (snapshot.longParagraphs > 2) {
    add({ category: 'Estrutura', issue: 'Parágrafos excessivamente longos', impact: 'Low', evidence: `${snapshot.longParagraphs} parágrafos com mais de 60 palavras.`, fix: 'Quebre parágrafos longos em blocos menores.', priority: 4 }, 3);
  }

  // ═══ 5) Conversão ═══
  const socialProof = SOCIAL_PROOF_TERMS.filter(t => snapshot.plainText.toLowerCase().includes(t));
  if (socialProof.length === 0 && snapshot.wordCount > 300) {
    add({ category: 'Conversão', issue: 'Falta de prova social', impact: 'Medium', evidence: 'Nenhum sinal de prova social detectado.', fix: 'Adicione elementos de prova social.', priority: 3 }, 8);
  }

  score = Math.max(0, score);

  return {
    url: snapshot.url,
    path: snapshot.path,
    score,
    issues,
    raw: {
      status: snapshot.status,
      h1: snapshot.h1Text,
      h1_count: snapshot.h1Count,
      h2_count: snapshot.h2Count,
      headings_total: snapshot.headingsTotal,
      word_count: snapshot.wordCount,
      avg_sentence_length: snapshot.avgSentenceLength,
      has_lists: snapshot.hasLists,
      cta_buttons: snapshot.ctaButtons.slice(0, 10),
      paragraphs_count: snapshot.paragraphsCount,
      long_paragraphs: snapshot.longParagraphs,
      buzzwords_found: buzzwordsFound,
      social_proof_signals: socialProof,
      cta_positions: snapshot.ctaPositions,
      penalties,
    },
  };
}
