import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { groupCatalogRoutes, routeSection } from "../src/lib/route-catalog-groups.ts";

test("groups every route once, follows admin sections, and includes new families", () => {
  const catalog = JSON.parse(readFileSync(new URL("../src/lib/generated/route-catalog.json", import.meta.url), "utf8"));
  const newRoute = { path: "/admin/new-family", name: "New family", area: "Admin", dynamic: false };
  const routes = [...catalog, newRoute];
  const groups = groupCatalogRoutes(routes);
  const groupedPaths = groups.flatMap(group => group.sections.flatMap(section => section.routes.map(route => route.path)));
  assert.equal(new Set(groupedPaths).size, routes.length);
  assert.deepEqual(groupedPaths.sort(), routes.map(route => route.path).sort());
  assert.equal(routeSection({ ...newRoute, path: "/admin/insights/guias" }), "Painel");
  assert.equal(routeSection({ ...newRoute, path: "/admin/curadorias/[id]/preview" }), "Conteúdo");
  assert.equal(routeSection({ ...newRoute, path: "/admin/emails" }), "Marketing");
  assert.deepEqual(groups.find(group => group.area === "Admin").sections.slice(0, 7).map(section => section.name), ["Painel", "Conteúdo", "Produtos", "Marketing", "Site", "Admin", "New family"]);
});
