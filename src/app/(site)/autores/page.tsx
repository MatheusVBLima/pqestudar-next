import Link from 'next/link';
import type { Metadata } from 'next';
import { getAuthors } from '@/lib/data/authors';
import { AuthorPhoto } from '@/components/authors/AuthorProfileView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Autores | PqEstudar', description: 'Conheça as pessoas que compartilham conhecimento e oportunidades nos guias do PqEstudar.', alternates: { canonical: '/autores' } };
export default async function AuthorsPage() {
  const authors = await getAuthors();
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <Link href="/guias" className="text-sm text-muted-foreground hover:text-primary">← Explorar guias</Link>
    <header className="my-10 max-w-2xl"><p className="text-sm font-semibold text-primary">Quem compartilha conhecimento</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Conheça nossos autores</h1><p className="mt-4 text-lg text-muted-foreground">Pessoas, experiências e ideias que ajudam você a descobrir novas oportunidades.</p></header>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{authors.map(author => <Link key={author.id} href={`/autores/${author.slug}`} className="group rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"><AuthorPhoto author={author} /><h2 className="mt-5 text-xl font-bold group-hover:text-primary">{author.display_name}</h2>{author.headline && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{author.headline}</p>}<p className="mt-5 text-sm font-semibold text-primary">Conhecer autor e seus guias →</p></Link>)}</div>
    {!authors.length && <p className="rounded-xl border border-dashed p-8 text-muted-foreground">Nossos autores estarão aqui em breve.</p>}
    <p className="mt-10 text-sm text-muted-foreground">Já escreve no PqEstudar? <Link href="/autores/meu-perfil" className="font-medium text-primary hover:underline">Edite seu perfil de autor</Link></p>
  </main>;
}
