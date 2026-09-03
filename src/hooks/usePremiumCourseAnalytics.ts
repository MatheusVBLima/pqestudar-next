import { useCallback, useEffect, useRef } from "react";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";

export function usePremiumCourseAnalytics(courseId?: string, slug?: string) {
  const { track, analyticsReady } = useAnalyticsTracker();
  const openedRef = useRef<string | null>(null);
  const firedDepths = useRef(new Set<number>());

  useEffect(() => {
    if (!analyticsReady || !courseId || openedRef.current === courseId) return;
    openedRef.current = courseId;
    void track({
      event_name: "premium_course_detail_open",
      entity_type: "premium_item",
      entity_id: courseId,
      meta: { course_slug: slug },
      allowAnonymous: true,
    });
  }, [analyticsReady, courseId, slug, track]);

  useEffect(() => {
    if (!analyticsReady || !courseId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void track({
        event_name: "premium_course_read_heartbeat",
        entity_type: "premium_item",
        entity_id: courseId,
        meta: { course_slug: slug, read_seconds_increment: 15 },
        allowAnonymous: true,
      });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [analyticsReady, courseId, slug, track]);

  useEffect(() => {
    if (!analyticsReady || !courseId) return;
    firedDepths.current.clear();
    const handleScroll = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      if (available <= 0) return;
      const percentage = Math.round((window.scrollY / available) * 100);
      for (const threshold of [25, 50, 75, 100]) {
        if (percentage < threshold || firedDepths.current.has(threshold)) continue;
        firedDepths.current.add(threshold);
        void track({
          event_name: "premium_course_scroll_depth",
          entity_type: "premium_item",
          entity_id: courseId,
          meta: { course_slug: slug, scroll_depth: threshold },
          allowAnonymous: true,
        });
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [analyticsReady, courseId, slug, track]);

  const trackCourseEvent = useCallback((eventName: string, meta?: Record<string, unknown>) => {
    if (!courseId) return;
    void track({
      event_name: eventName,
      entity_type: "premium_item",
      entity_id: courseId,
      meta: { course_slug: slug, ...meta },
      allowAnonymous: true,
    });
  }, [courseId, slug, track]);

  return { trackCourseEvent };
}
