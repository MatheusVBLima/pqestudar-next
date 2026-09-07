import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { collectRoutes } from "../src/lib/route-catalog.ts";

test("discovers routes, ignores internal files, and detects additions and removals", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pq-route-catalog-"));
  const add = relative => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, "export default function Page() {}");
  };
  try {
    ["(site)/page.tsx", "(site)/guides/[slug]/page.tsx", "(admin)/admin/page.tsx",
      "(site)/premium/[...path]/page.tsx", "(site)/optional/[[...path]]/page.tsx",
      "_private/hidden/page.tsx", "api/items/route.ts", "layout.tsx",
      "(site)/@modal/(.)guides/[slug]/page.tsx", "(site)/@slot/page.tsx"].forEach(add);
    const routes = collectRoutes(root);
    assert.deepEqual(routes.map(route => route.path), ["/", "/admin", "/guides/[slug]", "/optional/[[...path]]", "/premium/[...path]"]);
    assert.equal(routes.find(route => route.path === "/admin").area, "Admin");
    assert.equal(routes.find(route => route.path === "/guides/[slug]").dynamic, true);
    add("(site)/new-page/page.tsx");
    assert.ok(collectRoutes(root).some(route => route.path === "/new-page"));
    rmSync(path.join(root, "(site)/new-page/page.tsx"));
    assert.ok(!collectRoutes(root).some(route => route.path === "/new-page"));
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep + "pq-route-catalog-"));
    rmSync(root, { recursive: true, force: true });
  }
});
