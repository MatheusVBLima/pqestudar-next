import type { DomSnapshot } from './iframe-audit-engine';

interface Finding {
  category: string;
  issue: string;
  impact: string;
  evidence: string;
  fix: string;
  priority: number;
}

export interface SeoAnalysisResult {
  url: string;
  path: string;
  score: number;
  issues: Finding[];
  raw: Record<string, unknown>;
}

const SECRET_PATHS = [
  '/acesso-kit-partida-8h3z',
  '/curadoria-conteudo-ia-k4f9',
  '/acervo-video-prod-b7g1',
  '/metodos-automacao-w2p5',
  '/recursos-alta-performance-z9x0',
];

export function analyzeSeo(snapshot: DomSnapshot): SeoAnalysisResult {
  let score = 100;
  const issues: Finding[] = [];

  const add = (f: Finding, pts: number) => {
    issues.push(f);
    score -= pts;
  };

  if (snapshot.status !== 'ok') {
    add({
      category: 'crawlability',
      issue: `Page failed to load (${snapshot.status})`,
      impact: 'High',
      evidence: `Status: ${snapshot.status}`,
      fix: 'Ensure the page loads correctly.',
      priority: 1,
    }, 50);
  }

  if (snapshot.robotsMeta && /noindex/i.test(snapshot.robotsMeta)) {
    if (!SECRET_PATHS.includes(snapshot.path)) {
      add({
        category: 'indexation',
        issue: 'Page has noindex directive',
        impact: 'High',
        evidence: `robots meta: ${snapshot.robotsMeta}`,
        fix: 'Remove noindex if this page should be indexed.',
        priority: 1,
      }, 40);
    }
  }

  if (!snapshot.title) {
    add({ category: 'on-page', issue: 'Missing title tag', impact: 'High', evidence: 'No <title> found.', fix: 'Add a unique, descriptive title tag under 60 characters.', priority: 1 }, 15);
  } else {
    const len = snapshot.title.length;
    if (len > 60) {
      add({ category: 'on-page', issue: 'Title too long', impact: 'Medium', evidence: `Title length: ${len} chars`, fix: 'Shorten title to under 60 characters.', priority: 3 }, 5);
    } else if (len < 10) {
      add({ category: 'on-page', issue: 'Title too short', impact: 'Medium', evidence: `Title length: ${len} chars`, fix: 'Make title more descriptive (30-60 chars recommended).', priority: 3 }, 5);
    }
  }

  if (!snapshot.metaDescription) {
    add({ category: 'on-page', issue: 'Missing meta description', impact: 'Medium', evidence: 'No meta description found.', fix: 'Add a compelling meta description under 160 characters.', priority: 2 }, 10);
  } else {
    const len = snapshot.metaDescription.length;
    if (len > 160) {
      add({ category: 'on-page', issue: 'Meta description too long', impact: 'Low', evidence: `Length: ${len} chars`, fix: 'Shorten to under 160 characters.', priority: 4 }, 3);
    }
  }

  if (!snapshot.canonical) {
    add({ category: 'indexation', issue: 'Missing canonical tag', impact: 'Medium', evidence: 'No <link rel="canonical"> found.', fix: 'Add a self-referencing canonical tag.', priority: 2 }, 10);
  }

  if (snapshot.h1Count === 0) {
    add({ category: 'on-page', issue: 'Missing H1', impact: 'Medium', evidence: 'No H1 tag found on page.', fix: 'Add exactly one H1 tag with the primary keyword.', priority: 2 }, 10);
  } else if (snapshot.h1Count > 1) {
    add({ category: 'on-page', issue: 'Multiple H1 tags', impact: 'Medium', evidence: `Found ${snapshot.h1Count} H1 tags.`, fix: 'Use exactly one H1 per page.', priority: 3 }, 8);
  }

  if (!snapshot.ogPresent) {
    add({ category: 'on-page', issue: 'Missing Open Graph tags', impact: 'Low', evidence: 'No og:title/og:description/og:image found.', fix: 'Add OG tags for better social sharing.', priority: 4 }, 5);
  }

  if (snapshot.schemaTypes.length === 0) {
    add({ category: 'technical', issue: 'No structured data (JSON-LD)', impact: 'Low', evidence: 'No JSON-LD scripts found.', fix: 'Add relevant schema.org structured data.', priority: 4 }, 5);
  }

  score = Math.max(0, score);
  const health = score >= 85 ? 'good' : score >= 65 ? 'ok' : 'poor';

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
      title: snapshot.title,
      meta_description: snapshot.metaDescription,
      canonical: snapshot.canonical,
      robots_meta: snapshot.robotsMeta,
      og_present: snapshot.ogPresent,
      schema_types: snapshot.schemaTypes,
      health,
    },
  };
}
