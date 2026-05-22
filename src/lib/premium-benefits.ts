export const PREMIUM_BENEFIT_TAG = "__benefit";

export function isPremiumBenefit(tags: string[] | null | undefined): boolean {
  return (tags ?? []).includes(PREMIUM_BENEFIT_TAG);
}

export function visiblePremiumTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((tag) => tag !== PREMIUM_BENEFIT_TAG);
}
