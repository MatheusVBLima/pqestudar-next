"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';

export function useHeatmapTracker() {
  const path = usePathname();
  const { consentData } = useCookieConsent();
  const { loading, error, canAccessAdmin, canAccessModerator } = useUserRoles();
  useEffect(() => {
    if (!path || loading || error || canAccessAdmin || canAccessModerator || !consentData.hasConsented || !consentData.preferences.analytics || window.self !== window.top) return;
    if (/^\/(admin|moderador|login|auth|conta|perfil|checkout|resgate)(\/|$)/.test(path)) return;
    const visit = crypto.randomUUID();
    type Point = { x: number; y: number; width: number; height: number };
    const queues = { mobile: [] as Point[], tablet: [] as Point[], desktop: [] as Point[] };
    let count = 0;
    let last = 0;
    const flush = () => {
      for (const device of ['mobile','tablet','desktop'] as const) {
        if (!queues[device].length) continue;
        const points = queues[device].splice(0,20);
        void supabase.rpc('record_page_heatmap', { p_visit: visit, p_path: path, p_device: device, p_clicks: points }).then(() => {});
      }
    };
    const click = (event: MouseEvent) => {
      if (!event.isTrusted || event.detail === 0 || count>=200 || Date.now()-last<150 || !(event.target instanceof Element)) return;
      if (event.target.closest('input,textarea,select,[contenteditable],form,[role="dialog"],[data-heatmap-ignore]')) return;
      const width = document.documentElement.clientWidth;
      const height = Math.max(document.documentElement.scrollHeight, innerHeight);
      if (width<240 || width>8000 || height>200000) return;
      const device = width<768 ? 'mobile' : width<1024 ? 'tablet' : 'desktop';
      queues[device].push({ x: Math.round(Math.max(0,Math.min(1,event.clientX/width))*10000), y: Math.round(Math.max(0,Math.min(1,(event.clientY+scrollY)/height))*10000), width, height });
      last=Date.now(); count++;
      if (queues[device].length>=20 || event.target.closest('a[href]')) flush();
    };
    const hide = () => { if (document.hidden) flush(); };
    document.addEventListener('click', click, true);
    document.addEventListener('visibilitychange',hide);
    const timer = window.setInterval(flush,5000);
    return () => {
      document.removeEventListener('click',click,true);
      document.removeEventListener('visibilitychange',hide);
      clearInterval(timer);
      // Drop unsent points on consent/role changes rather than sending after opt-out.
    };
  },[path,loading,error,canAccessAdmin,canAccessModerator,consentData.hasConsented,consentData.preferences.analytics]);
}
