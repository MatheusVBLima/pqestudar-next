"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminSidebar } from "./AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const router = useRouter();

  const stillLoading = authLoading || rolesLoading;

  useEffect(() => {
    if (stillLoading) return;
    if (!user || !isAdmin) {
      router.replace("/");
    }
  }, [stillLoading, user, isAdmin, router]);

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

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width-icon": "3.75rem",
      } as CSSProperties}
    >
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </SidebarProvider>
  );
}

function AdminLayoutShell({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-muted admin-radius">
      <div className="flex w-full gap-4 py-4 pl-0 pr-4">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          <div className="rounded-[var(--admin-radius)] border bg-card shadow-[var(--admin-shadow)] flex flex-col min-h-[calc(100vh-2rem)]">
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
