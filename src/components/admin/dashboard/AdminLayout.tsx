"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "./AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isDeveloper, loading: rolesLoading } = useUserRoles();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const stillLoading = authLoading || rolesLoading;
  const isDeveloperAllowedRoute = pathname === "/admin/certificado-que-conta";
  const canAccessCurrentRoute = isAdmin || (isDeveloper && isDeveloperAllowedRoute);
  const lockViewport = pathname === "/admin/fluxo-guias";

  useEffect(() => {
    if (!lockViewport) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [lockViewport]);

  useEffect(() => {
    if (stillLoading) return;
    if (!user || !canAccessCurrentRoute) {
      router.replace("/");
    }
  }, [stillLoading, user, canAccessCurrentRoute, router]);

  if (stillLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 p-8">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !canAccessCurrentRoute) {
    return null;
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width-icon": "3.75rem",
      } as CSSProperties}
    >
      <AdminLayoutShell lockViewport={lockViewport}>{children}</AdminLayoutShell>
    </SidebarProvider>
  );
}

function AdminLayoutShell({ children, lockViewport = false }: AdminLayoutProps & { lockViewport?: boolean }) {
  return (
    <div className={lockViewport ? "h-dvh w-full overflow-hidden bg-muted admin-radius" : "min-h-screen w-full bg-muted admin-radius"}>
      <div className={lockViewport ? "flex h-full w-full gap-4 py-4 pl-0 pr-4" : "flex w-full gap-4 py-4 pl-0 pr-4"}>
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className={lockViewport ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--admin-radius)] border bg-card shadow-[var(--admin-shadow)]" : "flex min-h-[calc(100vh-2rem)] flex-col rounded-[var(--admin-radius)] border bg-card shadow-[var(--admin-shadow)]"}>
            <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
              <div>
                <p className="text-sm font-semibold">Admin</p>
                <p className="text-xs text-muted-foreground">Menu de navegação</p>
              </div>
              <SidebarTrigger
                className="h-10 w-10 rounded-xl border bg-background text-foreground shadow-sm"
                aria-label="Abrir menu admin"
                title="Abrir menu admin"
              />
            </div>
            <main className={lockViewport ? "min-h-0 flex-1 overflow-hidden p-6" : "flex-1 overflow-auto p-6"}>
              {lockViewport ? children : <div className="mx-auto w-full max-w-[1600px]">{children}</div>}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
