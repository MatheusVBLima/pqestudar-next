export type PremiumItemSlugResolution =
  | { kind: "canonical"; canonicalSlug: string }
  | { kind: "alias"; canonicalSlug: string }
  | { kind: "not_found" };

export async function resolvePremiumItemSlugFromLookup(
  slug: string,
  findDirect: (slug: string) => Promise<string | null>,
  findAliasTarget: (slug: string) => Promise<string | null>,
): Promise<PremiumItemSlugResolution> {
  const direct = await findDirect(slug);
  if (direct) return { kind: "canonical", canonicalSlug: direct };
  const target = await findAliasTarget(slug);
  return target ? { kind: "alias", canonicalSlug: target } : { kind: "not_found" };
}
