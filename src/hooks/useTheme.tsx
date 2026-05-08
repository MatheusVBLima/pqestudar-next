import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "theme";
type Theme = "light" | "dark";

let listeners: Array<() => void> = [];
function emitChange() {
  listeners.forEach((l) => l());
}

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  return (window.localStorage.getItem(STORAGE_KEY) as Theme) || "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Apply on module load to avoid flash
if (typeof window !== "undefined") {
  applyTheme(getSnapshot());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    applyTheme(next);
    emitChange();
  }, []);

  return { theme, isDark: theme === "dark", toggleTheme };
}
