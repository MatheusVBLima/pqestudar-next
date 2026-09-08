/** Editorial illustrations, not official program photography. */
export function premiumArt(title: string, tags: string[] = []) {
  const text = `${title} ${tags.join(' ')}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/transporte|passe livre|mobilidade|viagem/.test(text)) return 'transport';
  if (/cultura|meia.entrada|cinema|teatro|lazer/.test(text)) return 'culture';
  if (/empreend|negocio|mei\b|credito/.test(text)) return 'business';
  if (/trabalh|emprego|carreira/.test(text)) return 'work';
  return 'education';
}
