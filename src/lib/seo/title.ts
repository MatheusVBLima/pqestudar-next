export const BRAND_SUFFIX = " | PqEstudar";

export function withBrand(text: string | null | undefined, fallback: string): string {
  const value = (text || fallback).trim();
  return value.endsWith(BRAND_SUFFIX) ? value : `${value}${BRAND_SUFFIX}`;
}
