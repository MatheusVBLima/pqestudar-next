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
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
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

  const groupClass = "px-0 py-1";
  const itemClass = (active: boolean) => cn(
    "h-9 rounded-[calc(var(--admin-radius)-0.35rem)] px-3 text-[13px] font-semibold tracking-normal text-sidebar-foreground/85 transition-colors",
    "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
    "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-sidebar-foreground/65",
    active && "border border-primary/30 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)] [&>svg]:text-primary"
  );
  const triggerClass = (active: boolean) => cn(
    "flex h-9 w-full items-center justify-between rounded-[calc(var(--admin-radius)-0.35rem)] px-3 text-[13px] font-semibold tracking-normal transition-colors",
    "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
    active ? "text-sidebar-foreground" : "text-sidebar-foreground/58"
  );
  const expandableSubListClass = "ml-4 mt-1 border-sidebar-border/70 px-2.5 py-1";
  const expandableSubItemClass = (active: boolean) => cn(
    "h-8 rounded-[calc(var(--admin-radius)-0.45rem)] px-2 text-[13px] font-medium tracking-normal transition-colors",
    active
      ? "border border-primary/25 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.06)]"
      : "text-sidebar-foreground/68 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
  );

  return (
    <Sidebar className="border-none bg-transparent" collapsible="offcanvas" data-slot="admin-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/70 px-5 py-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <img src={isDark ? logos.dark : logos.light} alt="PqEstudar" className="h-[30px] max-h-8 shrink-0" />
          <span className="rounded-full border border-sidebar-border bg-sidebar-accent/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/62">
            Admin
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-3 py-4">
        {/* Overview */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin'}
                  tooltip="Overview"
                  className={itemClass(pathname === '/admin')}
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
        <SidebarGroup className={groupClass}>
          <Collapsible defaultOpen={isInsightsActive}>
            <CollapsibleTrigger
              className={triggerClass(isInsightsActive)}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className={cn('h-4 w-4', isInsightsActive ? 'text-primary' : 'text-sidebar-foreground/55')} />
                <span>Insights</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="admin-sidebar-collapsible-content">
              <SidebarGroupContent>
                <SidebarMenuSub className={expandableSubListClass}>
                  {insightsItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={active}
                          className={expandableSubItemClass(active)}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn('h-3.5 w-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Curadorias */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin/curadorias')}
                  tooltip="Curadorias"
                  className={itemClass(pathname.startsWith('/admin/curadorias'))}
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

        {/* Fluxos */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/fluxo-guias'}
                  tooltip="Fluxos"
                  className={itemClass(pathname === '/admin/fluxo-guias')}
                >
                  <Link href="/admin/fluxo-guias">
                    <Sparkles className="h-4 w-4" />
                    <span>Fluxos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Biblioteca */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/fluxo-guias/biblioteca'}
                  tooltip="Biblioteca de Conhecimento"
                  className={itemClass(pathname === '/admin/fluxo-guias/biblioteca')}
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
        <SidebarGroup className={groupClass}>
          <Collapsible defaultOpen={isConcursosActive}>
            <CollapsibleTrigger
              className={triggerClass(isConcursosActive)}
            >
              <div className="flex items-center gap-2">
                <Database className={cn('h-4 w-4', isConcursosActive ? 'text-primary' : 'text-sidebar-foreground/55')} />
                <span>Concursos</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="admin-sidebar-collapsible-content">
              <SidebarGroupContent>
                <SidebarMenuSub className={expandableSubListClass}>
                  {concursosItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={active}
                          className={expandableSubItemClass(active)}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn('h-3.5 w-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Page Settings */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/pages'}
                  tooltip="Page Settings"
                  className={itemClass(pathname === '/admin/pages')}
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
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/menu'}
                  tooltip="Menu"
                  className={itemClass(pathname === '/admin/menu')}
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
                  className={itemClass(pathname.startsWith('/admin/legal'))}
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
                  className={itemClass(pathname.startsWith('/admin/afiliados'))}
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
                  className={itemClass(pathname === '/admin/roles')}
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
            <CollapsibleTrigger className={triggerClass(isPremiumActive)}>
              <div className="flex items-center gap-2">
                <Crown className={cn('h-4 w-4', isPremiumActive ? 'text-primary' : 'text-sidebar-foreground/55')} />
                <span>Admin Premium</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="admin-sidebar-collapsible-content">
              <SidebarGroupContent>
                <SidebarMenuSub className={expandableSubListClass}>
                  {premiumItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={active}
                          className={expandableSubItemClass(active)}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn('h-3.5 w-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-9 w-full justify-start gap-2 rounded-[calc(var(--admin-radius)-0.35rem)] px-3 text-[13px] font-semibold text-sidebar-foreground/68 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{isDark ? 'Modo claro' : 'Modo escuro'}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
