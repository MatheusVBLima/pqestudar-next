import type {
  BenefitCompatibilityResult,
  BenefitEligibilityCriterion,
  BenefitEligibilityVerification,
  CompatibilityLevel,
  CoverageEvaluation,
  CriterionEvaluation,
  CriterionOutcome,
  EligibilityProfile,
  EligibilityRouteEvaluation,
  ProfileCondition,
} from "./types";

const CONDITION_KEYS = new Set([
  "disability",
  "pregnant",
  "guardian_of_minor",
  "artisan",
  "artisanal_fisher",
  "rural_worker",
]);

export function calculateAge(birthDate: string, asOf = new Date()): number | null {
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date > asOf) return null;
  let age = asOf.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday = asOf.getUTCMonth() < date.getUTCMonth()
    || (asOf.getUTCMonth() === date.getUTCMonth() && asOf.getUTCDate() < date.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

export function calculatePerCapitaIncome(profile: EligibilityProfile): number | null {
  const income = profile.householdMonthlyIncome;
  const size = profile.householdSize;
  if (income == null || size == null || income < 0 || size <= 0) return null;
  return income / size;
}

function profileValue(profile: EligibilityProfile, key: BenefitEligibilityCriterion["criterionKey"], asOf: Date): unknown {
  // Reported age belongs to ageRecordedAt and is intentionally not incremented.
  // birthDate remains a legacy fallback for profiles that have no reported age.
  if (key === "age") return profile.ageYears ?? (profile.birthDate ? calculateAge(profile.birthDate, asOf) : null);
  if (key === "per_capita_income") return calculatePerCapitaIncome(profile);
  if (CONDITION_KEYS.has(key)) {
    if (profile.conditions == null) return null;
    return profile.conditions.includes(key as ProfileCondition);
  }
  const fields = {
    state_code: profile.stateCode,
    municipality_ibge_code: profile.municipalityIbgeCode,
    household_monthly_income: profile.householdMonthlyIncome,
    household_size: profile.householdSize,
    cadunico_family_size: profile.cadunicoStatus === "yes" ? profile.cadunicoFamilySize : null,
    cadunico_status: profile.cadunicoStatus,
    student_status: profile.studentStatus,
    education_network: profile.educationNetwork,
    employment_status: profile.employmentStatus,
  };
  return fields[key as keyof typeof fields] ?? null;
}

function compare(actual: unknown, operator: BenefitEligibilityCriterion["operator"], expected: unknown): CriterionOutcome {
  if (actual == null || actual === "unknown") return "unknown";
  if (operator === "is_true") return actual === true ? "match" : "mismatch";
  if (operator === "includes") return Array.isArray(actual) && actual.includes(expected) ? "match" : "mismatch";
  if (operator === "one_of") return Array.isArray(expected) && expected.includes(actual) ? "match" : "mismatch";
  if (operator === "equals") return actual === expected ? "match" : "mismatch";
  if (operator === "not_equals") return actual !== expected ? "match" : "mismatch";
  if (typeof actual !== "number" || typeof expected !== "number") return "unknown";
  if (operator === "greater_than") return actual > expected ? "match" : "mismatch";
  if (operator === "greater_than_or_equal") return actual >= expected ? "match" : "mismatch";
  if (operator === "less_than") return actual < expected ? "match" : "mismatch";
  if (operator === "less_than_or_equal") return actual <= expected ? "match" : "mismatch";
  return "unknown";
}

export function selectApplicableCriteria(criteria: BenefitEligibilityCriterion[], asOf = new Date()): BenefitEligibilityCriterion[] {
  const day = asOf.toISOString().slice(0, 10);
  const applicable = criteria.filter((criterion) => criterion.isActive
    && (!criterion.effectiveFrom || criterion.effectiveFrom <= day)
    && (!criterion.effectiveTo || criterion.effectiveTo >= day));

  const newest = new Map<string, BenefitEligibilityCriterion>();
  applicable.forEach((criterion) => {
    const key = `${criterion.benefitId}:${criterion.routeKey ?? "default"}:${criterion.ruleKey}`;
    const current = newest.get(key);
    if (!current || criterion.ruleVersion > current.ruleVersion) newest.set(key, criterion);
  });
  return [...newest.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function selectApplicableVerifications(verifications: BenefitEligibilityVerification[], asOf = new Date()): BenefitEligibilityVerification[] {
  const day = asOf.toISOString().slice(0, 10);
  const applicable = verifications.filter((verification) => verification.isActive
    && (!verification.effectiveFrom || verification.effectiveFrom <= day)
    && (!verification.effectiveTo || verification.effectiveTo >= day));
  const newest = new Map<string, BenefitEligibilityVerification>();
  applicable.forEach((verification) => {
    const key = `${verification.benefitId}:${verification.routeKey}:${verification.verificationKey}`;
    const current = newest.get(key);
    if (!current || verification.ruleVersion > current.ruleVersion) newest.set(key, verification);
  });
  return [...newest.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function evaluateCriterion(profile: EligibilityProfile, criterion: BenefitEligibilityCriterion, asOf: Date): CriterionEvaluation {
  const outcome = criterion.importance === "informational"
    ? "not_applicable"
    : compare(profileValue(profile, criterion.criterionKey, asOf), criterion.operator, criterion.expectedValue);
  const message = outcome === "match"
    ? criterion.matchMessage
    : outcome === "mismatch"
      ? criterion.mismatchMessage
      : criterion.unknownMessage;
  return {
    criterionId: criterion.id,
    criterionKey: criterion.criterionKey,
    groupKey: criterion.groupKey,
    importance: criterion.importance,
    outcome,
    message,
    sourceUrl: criterion.sourceUrl,
    verifiedAt: criterion.verifiedAt,
  };
}

function groupOutcome(evaluations: CriterionEvaluation[], operator: "and" | "or"): CriterionOutcome {
  const relevant = evaluations.filter((item) => item.outcome !== "not_applicable");
  if (relevant.length === 0) return "not_applicable";
  if (operator === "or") {
    if (relevant.some((item) => item.outcome === "match")) return "match";
    if (relevant.some((item) => item.outcome === "unknown")) return "unknown";
    return "mismatch";
  }
  if (relevant.some((item) => item.outcome === "mismatch")) return "mismatch";
  if (relevant.some((item) => item.outcome === "unknown")) return "unknown";
  return "match";
}

const RANK: Record<CompatibilityLevel, number> = {
  high: 4,
  possible: 3,
  needs_information: 2,
  low: 1,
  unstructured: 0,
};

export function evaluateBenefitCompatibility(input: {
  profile: EligibilityProfile;
  criteria: BenefitEligibilityCriterion[];
  verifications?: BenefitEligibilityVerification[];
  coverage?: CoverageEvaluation;
  asOf?: Date;
}): BenefitCompatibilityResult {
  const asOf = input.asOf ?? new Date();
  const criteria = selectApplicableCriteria(input.criteria, asOf);
  const verifications = selectApplicableVerifications(input.verifications ?? [], asOf);
  if (criteria.length === 0 && verifications.length === 0) {
    return {
      level: "unstructured",
      rank: RANK.unstructured,
      matchedCount: 0,
      unknownCount: 0,
      mismatchedCount: 0,
      explanations: [],
      verificationExplanations: [],
      routeEvaluations: [],
      canCompleteProfile: false,
      coverage: input.coverage,
    };
  }

  const explanations = criteria.map((criterion) => evaluateCriterion(input.profile, criterion, asOf));
  const explicitRouteKeys = new Set([
    ...criteria.filter((criterion) => (criterion.routeKey ?? "default") !== "common").map((criterion) => criterion.routeKey ?? "default"),
    ...verifications.filter((verification) => verification.routeKey !== "common").map((verification) => verification.routeKey),
  ]);
  if (explicitRouteKeys.size === 0) explicitRouteKeys.add("default");

  const appliesToRoute = (routeKey: string, item: { routeKey?: string; appliesToRoutes?: string[] | null }) => {
    const itemRoute = item.routeKey ?? "default";
    return itemRoute === routeKey || (itemRoute === "common" && (!item.appliesToRoutes || item.appliesToRoutes.includes(routeKey)));
  };
  const routeEvaluations: EligibilityRouteEvaluation[] = [...explicitRouteKeys].map((routeKey) => {
    const routeCriteria = criteria.map((criterion, index) => ({ criterion, evaluation: explanations[index] }))
      .filter(({ criterion }) => appliesToRoute(routeKey, criterion));
    const routeVerifications = verifications.filter((verification) => appliesToRoute(routeKey, verification));
    const groupedVerifications = routeVerifications.filter((verification) => verification.groupKey && verification.groupOperator);
    const legacyVerifications = routeVerifications.filter((verification) => !verification.groupKey || !verification.groupOperator);
    type RequirementGroup = {
      operator: "and" | "or";
      evaluations: CriterionEvaluation[];
      verifications: BenefitEligibilityVerification[];
    };
    type RequirementGroupStatus = "matched" | "verification_required" | "needs_information" | "indeterminate" | "rejected";
    const groups = new Map<string, RequirementGroup>();
    routeCriteria.filter(({ criterion }) => criterion.importance === "required").forEach(({ criterion, evaluation }) => {
      const identity = `${criterion.groupKey}:${criterion.groupOperator}`;
      const current = groups.get(identity);
      groups.set(identity, {
        operator: criterion.groupOperator,
        evaluations: [...(current?.evaluations ?? []), evaluation],
        verifications: current?.verifications ?? [],
      });
    });
    groupedVerifications.forEach((verification) => {
      const identity = `${verification.groupKey}:${verification.groupOperator}`;
      const current = groups.get(identity);
      groups.set(identity, {
        operator: verification.groupOperator!,
        evaluations: current?.evaluations ?? [],
        verifications: [...(current?.verifications ?? []), verification],
      });
    });
    const groupEvaluations = [...groups.values()].map((group): RequirementGroup & { status: RequirementGroupStatus } => {
      const automatic = groupOutcome(group.evaluations, group.operator);
      let status: RequirementGroupStatus;
      if (group.operator === "or") {
        if (automatic === "match") status = "matched";
        else if (automatic === "unknown") status = "needs_information";
        else if (group.verifications.length > 0) status = "indeterminate";
        else status = "rejected";
      } else if (automatic === "mismatch") status = "rejected";
      else if (automatic === "unknown") status = "needs_information";
      else if (group.verifications.length > 0) status = "verification_required";
      else status = "matched";
      return { ...group, status };
    });
    let status: EligibilityRouteEvaluation["status"];
    if (input.coverage?.outcome === "mismatch" || groupEvaluations.some((group) => group.status === "rejected")) status = "rejected";
    else if (input.coverage?.outcome === "unknown" || groupEvaluations.some((group) => group.status === "needs_information")) status = "needs_information";
    else if (groupEvaluations.some((group) => group.status === "indeterminate")) status = "indeterminate";
    else if (legacyVerifications.length > 0 || groupEvaluations.some((group) => group.status === "verification_required")) status = "verification_required";
    else status = "matched";
    const blockingVerificationIds = status === "indeterminate"
      ? groupEvaluations.filter((group) => group.status === "indeterminate").flatMap((group) => group.verifications.map((item) => item.id))
      : status === "verification_required"
        ? [
            ...legacyVerifications.map((item) => item.id),
            ...groupEvaluations.filter((group) => group.status === "verification_required").flatMap((group) => group.verifications.map((item) => item.id)),
          ]
        : [];
    return {
      routeKey,
      status,
      criterionIds: routeCriteria.map(({ criterion }) => criterion.id),
      verificationIds: blockingVerificationIds,
    };
  });

  let level: CompatibilityLevel;
  if (routeEvaluations.some((route) => route.status === "matched")) level = "high";
  else if (routeEvaluations.some((route) => route.status === "verification_required")) level = "possible";
  else if (routeEvaluations.some((route) => route.status === "needs_information")) level = "needs_information";
  else if (routeEvaluations.some((route) => route.status === "indeterminate")) level = "possible";
  else level = "low";

  const relevantStatus = level === "high"
    ? "matched"
    : level === "possible"
      ? routeEvaluations.some((route) => route.status === "verification_required") ? "verification_required" : "indeterminate"
      : level === "needs_information"
        ? "needs_information"
        : "rejected";
  const relevantRoutes = routeEvaluations.filter((route) => route.status === relevantStatus);
  const relevantCriterionIds = new Set(relevantRoutes.flatMap((route) => route.criterionIds));
  const relevantVerificationIds = new Set(relevantRoutes.flatMap((route) => route.verificationIds));
  const relevantExplanations = explanations.filter((item) => relevantCriterionIds.has(item.criterionId));
  const relevantVerificationExplanations = verifications
    .filter((item) => relevantVerificationIds.has(item.id))
    .map((verification) => ({
      verificationId: verification.id,
      verificationKey: verification.verificationKey,
      routeKey: verification.routeKey,
      message: verification.message,
      sourceUrl: verification.sourceUrl,
      verifiedAt: verification.verifiedAt,
      outcome: relevantStatus === "indeterminate" ? "indeterminate" as const : "verification_required" as const,
    }));

  return {
    level,
    rank: RANK[level],
    matchedCount: relevantExplanations.filter((item) => item.outcome === "match").length,
    unknownCount: relevantExplanations.filter((item) => item.outcome === "unknown").length,
    mismatchedCount: relevantExplanations.filter((item) => item.outcome === "mismatch").length,
    explanations: relevantExplanations,
    verificationExplanations: relevantVerificationExplanations,
    routeEvaluations,
    canCompleteProfile: level === "needs_information",
    coverage: input.coverage,
  };
}

export function compareCompatibility(a: BenefitCompatibilityResult, b: BenefitCompatibilityResult): number {
  return b.rank - a.rank
    || b.matchedCount - a.matchedCount
    || a.unknownCount - b.unknownCount
    || a.mismatchedCount - b.mismatchedCount;
}
