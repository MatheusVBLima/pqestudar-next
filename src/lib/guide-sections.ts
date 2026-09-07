export interface GuideSection { title: string; content: string; heading: string | null }

// One parser for the editor, canvas, publishing and editorial checks.
// H1 belongs to the page title; pasted body H1s become H2s. Fences stay intact.
export function normalizeGuideHeadings(markdown: string): string {
  let fence: { char: string; length: number } | null = null;
  return markdown.replace(/\r\n?/g, '\n').split('\n').map(line => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/.test(line)) fence = null;
      return line;
    }
    if (fence) return line;
    const heading = line.match(/^ {0,3}(#{1,6})(?!#)\s*(\S.*)$/);
    return heading ? `${'#'.repeat(Math.max(2, heading[1].length))} ${heading[2]}` : line;
  }).join('\n');
}

export function parseGuideSections(markdown: string): GuideSection[] {
  const sections: GuideSection[] = [];
  let lines: string[] = [];
  let heading: string | null = null;
  let fence: { char: string; length: number } | null = null;
  const flush = () => {
    const content = lines.join('\n').trim();
    if (content) sections.push({ title: heading?.replace(/<[^>]+>/g, '').replace(/\*\*|__/g, '').trim() || 'Introdução', content, heading });
    lines = [];
  };
  for (const line of normalizeGuideHeadings(markdown).split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length && /^ {0,3}(?:`+|~+)\s*$/.test(line)) fence = null;
      lines.push(line);
      continue;
    }
    const match = !fence && (line.match(/^## (.+)$/) || line.match(/^\s*<h2\b[^>]*>(.*?)<\/h2>\s*$/i));
    if (match) { flush(); heading = match[1]; }
    lines.push(line);
  }
  flush();
  return sections;
}

export function replaceGuideSection(markdown: string, index: number, replacement: string): string {
  const sections = parseGuideSections(markdown);
  if (!sections[index]) throw new Error('A seção mudou. Feche e reabra o card antes de editar.');
  const normalized = normalizeGuideHeadings(replacement).trim();
  // Removing a section is a separate action; an empty editor must not silently delete it.
  if (!normalized) throw new Error('A seção está vazia. Use a ação de excluir para remover o card.');
  const old = sections[index];
  const first = parseGuideSections(normalized)[0];
  const content = old.heading && !first?.heading ? `## ${old.heading}\n\n${normalized}` : normalized;
  return [...sections.slice(0, index).map(section => section.content), content, ...sections.slice(index + 1).map(section => section.content)].join('\n\n');
}
