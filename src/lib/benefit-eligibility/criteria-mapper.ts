import type { Database } from "@/integrations/supabase/types";
import type { BenefitEligibilityCriterion, BenefitEligibilityVerification, CriterionImportance, CriterionKey, CriterionOperator, GroupOperator } from "./types";

export type EligibilityCriterionRow = Database["public"]["Tables"]["benefit_eligibility_criteria"]["Row"];
export type EligibilityVerificationRow = Database["public"]["Tables"]["benefit_eligibility_verifications"]["Row"];

export function eligibilityCriterionFromRow(row: EligibilityCriterionRow): BenefitEligibilityCriterion {
  return {
    id: row.id,
    benefitId: row.benefit_id,
    ruleKey: row.rule_key,
    criterionKey: row.criterion_key as CriterionKey,
    operator: row.operator as CriterionOperator,
    expectedValue: row.expected_value,
    groupKey: row.group_key,
    groupOperator: row.group_operator as GroupOperator,
    importance: row.importance as CriterionImportance,
    matchMessage: row.match_message,
    unknownMessage: row.unknown_message,
    mismatchMessage: row.mismatch_message,
    sourceUrl: row.source_url,
    verifiedAt: row.verified_at,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    referencePeriod: row.reference_period,
    routeKey: row.route_key,
    appliesToRoutes: row.applies_to_routes,
    ruleVersion: row.rule_version,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export function eligibilityVerificationFromRow(row: EligibilityVerificationRow): BenefitEligibilityVerification {
  return {
    id: row.id,
    benefitId: row.benefit_id,
    routeKey: row.route_key,
    appliesToRoutes: row.applies_to_routes,
    verificationKey: row.verification_key,
    groupKey: row.group_key,
    groupOperator: row.group_operator as GroupOperator | null,
    message: row.message,
    sourceUrl: row.source_url,
    verifiedAt: row.verified_at,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    referencePeriod: row.reference_period,
    ruleVersion: row.rule_version,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}
