"use client";

import type { CSSProperties } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeratorSidebar } from "@/components/moderator/ModeratorSidebar";

export function ModeratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider style={{ "--sidebar-width-icon": "3.75rem" } as CSSProperties}>
      <div className="min-h-screen w-full bg-muted admin-radius">
        <div className="flex w-full gap-4 py-4 pl-0 pr-4">
          <ModeratorSidebar />
          <div className="min-w-0 flex-1">
            <div className="flex min-h-[calc(100vh-2rem)] flex-col rounded-[var(--admin-radius)] border bg-card shadow-[var(--admin-shadow)]">
              <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
                <div><p className="text-sm font-semibold">Moderador</p><p className="text-xs text-muted-foreground">Guias e Fluxos</p></div>
                <SidebarTrigger className="h-10 w-10 rounded-xl border bg-background shadow-sm" aria-label="Abrir menu do moderador" />
              </div>
              <main className="flex-1 overflow-auto p-6">{children}</main>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
