import AuthorProfileEditor from '@/components/authors/AuthorProfileEditor';
export default async function Page({ searchParams }: { searchParams: Promise<{ editar?: string | string[] }> }) {
  const { editar } = await searchParams;
  const authorId = typeof editar === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editar) ? editar : null;
  return <AuthorProfileEditor key={authorId || 'directory'} admin initialAuthorId={authorId} />;
}
