"use client";

import { useCallback, useEffect, useState } from 'react';

export type PremiumLastViewedType = 'course' | 'job' | 'update' | 'curation';

export interface PremiumLastViewed {
  type: PremiumLastViewedType;
  id: string;
  title: string;
  slug?: string;
  externalUrl?: string;
  href?: string;
  tag?: string;
  viewedAt: string;
}

const STORAGE_KEY = 'pq_premium_last_viewed';

function read(): PremiumLastViewed | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PremiumLastViewed;
  } catch {
    return null;
  }
}

export function usePremiumLastViewed() {
  const [lastViewed, setLastViewed] = useState<PremiumLastViewed | null>(null);

  useEffect(() => {
    setLastViewed(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLastViewed(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const recordView = useCallback((item: Omit<PremiumLastViewed, 'viewedAt'>) => {
    const payload: PremiumLastViewed = { ...item, viewedAt: new Date().toISOString() };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastViewed(payload);
    } catch {
      // ignore
    }
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setLastViewed(null);
  }, []);

  return { lastViewed, recordView, clear };
}
