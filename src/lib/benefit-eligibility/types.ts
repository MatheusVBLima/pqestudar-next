export type TriState = "yes" | "no" | "unknown";

export type StudentStatus =
  | "not_student"
  | "basic_education"
  | "technical"
  | "higher_education"
  | "free_course";

export type EducationNetwork = "public" | "private" | "mixed" | "not_applicable";

export type EmploymentStatus =
  | "unemployed"
  | "formal_worker"
  | "informal_worker"
  | "self_employed"
  | "public_servant"
  | "retired_or_pensioner"
  | "not_working";

export type ProfileCondition =
  | "disability"
  | "pregnant"
  | "guardian_of_minor"
  | "artisan"
  | "artisanal_fisher"
  | "rural_worker";

export interface EligibilityProfile {
  id?: string;
  label?: string;
  ageYears?: number | null;
  ageRecordedAt?: string | null;
  birthDate?: string | null;
  stateCode?: string | null;
  municipalityIbgeCode?: string | null;
  householdMonthlyIncome?: number | null;
  householdSize?: number | null;
  cadunicoStatus?: TriState | null;
  studentStatus?: StudentStatus | null;
  educationNetwork?: EducationNetwork | null;
  employmentStatus?: EmploymentStatus | null;
  conditions?: ProfileCondition[] | null;
}

export type CriterionKey =
  | "age"
  | "state_code"
  | "municipality_ibge_code"
  | "household_monthly_income"
  | "per_capita_income"
  | "household_size"
  | "cadunico_status"
  | "student_status"
  | "education_network"
  | "employment_status"
  | ProfileCondition;

export type CriterionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "includes"
  | "one_of"
  | "is_true";

export type CriterionImportance = "required" | "supporting" | "informational";
export type GroupOperator = "and" | "or";
export type CriterionOutcome = "match" | "mismatch" | "unknown" | "not_applicable";
export type CompatibilityLevel = "high" | "possible" | "needs_information" | "low" | "unstructured";

export interface BenefitEligibilityCriterion {
  id: string;
  benefitId: string;
  ruleKey: string;
  criterionKey: CriterionKey;
  operator: CriterionOperator;
  expectedValue: unknown;
  groupKey: string;
  groupOperator: GroupOperator;
  importance: CriterionImportance;
  matchMessage: string;
  unknownMessage: string;
  mismatchMessage: string;
  sourceUrl: string;
  verifiedAt: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  referencePeriod?: string | null;
  routeKey?: string;
  appliesToRoutes?: string[] | null;
  ruleVersion: number;
  sortOrder?: number;
  isActive: boolean;
}

export interface BenefitEligibilityVerification {
  id: string;
  benefitId: string;
  routeKey: string;
  appliesToRoutes?: string[] | null;
  verificationKey: string;
  groupKey?: string | null;
  groupOperator?: GroupOperator | null;
  message: string;
  sourceUrl: string;
  verifiedAt: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  referencePeriod?: string | null;
  ruleVersion: number;
  sortOrder?: number;
  isActive: boolean;
}

export interface CoverageEvaluation {
  outcome: Exclude<CriterionOutcome, "not_applicable">;
  message: string;
}

export interface CriterionEvaluation {
  criterionId: string;
  criterionKey: CriterionKey;
  groupKey: string;
  importance: CriterionImportance;
  outcome: CriterionOutcome;
  message: string;
  sourceUrl: string;
  verifiedAt: string;
}

export interface ExternalVerificationEvaluation {
  verificationId: string;
  verificationKey: string;
  routeKey: string;
  message: string;
  sourceUrl: string;
  verifiedAt: string;
  outcome: "verification_required" | "indeterminate";
}

export type EligibilityRouteStatus = "matched" | "verification_required" | "needs_information" | "indeterminate" | "rejected";

export interface EligibilityRouteEvaluation {
  routeKey: string;
  status: EligibilityRouteStatus;
  criterionIds: string[];
  verificationIds: string[];
}

export interface BenefitCompatibilityResult {
  level: CompatibilityLevel;
  rank: number;
  matchedCount: number;
  unknownCount: number;
  mismatchedCount: number;
  explanations: CriterionEvaluation[];
  verificationExplanations: ExternalVerificationEvaluation[];
  routeEvaluations: EligibilityRouteEvaluation[];
  canCompleteProfile: boolean;
  coverage?: CoverageEvaluation;
}
