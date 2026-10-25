import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAuthor } from '@/lib/data/authors';
import { AuthorProfileView } from '@/components/authors/AuthorProfileView';
import { JsonLd, absoluteUrl } from '@/lib/seo/jsonld';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getAuthor((await params).slug);
  if (!result) return { title: 'Autor não encontrado | PqEstudar' };
  const { author } = result;
  return { title: `${author.display_name} — Autor | PqEstudar`, description: author.headline || `Conheça ${author.display_name} e seus guias no PqEstudar.`, alternates: { canonical: `/autores/${author.slug}` } };
}
export default async function AuthorPage({ params }: Props) {
  const result = await getAuthor((await params).slug);
  if (!result) notFound();
  return <><JsonLd data={{ '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: result.author.display_name, description: result.author.bio, url: absoluteUrl(`/autores/${result.author.slug}`) } }} /><AuthorProfileView {...result} /></>;
}
