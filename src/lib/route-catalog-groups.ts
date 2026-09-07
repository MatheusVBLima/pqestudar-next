import type { CatalogRoute } from "./route-catalog";

// Same section order and route families as AdminSidebar. Unknown families
// still get a group automatically, so newly added routes never disappear.
const adminSections: Array<{ name: string; prefixes: string[] }> = [
  { name: "Painel", prefixes: ["/admin/insights"] },
  { name: "Conteúdo", prefixes: ["/admin/curadorias", "/admin/fluxo-guias", "/admin/guias", "/admin/concursos"] },
  { name: "Produtos", prefixes: ["/admin/certificado-que-conta", "/admin/bonus"] },
  { name: "Marketing", prefixes: ["/admin/emails", "/admin/reengajamento"] },
  { name: "Site", prefixes: ["/admin/rotas", "/admin/pages", "/admin/menu", "/admin/legal", "/admin/influenciadores", "/admin/afiliados"] },
  { name: "Admin", prefixes: ["/admin/roles", "/admin/premium"] },
];
const familyNames: Record<string, string> = {
  insights: "Análises", "fluxo-guias": "Fluxos", pages: "Configurações", menu: "Navegação", legal: "Páginas legais",
  rotas: "Catálogo de páginas", roles: "Controle admin", cursos: "Cursos", beneficios: "Benefícios", atualizacoes: "Atualizações",
  p: "Conteúdos premium", "gerenciar-guias": "Gerenciar guias", "mapa-dos-beneficios": "Mapa dos benefícios",
};
const title = (value: string) => familyNames[value] ?? value.replace(/-/g, " ").replace(/^./, character => character.toLocaleUpperCase("pt-BR"));

export function routeSection(route: CatalogRoute): string {
  if (route.path === "/admin") return "Painel";
  if (route.area === "Admin") {
    const section = adminSections.find(item => item.prefixes.some(prefix => route.path === prefix || route.path.startsWith(prefix + "/")));
    if (section) return section.name;
  }
  const segments = route.path.split("/").filter(Boolean);
  const family = segments[route.area === "Site" ? 0 : 1];
  return family ? title(family) : "Visão geral";
}

export function routeDisplayName(route: CatalogRoute): string {
  if (["/admin", "/premium", "/moderador"].includes(route.path)) return "Visão geral";
  const segments = route.path.split("/").filter(Boolean);
  return familyNames[segments.at(-1) ?? ""] ?? route.name;
}

export function groupCatalogRoutes(routes: CatalogRoute[]) {
  const areas = ["Admin", "Premium", "Moderador", "Site", ...new Set(routes.map(route => route.area))];
  return [...new Set(areas)].map(area => {
    const matching = routes.filter(route => route.area === area);
    const names = [...new Set(matching.map(routeSection))];
    if (area === "Admin") {
      const rank = (name: string) => { const index = adminSections.findIndex(section => section.name === name); return index < 0 ? adminSections.length : index; };
      names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "pt-BR"));
    } else names.sort((a, b) => a === "Visão geral" ? -1 : b === "Visão geral" ? 1 : a.localeCompare(b, "pt-BR"));
    return { area, count: matching.length, sections: names.map(name => ({ name, routes: matching.filter(route => routeSection(route) === name) })) };
  }).filter(group => group.count > 0);
}
