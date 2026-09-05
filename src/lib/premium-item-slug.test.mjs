import assert from "node:assert/strict";
import test from "node:test";
import { resolvePremiumItemSlugFromLookup } from "./premium-item-slug-resolution.ts";

test("canonical slug resolves directly and never asks for an alias", async () => {
  let aliasCalled = false;
  const result = await resolvePremiumItemSlugFromLookup("current", async () => "current", async () => { aliasCalled = true; return null; });
  assert.deepEqual(result, { kind: "canonical", canonicalSlug: "current" });
  assert.equal(aliasCalled, false);
});

test("valid alias resolves to the item's current canonical slug", async () => {
  const result = await resolvePremiumItemSlugFromLookup("old", async () => null, async () => "current");
  assert.deepEqual(result, { kind: "alias", canonicalSlug: "current" });
});

test("unknown slug remains not found", async () => {
  const result = await resolvePremiumItemSlugFromLookup("missing", async () => null, async () => null);
  assert.deepEqual(result, { kind: "not_found" });
});

test("resolution cannot form alias chains or redirect the canonical URL", async () => {
  const canonical = await resolvePremiumItemSlugFromLookup("current", async value => value === "current" ? "current" : null, async () => "other");
  const alias = await resolvePremiumItemSlugFromLookup("old", async () => null, async () => "current");
  assert.equal(canonical.kind, "canonical");
  assert.deepEqual(alias, { kind: "alias", canonicalSlug: "current" });
});
