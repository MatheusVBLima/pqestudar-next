"use client";

import type { ElementType, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, BarChart3, Wrench, BookOpen, Search, FileText,
  Crown, Users, Ticket, ChevronDown, Settings2, UserCog,
  Database, ClipboardCheck, Shield, Bot, History, Menu as MenuIcon, Moon, Sun, Sparkles, Share2, Bookmark, LogOut, Home,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useNavConfig } from '@/hooks/useNavConfig';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const insightsItems = [
  { title: 'Ferramentas', href: '/admin/insights/ferramentas', icon: Wrench },
  { title: 'Concursos', href: '/admin/insights/concursos', icon: BookOpen },
  { title: 'Guias', href: '/admin/insights/guias', icon: BookOpen },
  { title: 'Auditorias', href: '/admin/insights/auditorias', icon: Search },
  { title: 'Atividade', href: '/admin/insights/atividade-admin', icon: Shield },
];

const concursosItems = [
  { title: 'Visão geral', href: '/admin/concursos', icon: LayoutDashboard },
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
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { state: sidebarState } = useSidebar();
  const isSidebarCollapsed = sidebarState === 'collapsed';
  const isActive = (href: string) => pathname === href;
  const isInsightsActive = pathname.startsWith('/admin/insights');
  const isPremiumActive = pathname.startsWith('/admin/premium');
  const isConcursosActive = pathname.startsWith('/admin/concursos');
  const { logos } = useNavConfig();
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const groupClass = "px-0 py-0.5";
  const sectionLabelClass = "px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40 group-data-[collapsible=icon]:sr-only";
  const itemClass = (active: boolean) => cn(
    "relative h-9 rounded-lg px-3 text-[13px] font-semibold tracking-normal text-sidebar-foreground/75 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-md",
    "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
    "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-sidebar-foreground/65",
    "group-data-[collapsible=icon]:[&>span]:sr-only",
    active && "border border-primary/25 bg-primary/10 pl-4 text-sidebar-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.07),0_10px_28px_hsl(var(--primary)/0.08)] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-primary group-data-[collapsible=icon]:border-primary/15 group-data-[collapsible=icon]:bg-primary/12 group-data-[collapsible=icon]:pl-2 group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:before:hidden [&>svg]:text-primary"
  );
  const triggerClass = (active: boolean) => cn(
    "relative flex h-9 w-full items-center justify-between rounded-lg px-3 text-[13px] font-semibold tracking-normal transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:px-2",
    "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
    active
      ? "border border-primary/20 bg-primary/10 pl-4 text-sidebar-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.06)] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-primary group-data-[collapsible=icon]:border-primary/15 group-data-[collapsible=icon]:bg-primary/12 group-data-[collapsible=icon]:pl-2 group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:before:hidden"
      : "text-sidebar-foreground/60"
  );
  const expandableSubListClass = "ml-4 mt-1 border-l border-sidebar-border/70 px-2.5 py-1";
  const expandableSubItemClass = (active: boolean) => cn(
    "h-8 rounded-md px-2 text-[12px] font-medium tracking-normal transition-colors",
    active
      ? "border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.06)]"
      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
  );

  const SectionLabel = ({ children }: { children: ReactNode }) => (
    <p className={sectionLabelClass}>{children}</p>
  );

  const SubmenuFlyout = ({
    title,
    items,
  }: {
    title: string;
    items: Array<{ title: string; href: string; icon: ElementType }>;
  }) => (
    <div className="admin-sidebar-flyout" aria-label={title}>
      <p className="admin-sidebar-flyout-title">{title}</p>
      <div className="admin-sidebar-flyout-list">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("admin-sidebar-flyout-item", active && "admin-sidebar-flyout-item-active")}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    router.push('/');
  };

  return (
    <Sidebar className="border-none bg-transparent" collapsible="icon" data-slot="admin-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/70 px-5 py-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2.5 group-data-[collapsible=icon]:py-3">
        <div className="flex items-center justify-between gap-2.5 group-data-[collapsible=icon]:justify-center">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden">
            <img src={isDark ? logos.dark : logos.light} alt="PqEstudar" className="h-[30px] max-h-8 shrink-0" />
            <span className="rounded-full border border-sidebar-border bg-sidebar-accent/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/62">
            Admin
            </span>
          </Link>
          <SidebarTrigger
            className="h-8 w-8 shrink-0 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
            aria-label="Recolher menu"
            title="Recolher menu"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-2.5 group-data-[collapsible=icon]:py-3">
        <SectionLabel>Painel</SectionLabel>
        {/* Overview */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin'}
                  data-hover-label="Visão geral"
                  className={itemClass(pathname === '/admin')}
                >
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Visão geral</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Insights */}
        <SidebarGroup className={groupClass}>
          <Collapsible defaultOpen={isInsightsActive} className="admin-sidebar-submenu">
            <CollapsibleTrigger
              className={triggerClass(isInsightsActive)}
              data-hover-label="Análises"
              onClick={(event) => {
                if (isSidebarCollapsed) event.preventDefault();
              }}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className={cn('h-4 w-4', isInsightsActive ? 'text-primary' : 'text-sidebar-foreground/55')} />
                <span className="group-data-[collapsible=icon]:sr-only">Análises</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[collapsible=icon]:hidden [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <SubmenuFlyout title="Análises" items={insightsItems} />
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

        <SectionLabel>Conteúdo</SectionLabel>
        {/* Curadorias */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin/curadorias')}
                  data-hover-label="Curadorias"
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
                  data-hover-label="Fluxos"
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

        {/* Guias */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/guias'}
                  data-hover-label="Guias"
                  className={itemClass(pathname === '/admin/guias')}
                >
                  <Link href="/admin/guias">
                    <FileText className="h-4 w-4" />
                    <span>Guias</span>
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
                  data-hover-label="Biblioteca"
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
          <Collapsible defaultOpen={isConcursosActive} className="admin-sidebar-submenu">
            <CollapsibleTrigger
              className={triggerClass(isConcursosActive)}
              data-hover-label="Concursos"
              onClick={(event) => {
                if (isSidebarCollapsed) event.preventDefault();
              }}
            >
              <div className="flex items-center gap-2">
                <Database className={cn('h-4 w-4', isConcursosActive ? 'text-primary' : 'text-sidebar-foreground/55')} />
                <span className="group-data-[collapsible=icon]:sr-only">Concursos</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[collapsible=icon]:hidden [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <SubmenuFlyout title="Concursos" items={concursosItems} />
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

        <SectionLabel>Site</SectionLabel>
        {/* Page Settings */}
        <SidebarGroup className={groupClass}>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/pages'}
                  data-hover-label="Configurações"
                  className={itemClass(pathname === '/admin/pages')}
                >
                  <Link href="/admin/pages">
                    <Settings2 className="h-4 w-4" />
                    <span>Configurações</span>
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
                  data-hover-label="Navegação"
                  className={itemClass(pathname === '/admin/menu')}
                >
                  <Link href="/admin/menu">
                    <MenuIcon className="h-4 w-4" />
                    <span>Navegação</span>
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
                  data-hover-label="Páginas Legais"
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
                  data-hover-label="Afiliados"
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

        <SectionLabel>Admin</SectionLabel>
        {/* Controle Admin */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/admin/roles'}
                  data-hover-label="Controle Admin"
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
          <Collapsible defaultOpen={isPremiumActive} className="admin-sidebar-submenu">
            <CollapsibleTrigger
              className={triggerClass(isPremiumActive)}
              data-hover-label="Admin Premium"
              onClick={(event) => {
                if (isSidebarCollapsed) event.preventDefault();
              }}
            >
              <div className="flex items-center gap-2">
                <Crown className={cn('h-4 w-4', isPremiumActive ? 'text-primary' : 'text-sidebar-foreground/55')} />
                <span className="group-data-[collapsible=icon]:sr-only">Admin Premium</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[collapsible=icon]:hidden [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <SubmenuFlyout title="Admin Premium" items={premiumItems} />
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

      <SidebarFooter className="border-t border-sidebar-border/70 p-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2.5 group-data-[collapsible=icon]:py-3">
        <div className="flex items-center justify-start gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2.5">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full p-0 hover:bg-sidebar-accent/80 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                aria-label="Menu da conta"
              >
                <Avatar className="h-8 w-8 ring-1 ring-sidebar-border group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                    alt={getUserDisplayName()}
                  />
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="right"
              sideOffset={8}
              className="w-56 rounded-r-[10px] rounded-l-none border-l-0 bg-popover"
            >
              <div className="flex min-w-0 flex-col gap-1 p-2">
                <p className="truncate text-sm font-medium">{getUserDisplayName()}</p>
                {user?.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/premium')} className="cursor-pointer">
                <Crown className="mr-2 h-4 w-4" />
                Área Premium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/salvos')} className="cursor-pointer">
                <Bookmark className="mr-2 h-4 w-4" />
                Salvos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9 rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
            aria-label="Voltar ao site"
            title="Voltar ao site"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
