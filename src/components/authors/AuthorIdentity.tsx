"use client";
import Link from 'next/link';
import { usePublicAuthors } from '@/hooks/usePublicAuthors';
import { safeAuthorUrl } from '@/lib/authors';

export function AuthorIdentity({ authorId, name, expanded = false }: { authorId?: string | null; name: string; expanded?: boolean }) {
  const { data } = usePublicAuthors();
  const author = data?.find(a => a.id === authorId);
  if (!author) return expanded ? null : <span>{name}</span>;
  const photo = safeAuthorUrl(author.photo_url);
  const identity = <Link href={`/autores/${author.slug}`} className="inline-flex items-center gap-2 rounded hover:underline focus-visible:outline-primary">
    {photo && <img src={photo} alt="" className={`${expanded ? 'h-16 w-16' : 'h-6 w-6'} shrink-0 rounded-full object-cover`} loading="lazy" referrerPolicy="no-referrer" />}
    <span className="font-medium">{author.display_name}</span>
  </Link>;
  if (!expanded) return identity;
  return <section aria-label="Sobre o autor" className="my-10 rounded-2xl border bg-card p-6">
    <p className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">Sobre o autor</p>
    {identity}
    {author.headline && <p className="mt-3 font-medium">{author.headline}</p>}
    {author.bio && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground line-clamp-4">{author.bio}</p>}
    <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-primary">
      <Link href={`/autores/${author.slug}`} className="hover:underline">Perfil e outros guias →</Link>
      {safeAuthorUrl(author.website_url) && <a href={safeAuthorUrl(author.website_url)} target="_blank" rel="noopener noreferrer" className="hover:underline">{author.website_label} ↗</a>}
    </div>
  </section>;
}
