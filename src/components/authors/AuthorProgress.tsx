export type AuthorProgressData = { points: number; credited_guides: number; contribution_months: number };

export function AuthorProgress({ progress, privateView = false }: { progress: AuthorProgressData; privateView?: boolean }) {
  const points = Number(progress.points);
  const level = Math.floor(points / 500) + 1;
  const within = points % 500;
  const remaining = Math.ceil((500 - within) / 100);
  const label = level === 1 ? 'Autor iniciante' : level <= 3 ? 'Autor colaborador' : level <= 6 ? 'Autor dedicado' : 'Autor de longa trajetória';
  return <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4" aria-label="Progresso do autor">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Nível {level} · {label}</strong><span className="text-sm font-semibold text-primary">{points.toLocaleString('pt-BR')} pontos</span></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10" role="progressbar" aria-label={`Progresso para o nível ${level + 1}`} aria-valuemin={0} aria-valuemax={500} aria-valuenow={within}><div className="h-full rounded-full bg-primary" style={{ width: `${within / 5}%` }} /></div>
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{within} / 500 pontos para o nível {level + 1}</span><span>{progress.contribution_months} {Number(progress.contribution_months) === 1 ? 'mês de contribuição' : 'meses de contribuição'}</span></div>
    {privateView && <p className="mt-3 text-sm">Próxima meta: publicar {remaining} {remaining === 1 ? 'novo guia' : 'novos guias'} para alcançar o nível {level + 1}.</p>}
    <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">100 pontos por primeira publicação de cada guia. Cada nível exige 500 pontos. Republicações não somam pontos; contribuições já reconhecidas permanecem.</p>
  </section>;
}
