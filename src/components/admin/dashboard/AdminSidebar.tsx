"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, BarChart3, Wrench, BookOpen, MousePointerClick, Search, FileText,
  Crown, Users, Ticket, ChevronDown, Settings2, UserCog,
  Database, ClipboardCheck, Shield, Bot, History, Menu as MenuIcon, Moon, Sun, Sparkles, Share2,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useNavConfig } from '@/hooks/useNavConfig';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

const insightsItems = [
  { title: 'Ferramentas', href: '/admin/insights/ferramentas', icon: Wrench },
  { title: 'Concursos — Leitura', href: '/admin/insights/concursos-leitura', icon: BookOpen },
  { title: 'Concursos — Eventos', href: '/admin/insights/concursos-eventos', icon: MousePointerClick },
  { title: 'Guias — Leitura', href: '/admin/insights/guias', icon: BookOpen },
  { title: 'SEO Audit', href: '/admin/insights/seo-audit', icon: Search },
  { title: 'Copy Audit', href: '/admin/insights/copy-audit', icon: FileText },
  { title: 'Atividade Admin', href: '/admin/insights/atividade-admin', icon: Shield },
];

const concursosItems = [
  { title: 'Overview', href: '/admin/concursos', icon: LayoutDashboard },
  { title: 'Coleta', href: '/admin/concursos/coleta', icon: Database },
  { title: 'Curadoria', href: '/admin/concursos/curadoria', icon: ClipboardCheck },
  { title: 'Config. de Busca', href: '/admin/concursos/busca', icon: Search },
  { title: 'Anti-Repetição', href: '/admin/concursos/anti-repeticao', icon: Shield },
  { title: 'Orquestração IA', href: '/admin/concursos/orquestracao-ia', icon: Bot },
  { title: 'Histórico', href: '/admin/concursos/historico', icon: History },
];

const premiumItems = [
  { title: 'Usuários & Assinaturas', href: '/admin/premium/usuarios', icon: Users },
  { title: 'Tokens de Resgate', href: '/admin/premium/tokens', icon: Ticket },
  { title: 'Importar Benefícios', href: '/admin/premium/importar-beneficios', icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const isActive = (href: string) => pathname === href;
  const isInsightsActive = pathname.startsWith('/admin/insights');
  const isPremiumActive = pathname.startsWith('/admin/premium');
  const isConcursosActive = pathname.startsWith('/admin/concursos');
  const { logos } = useNavConfig();
  const { isDark, toggleTheme } = useTheme();

  return (
    <Sidebar className="border-none bg-transparent" collapsible="offcanvas" data-slot="admin-sidebar">
      <SidebarHeader className="p-4 border-b">
        <Link href="/admin" className="flex items-center gap-2">
          <img src={isDark ? logos.dark : logos.light} alt="PqEstudar" className="h-7 shrink-0" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admin</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Overview */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin'}
                  tooltip="Overview"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname === '/admin' && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Insights */}
        <SidebarGroup>
          <Collapsible defaultOpen={isInsightsActive}>
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm rounded-[var(--admin-radius)] transition-colors',
                'hover:bg-muted',
                isInsightsActive
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className={cn('h-4 w-4', isInsightsActive && 'text-primary')} />
                <span>Insights</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="mt-1">
                  {insightsItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            'rounded-[var(--admin-radius)] pl-9 text-sm',
                            active
                              ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                              : 'text-muted-foreground font-normal hover:text-foreground'
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn('h-3.5 w-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Curadorias */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin/curadorias')}
                  tooltip="Curadorias"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname.startsWith('/admin/curadorias') && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/curadorias">
                    <BookOpen className="h-4 w-4" />
                    <span>Curadorias</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Fluxo de Guias */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/fluxo-guias'}
                  tooltip="Fluxo de Guias"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname === '/admin/fluxo-guias' && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/fluxo-guias">
                    <Sparkles className="h-4 w-4" />
                    <span>Fluxo de Guias</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/fluxo-guias/biblioteca'}
                  tooltip="Biblioteca de Conhecimento"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium text-xs',
                    pathname === '/admin/fluxo-guias/biblioteca' && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/fluxo-guias/biblioteca">
                    <BookOpen className="h-4 w-4" />
                    <span>Biblioteca</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Concursos */}
        <SidebarGroup>
          <Collapsible defaultOpen={isConcursosActive}>
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm rounded-[var(--admin-radius)] transition-colors',
                'hover:bg-muted',
                isConcursosActive
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Database className={cn('h-4 w-4', isConcursosActive && 'text-primary')} />
                <span>Concursos</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="mt-1">
                  {concursosItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            'rounded-[var(--admin-radius)] pl-9 text-sm',
                            active
                              ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                              : 'text-muted-foreground font-normal hover:text-foreground'
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn('h-3.5 w-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Page Settings */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/pages'}
                  tooltip="Page Settings"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname === '/admin/pages' && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/pages">
                    <Settings2 className="h-4 w-4" />
                    <span>Page Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu (Navbar) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/menu'}
                  tooltip="Menu"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname === '/admin/menu' && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/menu">
                    <MenuIcon className="h-4 w-4" />
                    <span>Menu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Páginas Legais */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin/legal')}
                  tooltip="Páginas Legais"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname.startsWith('/admin/legal') && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/legal">
                    <FileText className="h-4 w-4" />
                    <span>Páginas Legais</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Afiliados */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin/afiliados')}
                  tooltip="Afiliados"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname.startsWith('/admin/afiliados') && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/afiliados">
                    <Share2 className="h-4 w-4" />
                    <span>Afiliados</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Controle Admin */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/roles'}
                  tooltip="Controle Admin"
                  className={cn(
                    'rounded-[var(--admin-radius)] font-medium',
                    pathname === '/admin/roles' && 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  )}
                >
                  <Link href="/admin/roles">
                    <UserCog className="h-4 w-4" />
                    <span>Controle Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Premium */}
        <SidebarGroup>
          <Collapsible defaultOpen={isPremiumActive}>
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm rounded-[var(--admin-radius)] transition-colors',
                'hover:bg-muted',
                isPremiumActive
                  ? 'font-semibold text-foreground'
                  : 'font-medium text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <Crown className={cn('h-4 w-4', isPremiumActive && 'text-primary')} />
                <span>Admin Premium</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="mt-1">
                  {premiumItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className={cn(
                            'rounded-[var(--admin-radius)] pl-9 text-sm',
                            active
                              ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                              : 'text-muted-foreground font-normal hover:text-foreground'
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn('h-3.5 w-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-2 rounded-[var(--admin-radius)] text-muted-foreground hover:text-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{isDark ? 'Modo claro' : 'Modo escuro'}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
