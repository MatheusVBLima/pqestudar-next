export function authorBadgeLevel(code: string) {
  if (code === 'pioneer-20') return { id: 'historic', label: 'Edição histórica' };
  if (code === 'published-50' || code === 'consistent-6') return { id: 'excellence', label: 'Excelência' };
  if (code.startsWith('category-') || code === 'variety-3') return { id: 'mastery', label: 'Domínio' };
  if (code === 'published-10' || code === 'consistent-3') return { id: 'dedication', label: 'Dedicação' };
  return { id: 'first', label: 'Primeiros passos' };
}
