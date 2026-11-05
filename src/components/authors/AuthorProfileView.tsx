import type { ReactNode } from 'react';
import { AuthorBadgeDisplay } from './AuthorBadgeDisplay';
import { AuthorChannels, type AuthorChannel } from './AuthorChannels';
import Link from 'next/link';
import { AuthorBiography } from './AuthorBiography';
import { AuthorGuides, type AuthorGuide } from './AuthorGuides';
import { BookOpen, UserRound } from 'lucide-react';
import { type AuthorBadge, type AuthorProfile, safeAuthorUrl } from '@/lib/authors';



export function AuthorPhoto({ author, large = false }: { author: AuthorProfile; large?: boolean }) {
  const photo = safeAuthorUrl(author.photo_url);
  return <div className={`${large ? 'h-16 w-16 sm:h-24 sm:w-24' : 'h-20 w-20'} shrink-0 overflow-hidden rounded-full border-4 border-background bg-primary/10 text-primary shadow-sm grid place-items-center`}>
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
    <div className="border-b border-primary/10 bg-primary/[0.04] dark:bg-primary/[0.06]">
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-4">
    <Link href="/guias" className="text-sm text-muted-foreground hover:text-primary">← Explorar guias</Link>
    <section aria-label="Perfil do autor" className="relative mt-5 sm:mt-4">
      <div className="absolute right-1 -top-10 sm:top-0">{privateVisits}</div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:items-start sm:gap-x-5 sm:gap-y-2">
        <div className="sm:row-span-4"><AuthorPhoto author={author} large /></div>
        <div className="min-w-0 sm:pr-20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary sm:text-xs">Autor no PqEstudar</p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">{author.display_name}</h1>
        </div>
        {author.headline && <p className="col-span-2 max-w-2xl break-words text-base leading-relaxed text-muted-foreground sm:col-span-1 sm:col-start-2 sm:text-base">{author.headline}</p>}
        {!!badges.length && <div className="col-span-2 flex flex-wrap gap-1 sm:col-span-1 sm:col-start-2 sm:gap-2">{badges.map(b => <AuthorBadgeDisplay key={b.code} badge={b} />)}</div>}
        <div className="col-span-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:col-span-1 sm:col-start-2 sm:gap-3 sm:text-sm"><BookOpen size={18} /><span><strong className="text-foreground">{guides.length}</strong> {guides.length === 1 ? 'guia publicado' : 'guias publicados'}</span><span aria-hidden="true">·</span><span><strong className="text-foreground">{badges.length}</strong> {badges.length === 1 ? 'conquista' : 'conquistas'}</span></div>
      </div>
    </section>
    </div>
    </div>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
    <div className={`grid items-start gap-6 lg:gap-10 ${hasSidebar ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
      {hasSidebar && <aside className="min-w-0 space-y-3 lg:space-y-6 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        {!!categories.length && <section className="lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><h2 className="font-bold">Temas que compartilha</h2><div className="mt-3 flex flex-wrap gap-2">{categories.map(c => <span key={c} className="rounded-full bg-muted px-3 py-1 text-xs">{c}</span>)}</div></section>}
        {!!channels.length && <section aria-label="Canais do autor" className="flex items-center justify-between gap-3 border-b pb-3 lg:block lg:rounded-2xl lg:border lg:bg-card lg:p-5">
          <h2 className="font-bold">Onde me encontrar</h2>
          <AuthorChannels channels={channels} />
        </section>}
      </aside>}
      {(author.bio || author.education) && <AuthorBiography name={author.display_name} bio={author.bio} education={author.education} />}
        <AuthorGuides key={author.id} name={author.display_name} guides={guides} />

    </div>
    </div>
  </main>;
}
