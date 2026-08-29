"use client";

import { useEffect, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeratorSidebar } from "@/components/moderator/ModeratorSidebar";

export function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lockViewport = pathname === "/moderador/fluxos";

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

  return (
    <SidebarProvider style={{ "--sidebar-width-icon": "3.75rem" } as CSSProperties}>
      <div className={lockViewport ? "h-dvh w-full overflow-hidden bg-muted admin-radius" : "min-h-screen w-full bg-muted admin-radius"}>
        <div className={lockViewport ? "flex h-full w-full gap-4 py-4 pl-0 pr-4" : "flex w-full gap-4 py-4 pl-0 pr-4"}>
          <ModeratorSidebar />
          <div className="min-w-0 flex-1">
            <div className={lockViewport ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--admin-radius)] border bg-card shadow-[var(--admin-shadow)]" : "flex min-h-[calc(100vh-2rem)] flex-col rounded-[var(--admin-radius)] border bg-card shadow-[var(--admin-shadow)]"}>
              <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
                <div><p className="text-sm font-semibold">Moderador</p><p className="text-xs text-muted-foreground">Planejamento, guias e fluxos</p></div>
                <SidebarTrigger className="h-10 w-10 rounded-xl border bg-background shadow-sm" aria-label="Abrir menu do moderador" />
              </div>
              <main className={lockViewport ? "min-h-0 flex-1 overflow-hidden p-6" : "flex-1 overflow-auto p-6"}>
                {lockViewport ? children : <div className="mx-auto w-full max-w-[1600px]">{children}</div>}
              </main>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
