import { ensureAuthorAccess } from '@/lib/author-guard';
import { AuthorWorkspace } from '@/components/authors/AuthorWorkspace';
export const metadata = { title: 'Painel do autor | PqEstudar', robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) { await ensureAuthorAccess(); return <AuthorWorkspace>{children}</AuthorWorkspace>; }
