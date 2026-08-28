"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, FilePenLine, Home, LogIn, LogOut, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavConfig } from "@/hooks/useNavConfig";
import { useTheme } from "@/hooks/useTheme";
import { ThemeSelector } from "@/components/layout/theme-selector";
import { cn } from "@/lib/utils";

const items = [
  { title: "Planejamento editorial", href: "/moderador/guias", icon: BookOpen, exact: true },
  { title: "Gerenciar guias", href: "/moderador/gerenciar-guias", icon: FilePenLine },
  { title: "Fluxos", href: "/moderador/fluxos", icon: Sparkles },
];

export function ModeratorSidebar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { user, signOut, switchGoogleAccount } = useAuth();
  const { logos } = useNavConfig();
  const { isDark } = useTheme();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Moderador";
  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logout realizado com sucesso!");
    router.replace("/");
  };

  const handleSwitchAccount = async () => {
    const { error } = await switchGoogleAccount();
    if (error) toast.error(`Não foi possível mudar de conta: ${error.message}`);
  };

  const itemClass = (active: boolean) => cn(
    "relative grid h-11 grid-cols-[1.25rem_1fr] items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-sidebar-foreground/75 transition-all group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!flex group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:[&>span]:sr-only",
    "hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground [&>svg]:h-4 [&>svg]:w-4 [&>svg]:justify-self-center",
    active && "border border-primary/25 bg-primary/10 text-sidebar-foreground before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-0.5 before:rounded-full before:bg-primary group-data-[collapsible=icon]:before:hidden [&>svg]:text-primary",
  );

  return (
    <Sidebar className="border-none bg-transparent" collapsible="icon" data-slot="moderator-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/70 px-5 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2.5 group-data-[collapsible=icon]:py-3">
        <div className="flex items-center justify-between gap-2.5 group-data-[collapsible=icon]:justify-center">
          <Link href="/moderador/guias" className="flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:hidden">
            <img src={isDark ? logos.dark : logos.light} alt="PqEstudar" className="h-[30px] max-h-8 shrink-0" />
            <span className="shrink-0 rounded-full border border-sidebar-border bg-sidebar-accent/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
              Mod
            </span>
          </Link>
          <SidebarTrigger className="h-8 w-8 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/80" aria-label="Recolher menu" />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 py-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2.5">
        <p className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40 group-data-[collapsible=icon]:sr-only">
          Conteúdo
        </p>
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <SidebarGroup key={item.href} className="px-0 py-0.5">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={active} data-hover-label={item.title} className={itemClass(active)}>
                      <Link href={item.href}><item.icon className="shrink-0" /><span className="truncate">{item.title}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2.5">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
          {user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0 hover:bg-sidebar-accent/80" aria-label="Menu da conta">
                  <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
                    <AvatarImage src={user.user_metadata?.avatar_url || user.user_metadata?.picture} alt={displayName} />
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-56">
                <div className="min-w-0 p-2"><p className="truncate text-sm font-medium">{displayName}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSwitchAccount} className="cursor-pointer"><RotateCcw className="mr-2 h-4 w-4" />Mudar de conta</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => router.push("/login?from=/moderador")} aria-label="Entrar"><LogIn className="h-4 w-4" /></Button>
          )}

          <ThemeSelector className="text-sidebar-foreground/70 hover:bg-sidebar-accent/80" />
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent/80" aria-label="Voltar ao site" title="Voltar ao site">
            <Link href="/"><Home className="h-4 w-4" /></Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
