import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";
import { toast } from "sonner";

const TRACK_ENDPOINT = `${PUBLIC_SUPABASE_URL}/functions/v1/track-oportunidade-view`;
const ADMIN_VIEWS_ENDPOINT = `${PUBLIC_SUPABASE_URL}/functions/v1/admin-views`;
const MIN_VIEW_TIME_MS = 6000; // 6 seconds minimum on page

/**
 * Hook to track views for a single oportunidade with deduplication.
 * Uses sessionStorage for client-side dedupe and visibility/time checks.
 */
export function useOportunidadeViewTracker(oportunidadeId: string | undefined, initialViews = 0) {
  const [viewsTotal, setViewsTotal] = useState(initialViews);
  const [hasTracked, setHasTracked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const trackedRef = useRef(false);

  // Update initial views when they change
  useEffect(() => {
    setViewsTotal(initialViews);
  }, [initialViews]);

  const trackView = useCallback(async () => {
    if (!oportunidadeId || trackedRef.current) return;

    // Client-side dedupe check
    const today = new Date().toISOString().split("T")[0];
    const storageKey = `viewed:${oportunidadeId}:${today}`;
    
    if (typeof window !== "undefined" && sessionStorage.getItem(storageKey)) {
      setHasTracked(true);
      return;
    }

    // Viewport width check
    if (typeof window !== "undefined" && window.innerWidth < 320) {
      return;
    }

    trackedRef.current = true;
    setHasTracked(true);

    try {
      const response = await fetch(TRACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidadeId,
          viewportWidth: typeof window !== "undefined" ? window.innerWidth : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof data.total === "number") {
          setViewsTotal(data.total);
        }
        // Mark as viewed in sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.setItem(storageKey, "1");
        }
      }
    } catch {
      // Silent fail - view tracking is non-critical
    }
  }, [oportunidadeId]);

  // Setup visibility and timer tracking
  useEffect(() => {
    if (!oportunidadeId || hasTracked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !timerRef.current && !trackedRef.current) {
        timerRef.current = setTimeout(() => {
          if (document.visibilityState === "visible") {
            trackView();
          }
        }, MIN_VIEW_TIME_MS);
      } else if (document.visibilityState === "hidden" && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    // Start timer if page is already visible
    if (document.visibilityState === "visible") {
      timerRef.current = setTimeout(() => {
        if (document.visibilityState === "visible") {
          trackView();
        }
      }, MIN_VIEW_TIME_MS);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [oportunidadeId, hasTracked, trackView]);

  return { viewsTotal, hasTracked };
}

/**
 * Admin hook for managing views (reset, recount)
 */
export function useOportunidadeViewsAdmin() {
  const [isResetting, setIsResetting] = useState(false);
  const [isRecounting, setIsRecounting] = useState(false);

  const resetViews = useCallback(async (oportunidadeId: string): Promise<boolean> => {
    setIsResetting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Não autenticado");
        return false;
      }

      const response = await fetch(`${ADMIN_VIEWS_ENDPOINT}?action=reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oportunidadeId }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Erro ao zerar contador");
        return false;
      }

      toast.success("Contador zerado com sucesso!");
      return true;
    } catch (_e) {
      toast.error("Erro ao zerar contador");
      return false;
    } finally {
      setIsResetting(false);
    }
  }, []);

  const recountViews = useCallback(async (oportunidadeId: string): Promise<number | null> => {
    setIsRecounting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Não autenticado");
        return null;
      }

      const response = await fetch(`${ADMIN_VIEWS_ENDPOINT}?action=recount`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oportunidadeId }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Erro ao recontar");
        return null;
      }

      toast.success(`Contador recalculado: ${data.views_total} views`);
      return data.views_total;
    } catch (_e) {
      toast.error("Erro ao recontar");
      return null;
    } finally {
      setIsRecounting(false);
    }
  }, []);

  return {
    resetViews,
    recountViews,
    isResetting,
    isRecounting,
  };
}
