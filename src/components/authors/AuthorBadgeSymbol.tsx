const badgeImages: Record<string, string> = {
  'published-1': 'primeiro-guia',
  'published-10': 'autor-em-acao',
  'published-50': 'voz-de-referencia',
  'consistent-3': 'presenca-constante',
  'consistent-6': 'compromisso-conhecimento',
  'variety-3': 'conhecimento-plural',
  'pioneer-20': 'autor-pioneiro',
};

export function AuthorBadgeSymbol({ code, title }: { code: string; title: string }) {
  const image = code.startsWith('category-') ? 'contribuidor-categoria' : badgeImages[code];
  if (!image) return null;
  return <img src={'/images/author-badges/' + image + '.svg'} width={54} height={54} alt={title} className="h-full w-full object-contain" />;
}
