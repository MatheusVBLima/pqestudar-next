import type { ReactNode } from 'react';
import { AuthorBadgeDisplay } from './AuthorBadgeDisplay';
import { AuthorChannels, type AuthorChannel } from './AuthorChannels';
import Link from 'next/link';
import { BookOpen, GraduationCap, UserRound } from 'lucide-react';
import { type AuthorBadge, type AuthorProfile, safeAuthorUrl } from '@/lib/authors';

type AuthorGuide = { id: string; slug: string; title: string; short_description: string; public_category: string; category: string; cover_image_url: string | null };

export function AuthorPhoto({ author, large = false }: { author: AuthorProfile; large?: boolean }) {
  const photo = safeAuthorUrl(author.photo_url);
  return <div className={`${large ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-20 w-20'} shrink-0 overflow-hidden rounded-full border-4 border-background bg-primary/10 text-primary shadow-sm grid place-items-center`}>
    {photo ? <img src={photo} alt={author.display_name} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <UserRound className={large ? 'h-12 w-12' : 'h-8 w-8'} aria-hidden="true" />}
  </div>;
}

export function AuthorProfileView({ author, badges, guides, privateProgress, privateVisits }: { author: AuthorProfile; badges: AuthorBadge[]; guides: AuthorGuide[]; privateProgress?: ReactNode; privateVisits?: ReactNode }) {
  const categories = [...new Set(guides.map(g => g.public_category || g.category).filter(Boolean))];
  const channels: AuthorChannel[] = [
    { platform: 'instagram' as const, label: 'Instagram', url: safeAuthorUrl(author.instagram_url) },
    { platform: 'youtube' as const, label: 'YouTube', url: safeAuthorUrl(author.youtube_url) },
    { platform: 'website' as const, label: author.website_label || 'Site', url: safeAuthorUrl(author.website_url) },
  ].filter(channel => channel.url);
  const hasSidebar = categories.length > 0 || channels.length > 0;
  return <main>
    {privateProgress}
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
    <Link href="/guias" className="text-sm text-muted-foreground hover:text-primary">← Explorar guias</Link>
    <section aria-label="Perfil do autor" className="relative mt-8 border-b pb-8 sm:mt-10 sm:pb-10">
      <div className="absolute right-1 top-0">{privateVisits}</div>
      <div className="grid gap-x-7 gap-y-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="sm:row-span-2"><AuthorPhoto author={author} large /></div>
        <div className="flex min-w-0 flex-col justify-between gap-6 lg:flex-row">
          <div className="min-w-0 max-w-2xl sm:pr-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Autor no PqEstudar</p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight sm:text-4xl">{author.display_name}</h1>
            {author.headline && <p className="mt-3 break-words text-lg text-muted-foreground">{author.headline}</p>}
            <div className="mt-5 flex flex-wrap gap-2">{badges.map(b => <AuthorBadgeDisplay key={b.code} badge={b} />)}</div>
          </div>

        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground sm:col-start-2"><BookOpen size={18} /><span><strong className="text-foreground">{guides.length}</strong> {guides.length === 1 ? 'guia publicado' : 'guias publicados'}</span><span aria-hidden="true">·</span><span><strong className="text-foreground">{badges.length}</strong> {badges.length === 1 ? 'conquista' : 'conquistas'}</span></div>
      </div>
    </section>
    <div className={`mt-10 grid items-start gap-10 ${hasSidebar ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
        {(author.bio || author.education) && <section><h2 className="text-xl font-bold">Sobre {author.display_name}</h2>{author.bio && <p className="mt-4 whitespace-pre-line break-words leading-relaxed text-muted-foreground">{author.bio}</p>}{author.education && <div className="mt-5 border-l-2 border-primary/20 pl-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap size={18} />Formação e experiência</h3><p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{author.education}</p></div>}</section>}
      {hasSidebar && <aside className="min-w-0 space-y-6 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        {!!categories.length && <section className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><h2 className="font-bold">Temas que compartilha</h2><div className="mt-4 flex flex-wrap gap-2">{categories.map(c => <span key={c} className="rounded-full bg-muted px-3 py-1 text-xs">{c}</span>)}</div></section>}
        {!!channels.length && <section aria-label="Canais do autor" className="rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Onde me encontrar</h2>
          <AuthorChannels channels={channels} />
        </section>}
      </aside>}
        <section className="min-w-0 lg:col-start-1"><h2 className="text-xl font-bold">Guias de {author.display_name}</h2><p className="mt-2 text-sm text-muted-foreground">Conhecimento compartilhado para ajudar você a ir mais longe.</p>
          <div className="mt-5 space-y-4">{guides.map(g => <Link key={g.id} href={`/guias/${g.slug}`} className="group flex gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/5 text-primary/50">{safeAuthorUrl(g.cover_image_url) ? <img src={safeAuthorUrl(g.cover_image_url)} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : <BookOpen />}</div>
            <div className="min-w-0"><p className="text-xs font-medium text-primary">{g.public_category || g.category}</p><h3 className="mt-1 font-semibold group-hover:text-primary">{g.title}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.short_description}</p></div>
          </Link>)}{!guides.length && <p className="rounded-2xl border border-dashed p-6 text-muted-foreground">Os primeiros guias deste autor aparecerão aqui.</p>}</div>
        </section>

    </div>
    </div>
  </main>;
}
