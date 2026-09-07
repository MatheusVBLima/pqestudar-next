import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type CatalogRoute = { path: string; name: string; area: string; dynamic: boolean };

export function collectRoutes(appDirectory: string): CatalogRoute[] {
  const paths = new Set<string>();
  function walk(directory: string, segments: string[]) {
    const entries = readdirSync(directory, { withFileTypes: true });
    if (entries.some(entry => entry.isFile() && /^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name))) {
      paths.add("/" + segments.join("/"));
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      // Intercepted pages are alternate views of existing routes, not new URLs.
      if (/^\(\.{1,3}\)/.test(entry.name)) continue;
      const invisible = /^\(.*\)$/.test(entry.name) || entry.name.startsWith("@");
      walk(path.join(directory, entry.name), invisible ? segments : [...segments, entry.name.replace(/%5f/gi, "_")]);
    }
  }
  walk(appDirectory, []);
  return [...paths].sort().map(route => {
    const parts = route.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "Início";
    const label = last.startsWith("[") ? `${parts.at(-2) ?? "Página"} · ${last}` : last;
    return {
      path: route,
      name: label.replace(/-/g, " ").replace(/^./, character => character.toLocaleUpperCase("pt-BR")),
      area: parts[0] === "admin" ? "Admin" : parts[0] === "moderador" ? "Moderador" : parts[0] === "premium" ? "Premium" : "Site",
      dynamic: /\[.+\]/.test(route),
    };
  });
}

// Generated before compilation, so production does not need source files on disk.
export function generateRouteCatalog(root: string) {
  const appDirectory = path.join(root, "src/app");
  if (!existsSync(appDirectory)) return;
  const destination = path.join(root, "src/lib/generated/route-catalog.json");
  const content = JSON.stringify(collectRoutes(appDirectory), null, 2) + "\n";
  if (existsSync(destination) && readFileSync(destination, "utf8") === content) return;
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}
