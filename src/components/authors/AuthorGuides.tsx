'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { safeAuthorUrl } from '@/lib/authors';

export type AuthorGuide = { id: string; slug: string; title: string; short_description: string; public_category: string; category: string; cover_image_url: string | null };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function AuthorGuides({ name, guides }: { name: string; guides: AuthorGuide[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const terms = normalize(search).trim().split(/\s+/).filter(Boolean);
    return guides.filter(guide => {
      const text = normalize([guide.title, guide.short_description, guide.public_category || guide.category].join(' '));
      return terms.every(term => text.includes(term));
    });
  }, [guides, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  const offset = (current - 1) * 10;
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(n => n === 1 || n === pages || Math.abs(n - current) <= 1);
  return <section className="min-w-0 lg:col-start-1">
    <h2 className="text-xl font-bold">Guias de {name}</h2>
    <p className="mt-2 text-sm text-muted-foreground">Conhecimento compartilhado para ajudar você a ir mais longe.</p>
    {!!guides.length && <>
      <div className="relative mt-5">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input type="search" aria-label="Pesquisar nos guias do autor" placeholder="Pesquisar nos guias deste autor" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="h-11 rounded-full pl-11" />
      </div>
      <p role="status" className="mt-3 text-xs text-muted-foreground">{filtered.length ? `${offset + 1}–${Math.min(offset + 10, filtered.length)} de ${filtered.length} guias` : 'Nenhum guia encontrado.'}</p>
    </>}
    <div className="mt-5 space-y-4">{filtered.slice(offset, offset + 10).map(g => <Link key={g.id} href={`/guias/${g.slug}`} className="group flex gap-3 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40 sm:gap-4 sm:p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/5 text-primary/50 sm:h-20 sm:w-20">{safeAuthorUrl(g.cover_image_url) ? <img src={safeAuthorUrl(g.cover_image_url)} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : <BookOpen />}</div>
      <div className="min-w-0"><p className="text-xs font-medium text-primary">{g.public_category || g.category}</p><h3 className="mt-1 font-semibold group-hover:text-primary">{g.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.short_description}</p></div>
    </Link>)}</div>
    {!guides.length && <p className="rounded-2xl border border-dashed p-6 text-muted-foreground">Os primeiros guias deste autor aparecerão aqui.</p>}
    {!!guides.length && !filtered.length && <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Tente outro termo ou <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setSearch(''); setPage(1); }}>limpe a busca</button>.</div>}
    {pages > 1 && <nav aria-label="Paginação dos guias do autor" className="mt-6 flex flex-wrap items-center justify-center gap-1">
      <Button type="button" variant="ghost" size="icon" aria-label="Página anterior" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={18} /></Button>
      {numbers.map((number, index) => <Fragment key={number}>
        {index > 0 && number > numbers[index - 1] + 1 && <span className="px-1 text-muted-foreground" aria-hidden="true">…</span>}
        <Button type="button" size="icon" variant={number === current ? 'default' : 'ghost'} aria-label={`Página ${number}`} aria-current={number === current ? 'page' : undefined} onClick={() => setPage(number)}>{number}</Button>
      </Fragment>)}
      <Button type="button" variant="ghost" size="icon" aria-label="Próxima página" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight size={18} /></Button>
    </nav>}
  </section>;
}
