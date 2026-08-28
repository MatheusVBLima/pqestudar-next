import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

let listeners: Array<() => void> = [];
const emitChange = () => listeners.forEach((listener) => listener());

function getPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getSnapshot() {
  const preference = getPreference();
  return `${preference}:${resolveTheme(preference)}`;
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const notify = () => listener();
  window.addEventListener("storage", notify);
  media.addEventListener("change", notify);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
    window.removeEventListener("storage", notify);
    media.removeEventListener("change", notify);
  };
}

function applyTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

if (typeof window !== "undefined") applyTheme(resolveTheme(getPreference()));

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "system:light");
  const [theme, resolvedTheme] = snapshot.split(":") as [ThemePreference, ResolvedTheme];

  useEffect(() => applyTheme(resolvedTheme), [resolvedTheme]);

  const setTheme = useCallback((preference: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, preference);
    applyTheme(resolveTheme(preference));
    emitChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolveTheme(getPreference()) === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, resolvedTheme, isDark: resolvedTheme === "dark", isSystem: theme === "system", setTheme, toggleTheme };
}
