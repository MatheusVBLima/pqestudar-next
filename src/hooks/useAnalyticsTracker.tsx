import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json, TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';

const SESSION_KEY = 'pqestudar_session_id';

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface TrackEventParams {
  event_name: string;
  entity_type?: 'tool' | 'concurso';
  entity_id?: string;
  path?: string;
  meta?: Record<string, unknown>;
}

export function useAnalyticsTracker() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();

  const track = useCallback(
    async (params: TrackEventParams) => {
      try {
        // Determine actor type based on auth + role
        const actor_type = rolesLoading
          ? 'unknown'
          : isAdmin
            ? 'admin'
            : 'public';

        const payload: TablesInsert<'analytics_events'> = {
          event_name: params.event_name,
          entity_type: params.entity_type ?? null,
          entity_id: params.entity_id ?? null,
          path: params.path ?? window.location.pathname,
          session_id: getSessionId(),
          user_id: user?.id ?? null,
          meta: (params.meta ?? {}) as Json,
          actor_type,
        };
        await supabase.from('analytics_events').insert(payload);
      } catch {
        // fire-and-forget
      }
    },
    [user?.id, isAdmin, rolesLoading],
  );

  return { track };
}

/**
 * Tracks read heartbeat every `intervalMs` while tab is visible.
 */
export function useConcursoReadTracker(
  concursoId: string | undefined,
  slug: string | undefined,
) {
  const { track } = useAnalyticsTracker();
  const firedDepths = useRef(new Set<number>());

  // heartbeat
  useEffect(() => {
    if (!concursoId) return;

    // detail open
    track({
      event_name: 'concurso_detail_open',
      entity_type: 'concurso',
      entity_id: concursoId,
      meta: { concurso_slug: slug },
    });

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      track({
        event_name: 'concurso_read_heartbeat',
        entity_type: 'concurso',
        entity_id: concursoId,
        meta: { concurso_slug: slug, read_seconds_increment: 15 },
      });
    }, 15_000);

    return () => clearInterval(interval);
  }, [concursoId, slug, track]);

  // scroll depth
  useEffect(() => {
    if (!concursoId) return;
    firedDepths.current.clear();

    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && !firedDepths.current.has(threshold)) {
          firedDepths.current.add(threshold);
          track({
            event_name: 'concurso_scroll_depth',
            entity_type: 'concurso',
            entity_id: concursoId,
            meta: { concurso_slug: slug, scroll_depth: threshold },
          });
        }
      }
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [concursoId, slug, track]);

  const trackEvent = useCallback(
    (eventName: string, extra?: Record<string, unknown>) => {
      if (!concursoId) return;
      track({
        event_name: eventName,
        entity_type: 'concurso',
        entity_id: concursoId,
        meta: { concurso_slug: slug, ...extra },
      });
    },
    [concursoId, slug, track],
  );

  return { trackEvent };
}
