import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  order_index: number;
  is_active: boolean;
  is_external: boolean;
  open_in_new_tab: boolean;
  show_icon_desktop: boolean;
  show_icon_tablet: boolean;
  show_icon_mobile: boolean;
}

export interface NavSettings {
  id: string;
  logo_light_url: string;
  logo_dark_url: string;
}

const NAV_CACHE_KEY = "pqe_nav_items_cache";
const NAV_SETTINGS_CACHE_KEY = "pqe_nav_settings_cache";

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Cache writes are optional; ignore storage quota/private mode failures.
  }
}

const FALLBACK_SETTINGS: NavSettings = {
  id: "fallback",
  logo_light_url: "",
  logo_dark_url: "",
};

export function useNavConfig() {
  // Read localStorage only after mount to avoid hydration mismatch (SSR sees null,
  // client first render would see cached array → mismatch). Effect bumps to fresh values.
  const [cachedItems, setCachedItems] = useState<NavItem[] | null>(null);
  const [cachedSettings, setCachedSettings] = useState<NavSettings | null>(null);

  useEffect(() => {
    setCachedItems(readCache<NavItem[]>(NAV_CACHE_KEY));
    setCachedSettings(readCache<NavSettings>(NAV_SETTINGS_CACHE_KEY));
  }, []);

  const itemsQuery = useQuery({
    queryKey: ["nav-items-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_items_public")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data as unknown as NavItem[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const settingsQuery = useQuery({
    queryKey: ["nav-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_settings_public")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as NavSettings) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Persist to localStorage when fresh data arrives
  const dbItems = itemsQuery.data;
  useEffect(() => {
    if (dbItems && dbItems.length > 0) {
      writeCache(NAV_CACHE_KEY, dbItems);
    }
  }, [dbItems]);

  useEffect(() => {
    if (settingsQuery.data) {
      writeCache(NAV_SETTINGS_CACHE_KEY, settingsQuery.data);
    }
  }, [settingsQuery.data]);

  // Priority: DB > cache > empty (never show hardcoded fallback)
  const activeDbItems = dbItems && dbItems.length > 0
    ? dbItems.filter((i) => i.is_active !== false)
    : null;

  const activeCache = cachedItems && cachedItems.length > 0
    ? cachedItems.filter((i) => i.is_active !== false)
    : null;

  const items = activeDbItems ?? activeCache ?? [];

  const isLoading = itemsQuery.isLoading || settingsQuery.isLoading;
  const ready = items.length > 0 || !isLoading;

  const settings = settingsQuery.data ?? cachedSettings ?? FALLBACK_SETTINGS;

  // Next.js converts static image imports to StaticImageData objects; <img>
  // expects a string URL, so use .src for the fallback to avoid "[object Object]" 404s.
  const resolvedLogoLight = settings.logo_light_url || logoLight.src;
  const resolvedLogoDark = settings.logo_dark_url || logoDark.src;

  return {
    items,
    logos: { light: resolvedLogoLight, dark: resolvedLogoDark },
    loading: !ready,
    error: itemsQuery.error || settingsQuery.error,
  };
}
