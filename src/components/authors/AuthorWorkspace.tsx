'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, Award, UserRound, ArrowLeft } from 'lucide-react';

const items = [{ href: '/autor', label: 'Visão geral', Icon: LayoutDashboard }, { href: '/autor/guias', label: 'Meus guias', Icon: BookOpen }, { href: '/autor/perfil', label: 'Meu perfil', Icon: UserRound }, { href: '/autor/conquistas', label: 'Conquistas', Icon: Award }];
export function AuthorWorkspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className="min-h-screen bg-muted/30 admin-radius">
    <header className="border-b bg-card px-4 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/autor" className="flex items-center gap-3 font-bold"><img src="/favicon.png" width={32} height={32} alt="PqEstudar" />Painel do autor</Link><Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} />Voltar ao site</Link></div></header>
    <div className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-8 lg:grid-cols-[200px_minmax(0,1fr)]"><nav aria-label="Menu do autor" className="flex gap-2 overflow-x-auto lg:flex-col">{items.map(({href,label,Icon}) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${path === href ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Icon size={18} />{label}</Link>)}</nav><main className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">{children}</main></div>
  </div>;
}
