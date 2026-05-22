"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

const SESSION_KEY = "pqestudar_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "Desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "Mobile";
  return "Desktop";
}

function getReferrerHost(): string {
  if (typeof document === "undefined") return "";
  try {
    const ref = document.referrer;
    if (!ref) return "";
    const url = new URL(ref);
    if (url.hostname === window.location.hostname) return "";
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Tracks page views.
 * - Public routes (non-/admin): registered as actor_type 'public' or 'admin'
 *   so admin's own browsing on the public site is excluded from public metrics.
 * - Admin routes (/admin/*): registered as actor_type 'admin' for admin activity insights.
 * Debounces same path within 10s.
 */
export function usePageViewTracker() {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const lastRef = useRef<{ path: string; time: number }>({ path: "", time: 0 });

  useEffect(() => {
    if (rolesLoading) return;

    const now = Date.now();
    if (lastRef.current.path === pathname && now - lastRef.current.time < 10_000) return;
    lastRef.current = { path: pathname, time: now };

    const isAdminRoute = pathname.startsWith("/admin");
    if (isAdminRoute && !isAdmin) return;

    const actor_type = isAdmin ? "admin" : "public";

    supabase
      .from("page_views")
      .insert({
        path: pathname,
        session_id: getSessionId(),
        user_id: user?.id ?? null,
        actor_type,
        meta: {
          referrer_host: getReferrerHost(),
          device: detectDevice(),
        },
      })
      .then(({ error }) => {
        if (error) {
          console.error("[page_views] Failed to track page view:", error);
        }
      });
  }, [pathname, user?.id, isAdmin, rolesLoading]);
}
