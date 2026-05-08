export function slugifyProductTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function findProductBySlug<T extends { title: string }>(
  products: readonly T[],
  slug: string,
): T | null {
  return products.find((p) => slugifyProductTitle(p.title) === slug) ?? null;
}
