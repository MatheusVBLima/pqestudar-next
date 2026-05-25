import type { CurationContentItem, CurationItemType } from "@/hooks/useCurations";

type CurationPattern = CurationItemType[];

export interface GeneratedCurationSuggestion {
  title: string;
  slug: string;
  description: string;
  pattern: CurationPattern;
  items: Array<{ type: CurationItemType; id: string }>;
}

const STOPWORDS = new Set([
  "para",
  "como",
  "com",
  "por",
  "uma",
  "uns",
  "das",
  "dos",
  "que",
  "sem",
  "mais",
  "seu",
  "sua",
  "seus",
  "suas",
  "voce",
  "voce",
  "estudar",
  "estudos",
  "ferramenta",
  "ferramentas",
  "guia",
  "guias",
  "concurso",
  "concursos",
  "oportunidade",
  "oportunidades",
]);

const PATTERN_CYCLE: CurationPattern[] = [
  ["tool", "contest", "guide"],
  ["tool", "tool", "guide"],
  ["contest", "contest", "guide"],
  ["tool", "tool", "tool"],
  ["guide", "guide", "tool"],
  ["contest", "tool", "guide"],
  ["guide", "guide", "guide"],
  ["contest", "contest", "contest"],
];

const TITLE_LOWERCASE_WORDS = new Set([
  "a",
  "as",
  "ao",
  "aos",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "ou",
  "para",
  "por",
  "sem",
  "sob",
  "sobre",
]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function capitalizeWord(word: string) {
  if (!word) return word;
  return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1).toLocaleLowerCase("pt-BR");
}

function toEditorialTitleCase(text: string) {
  return text
    .split(/(\s+|-)/)
    .map((part, index, parts) => {
      if (/^\s+$/.test(part) || part === "-") return part;

      const previousText = parts.slice(0, index).join("");
      const isFirstWord = !previousText.trim();
      const followsColon = /:\s*$/.test(previousText);
      const normalized = part.toLocaleLowerCase("pt-BR");

      if (!isFirstWord && !followsColon && TITLE_LOWERCASE_WORDS.has(normalized)) {
        return normalized;
      }

      return capitalizeWord(part);
    })
    .join("");
}

function signature(pattern: CurationPattern) {
  return [...pattern].sort().join("-");
}

function tokenize(item: CurationContentItem) {
  return [
    item.title,
    item.description,
    item.category,
    ...(item.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOPWORDS.has(token));
}

function overlapScore(a: CurationContentItem, b: CurationContentItem) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  let score = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) score += 2;
  }
  if (a.category && b.category && a.category === b.category) score += 5;
  for (const tag of a.tags ?? []) {
    if (b.tags?.includes(tag)) score += 4;
  }
  return score;
}

function pickTheme(items: CurationContentItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const labels = [item.category, ...(item.tags ?? []), ...tokenize(item).slice(0, 5)].filter(Boolean);
    for (const label of labels) {
      const normalized = label.trim();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  const [theme] = [...counts.entries()]
    .filter(([label]) => label.length > 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? ["recursos práticos"];

  return toEditorialTitleCase(theme);
}

function buildTitle(items: CurationContentItem[]) {
  const theme = pickTheme(items);
  const hasContest = items.some((item) => item.type === "contest");
  const hasGuide = items.some((item) => item.type === "guide");
  const hasTool = items.some((item) => item.type === "tool");

  if (hasTool && hasContest && hasGuide) return toEditorialTitleCase(`${theme}: ferramentas, guias e oportunidades`);
  if (hasTool && hasGuide) return toEditorialTitleCase(`${theme}: ferramentas e guias para avançar`);
  if (hasContest && hasGuide) return toEditorialTitleCase(`${theme}: oportunidades e caminhos de estudo`);
  if (hasTool) return toEditorialTitleCase(`Ferramentas úteis para ${theme}`);
  if (hasContest) return toEditorialTitleCase(`Oportunidades em destaque para ${theme}`);
  return toEditorialTitleCase(`Guias práticos sobre ${theme}`);
}

function buildDescription(items: CurationContentItem[]) {
  const names = items.map((item) => item.title).join(", ");
  return `Uma seleção enxuta com ${names} para reunir recursos que combinam entre si e facilitar o próximo passo.`;
}

function combinationsByPattern(items: CurationContentItem[], pattern: CurationPattern) {
  const pools = pattern.map((type) => items.filter((item) => item.type === type));
  if (pools.some((pool) => pool.length === 0)) return [];

  const results: CurationContentItem[][] = [];
  for (const first of pools[0]) {
    for (const second of pools[1]) {
      for (const third of pools[2]) {
        const combo = [first, second, third];
        const ids = new Set(combo.map((item) => `${item.type}:${item.id}`));
        if (ids.size === 3) results.push(combo);
      }
    }
  }
  return results;
}

export function generateAutomaticCuration(
  items: CurationContentItem[],
  recentPatterns: string[] = [],
): GeneratedCurationSuggestion | null {
  const usableItems = items.filter((item) => item.id && item.title && item.description);
  const lastSignature = recentPatterns[0];
  const usedSignatures = new Set(recentPatterns.slice(0, 2));
  const orderedPatterns = [
    ...PATTERN_CYCLE.filter((pattern) => signature(pattern) !== lastSignature),
    ...PATTERN_CYCLE,
  ];

  let best: { combo: CurationContentItem[]; pattern: CurationPattern; score: number } | null = null;

  for (const pattern of orderedPatterns) {
    const patternSignature = signature(pattern);
    if (usedSignatures.has(patternSignature) && orderedPatterns.length > 1) continue;

    for (const combo of combinationsByPattern(usableItems, pattern).slice(0, 400)) {
      const score =
        overlapScore(combo[0], combo[1]) +
        overlapScore(combo[0], combo[2]) +
        overlapScore(combo[1], combo[2]);

      if (!best || score > best.score) {
        best = { combo, pattern, score };
      }
    }

    if (best && signature(best.pattern) === patternSignature) break;
  }

  if (!best) return null;

  const title = buildTitle(best.combo);
  return {
    title,
    slug: slugify(title),
    description: buildDescription(best.combo),
    pattern: best.pattern,
    items: best.combo.map((item) => ({ type: item.type, id: item.id })),
  };
}

export function getCurationPatternSignature(items: Array<{ item_type?: string | null; tool_id?: string | null }>) {
  const pattern = items.map((item) => (item.item_type || (item.tool_id ? "tool" : "tool")) as CurationItemType);
  return signature(pattern);
}
