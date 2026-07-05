export interface ProductSalesPage {
  priceLabel?: string;
  oldPriceLabel?: string;
  ctaLabel?: string;
}

const asText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export function parseProductSalesPage(value: unknown): ProductSalesPage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  return {
    priceLabel: asText(source.priceLabel),
    oldPriceLabel: asText(source.oldPriceLabel),
    ctaLabel: asText(source.ctaLabel),
  };
}
