"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';

const STORAGE_KEY = 'pq:management-mode';

interface ManagementModeContextValue {
  isManagementMode: boolean;
  canManage: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

const ManagementModeContext = createContext<ManagementModeContextValue | undefined>(undefined);

export function ManagementModeProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useUserRoles();
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      setEnabled(window.sessionStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (enabled) window.sessionStorage.setItem(STORAGE_KEY, '1');
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    if (!isAdmin && enabled) setEnabled(false);
  }, [isAdmin, enabled]);

  const enable = useCallback(() => setEnabled(true), []);
  const disable = useCallback(() => setEnabled(false), []);
  const toggle = useCallback(() => setEnabled((v) => !v), []);

  const value = useMemo<ManagementModeContextValue>(
    () => ({
      isManagementMode: Boolean(isAdmin && enabled),
      canManage: Boolean(isAdmin),
      toggle,
      enable,
      disable,
    }),
    [isAdmin, enabled, toggle, enable, disable]
  );

  return <ManagementModeContext.Provider value={value}>{children}</ManagementModeContext.Provider>;
}

export function useManagementMode(): ManagementModeContextValue {
  const ctx = useContext(ManagementModeContext);
  if (!ctx) {
    return { isManagementMode: false, canManage: false, toggle: () => {}, enable: () => {}, disable: () => {} };
  }
  return ctx;
}
