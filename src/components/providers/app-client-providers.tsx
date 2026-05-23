"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ManagementModeProvider } from "@/hooks/useManagementMode";
import { PageViewTracker } from "@/components/providers/page-view-tracker";
import { CookieConsentRuntime } from "@/components/providers/cookie-consent-runtime";

export function AppClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ManagementModeProvider>
          <TooltipProvider>
            <PageViewTracker />
            <CookieConsentRuntime />
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </ManagementModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
