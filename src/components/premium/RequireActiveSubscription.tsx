"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRoles } from "@/hooks/useUserRoles";
import { RouteFallbackPremium } from "@/components/layout/route-fallbacks";

interface RequireActiveSubscriptionProps {
  children: React.ReactNode;
}

export function RequireActiveSubscription({ children }: RequireActiveSubscriptionProps) {
  const { user, loading: authLoading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const router = useRouter();
  const pathname = usePathname();

  const stillLoading = authLoading || subLoading || rolesLoading;

  useEffect(() => {
    if (stillLoading) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname || "/premium")}`);
      return;
    }
    if (!isAdmin && !isActive()) {
      router.replace("/premium/upgrade");
    }
  }, [stillLoading, user, isAdmin, isActive, router, pathname]);

  if (stillLoading) {
    return <RouteFallbackPremium />;
  }

  if (!user) return null;
  if (!isAdmin && !isActive()) return null;

  return <>{children}</>;
}
