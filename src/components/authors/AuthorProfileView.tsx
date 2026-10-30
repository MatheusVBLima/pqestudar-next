import { AuthorBadgeDisplay } from './AuthorBadgeDisplay';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, GraduationCap, UserRound } from 'lucide-react';
import { type AuthorBadge, type AuthorProfile, safeAuthorUrl } from '@/lib/authors';

type AuthorGuide = { id: string; slug: string; title: string; short_description: string; public_category: string; category: string; cover_image_url: string | null };

export function AuthorPhoto({ author, large = false }: { author: AuthorProfile; large?: boolean }) {
  const photo = safeAuthorUrl(author.photo_url);
  return <div className={`${large ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-20 w-20'} shrink-0 overflow-hidden rounded-full border-4 border-background bg-primary/10 text-primary shadow-sm grid place-items-center`}>
    {photo ? <img src={photo} alt={author.display_name} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <UserRound className={large ? 'h-12 w-12' : 'h-8 w-8'} aria-hidden="true" />}
  </div>;
}

export function AuthorProfileView({ author, badges, guides }: { author: AuthorProfile; badges: AuthorBadge[]; guides: AuthorGuide[] }) {
  const categories = [...new Set(guides.map(g => g.public_category || g.category).filter(Boolean))];
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <Link href="/guias" className="text-sm text-muted-foreground hover:text-primary">← Explorar guias</Link>
    <section className="mt-6 overflow-hidden rounded-3xl border bg-card">
      <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-background sm:h-32" />
      <div className="px-6 pb-8 sm:px-10">
        <div className="-mt-14 mb-5 relative"><AuthorPhoto author={author} large /></div>
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Autor no PqEstudar</p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">{author.display_name}</h1>
            {author.headline && <p className="mt-3 break-words text-lg text-muted-foreground">{author.headline}</p>}
            <div className="mt-5 flex flex-wrap gap-2">{badges.map(b => <AuthorBadgeDisplay key={b.code} badge={b} />)}</div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3">
            {safeAuthorUrl(author.website_url) && <a href={safeAuthorUrl(author.website_url)} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{author.website_label}<ArrowUpRight size={16} /></a>}
            <div className="flex gap-4 text-sm text-primary">{[['Instagram', author.instagram_url], ['YouTube', author.youtube_url]].map(([label, url]) => safeAuthorUrl(url) && <a key={label} href={safeAuthorUrl(url)} target="_blank" rel="noopener noreferrer" className="hover:underline">{label} ↗</a>)}</div>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-3 border-t pt-5 text-sm text-muted-foreground"><BookOpen size={18} /><span><strong className="text-foreground">{guides.length}</strong> {guides.length === 1 ? 'guia publicado' : 'guias publicados'}</span><span aria-hidden="true">·</span><span><strong className="text-foreground">{badges.length}</strong> {badges.length === 1 ? 'conquista' : 'conquistas'}</span></div>
      </div>
    </section>
    <div className={`mt-10 grid items-start gap-10 ${categories.length ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
      <div className="min-w-0 space-y-10">
        {(author.bio || author.education) && <section><h2 className="text-xl font-bold">Sobre {author.display_name}</h2>{author.bio && <p className="mt-4 whitespace-pre-line break-words leading-relaxed text-muted-foreground">{author.bio}</p>}{author.education && <div className="mt-5 rounded-xl border p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap size={18} />Formação e experiência</h3><p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{author.education}</p></div>}</section>}
        <section><h2 className="text-xl font-bold">Guias de {author.display_name}</h2><p className="mt-2 text-sm text-muted-foreground">Conhecimento compartilhado para ajudar você a ir mais longe.</p>
          <div className="mt-5 space-y-4">{guides.map(g => <Link key={g.id} href={`/guias/${g.slug}`} className="group flex gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/5 text-primary/50">{safeAuthorUrl(g.cover_image_url) ? <img src={safeAuthorUrl(g.cover_image_url)} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : <BookOpen />}</div>
            <div className="min-w-0"><p className="text-xs font-medium text-primary">{g.public_category || g.category}</p><h3 className="mt-1 font-semibold group-hover:text-primary">{g.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.short_description}</p></div>
          </Link>)}{!guides.length && <p className="rounded-2xl border border-dashed p-6 text-muted-foreground">Os primeiros guias deste autor aparecerão aqui.</p>}</div>
        </section>
      </div>
      <aside className="space-y-6">
        {!!categories.length && <section className="rounded-2xl border p-6"><h2 className="font-bold">Temas que compartilha</h2><div className="mt-4 flex flex-wrap gap-2">{categories.map(c => <span key={c} className="rounded-full bg-muted px-3 py-1 text-xs">{c}</span>)}</div></section>}
      </aside>
    </div>
  </main>;
}
