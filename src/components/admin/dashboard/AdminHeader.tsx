"use client";

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const routeTitles: Record<string, string> = {
  '/admin': 'Visão geral',
  '/admin/insights/ferramentas': 'Análises — Ferramentas',
  '/admin/insights/concursos': 'Análises — Concursos',
  '/admin/insights/concursos-leitura': 'Análises — Concursos',
  '/admin/insights/concursos-eventos': 'Análises — Concursos',
  '/admin/insights/guias': 'Análises — Guias',
  '/admin/insights/auditorias': 'Análises — Auditorias',
  '/admin/insights/seo-audit': 'Análises — Auditorias',
  '/admin/insights/copy-audit': 'Análises — Auditorias',
  '/admin/curadorias': 'Curadorias',
  '/admin/fluxo-guias': 'Fluxos',
  '/admin/guias': 'Guias',
  '/admin/fluxo-guias/biblioteca': 'Biblioteca',
  '/admin/premium/usuarios': 'Usuários & Assinaturas',
  '/admin/menu': 'Navegação',
  '/admin/premium/tokens': 'Tokens de Resgate',
  '/admin/premium/importar-beneficios': 'Importar Benefícios',
};

export function AdminHeader() {
  const pathname = usePathname() ?? '';
  const title = routeTitles[pathname] || 'Admin';

  return (
    <header className="h-14 border-b flex items-center gap-3 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />
      <h1 className="text-sm font-semibold truncate">{title}</h1>
    </header>
  );
}
