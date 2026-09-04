import { compareCompatibility, evaluateBenefitCompatibility } from "./evaluate.ts";
import type { BenefitCompatibilityResult, BenefitEligibilityCriterion, BenefitEligibilityVerification, CoverageEvaluation, EligibilityProfile } from "./types.ts";

export type CompatibilityBenefit = { id: string; title: string; territorialSpecificity?: number };
export type EvaluatedBenefit<T extends CompatibilityBenefit> = T & { compatibility: BenefitCompatibilityResult };

export function filterBenefitCollection<T extends CompatibilityBenefit & { category: string; scope: string }>(input: {
  benefits: T[];
  search: string;
  region: string;
  category: string;
  coveragesFor: (benefit: T) => Array<{ label: string; level: string }>;
}): T[] {
  const query = input.search.trim().toLocaleLowerCase("pt-BR");
  return input.benefits
    .filter((benefit) => input.region === "all" || input.coveragesFor(benefit).some((coverage) => coverage.label === input.region || coverage.level === "national"))
    .filter((benefit) => input.category === "all" || benefit.category === input.category)
    .filter((benefit) => `${benefit.title} ${benefit.category} ${benefit.scope}`.toLocaleLowerCase("pt-BR").includes(query));
}

export function evaluateBenefitCollection<T extends CompatibilityBenefit>(input: {
  benefits: T[];
  profile: EligibilityProfile;
  criteria: BenefitEligibilityCriterion[];
  verifications?: BenefitEligibilityVerification[];
  coverageFor?: (benefit: T) => CoverageEvaluation | undefined;
  asOf?: Date;
}): EvaluatedBenefit<T>[] {
  const criteriaByBenefit = new Map<string, BenefitEligibilityCriterion[]>();
  const verificationsByBenefit = new Map<string, BenefitEligibilityVerification[]>();
  input.criteria.forEach((criterion) => {
    criteriaByBenefit.set(criterion.benefitId, [...(criteriaByBenefit.get(criterion.benefitId) ?? []), criterion]);
  });
  input.verifications?.forEach((verification) => {
    verificationsByBenefit.set(verification.benefitId, [...(verificationsByBenefit.get(verification.benefitId) ?? []), verification]);
  });
  return input.benefits.map((benefit) => ({
    ...benefit,
    compatibility: evaluateBenefitCompatibility({
      profile: input.profile,
      criteria: criteriaByBenefit.get(benefit.id) ?? [],
      verifications: verificationsByBenefit.get(benefit.id) ?? [],
      coverage: input.coverageFor?.(benefit),
      asOf: input.asOf,
    }),
  }));
}

export function sortBenefitsNormally<T extends CompatibilityBenefit>(benefits: T[]): T[] {
  return [...benefits].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

export function sortEvaluatedBenefits<T extends CompatibilityBenefit>(benefits: EvaluatedBenefit<T>[]): EvaluatedBenefit<T>[] {
  return [...benefits].sort((a, b) => compareCompatibility(a.compatibility, b.compatibility)
    || (b.territorialSpecificity ?? 0) - (a.territorialSpecificity ?? 0)
    || a.title.localeCompare(b.title, "pt-BR"));
}
