import assert from "node:assert/strict";
import test from "node:test";
import { calculatePerCapitaIncome, evaluateBenefitCompatibility, selectApplicableCriteria } from "./evaluate.ts";

const baseCriterion = {
  id: "criterion",
  benefitId: "benefit",
  ruleKey: "minimum-age",
  criterionKey: "age",
  operator: "greater_than_or_equal",
  expectedValue: 65,
  groupKey: "eligibility-path",
  groupOperator: "or",
  importance: "required",
  matchMessage: "Faixa etária compatível",
  unknownMessage: "Idade não informada",
  mismatchMessage: "Faixa etária não compatível",
  sourceUrl: "https://example.gov.br",
  verifiedAt: "2026-09-03",
  ruleVersion: 1,
  isActive: true,
};

test("calculates per-capita income from source values without persisting it", () => {
  assert.equal(calculatePerCapitaIncome({ householdMonthlyIncome: 2400, householdSize: 4 }), 600);
  assert.equal(calculatePerCapitaIncome({ householdMonthlyIncome: 2400 }), null);
});

test("reads CadUnico family size only when CadUnico is explicitly confirmed", () => {
  const criterion = {
    ...baseCriterion,
    criterionKey: "cadunico_family_size",
    operator: "greater_than_or_equal",
    expectedValue: 2,
    groupOperator: "and",
  };
  assert.equal(evaluateBenefitCompatibility({ profile: { cadunicoStatus: "yes", cadunicoFamilySize: 2 }, criteria: [criterion] }).level, "high");
  assert.equal(evaluateBenefitCompatibility({ profile: { cadunicoStatus: "no", cadunicoFamilySize: 2 }, criteria: [criterion] }).level, "needs_information");
  assert.equal(evaluateBenefitCompatibility({ profile: { cadunicoStatus: "unknown", cadunicoFamilySize: 2 }, criteria: [criterion] }).level, "needs_information");
  assert.equal(evaluateBenefitCompatibility({ profile: { cadunicoStatus: "yes" }, criteria: [criterion] }).level, "needs_information");
});

test("keeps household size as the divisor for existing income estimates", () => {
  assert.equal(calculatePerCapitaIncome({ householdMonthlyIncome: 2400, householdSize: 4, cadunicoFamilySize: 2, cadunicoStatus: "yes" }), 600);
});

test("uses declared age as recorded instead of incrementing it or inventing a birth date", () => {
  const result = evaluateBenefitCompatibility({
    profile: { ageYears: 17, ageRecordedAt: "2024-01-01", birthDate: "1990-01-01" },
    criteria: [{ ...baseCriterion, operator: "equals", expectedValue: 17, groupOperator: "and" }],
    asOf: new Date("2026-09-04T00:00:00Z"),
  });
  assert.equal(result.level, "high");
});

test("returns unstructured when a benefit has no applicable criteria", () => {
  const result = evaluateBenefitCompatibility({ profile: {}, criteria: [] });
  assert.equal(result.level, "unstructured");
});

test("supports an OR group such as elderly or person with disability", () => {
  const disability = {
    ...baseCriterion,
    id: "disability",
    ruleKey: "has-disability",
    criterionKey: "disability",
    operator: "is_true",
    expectedValue: true,
  };
  const result = evaluateBenefitCompatibility({
    profile: { birthDate: "1990-01-01", conditions: ["disability"] },
    criteria: [baseCriterion, disability],
    asOf: new Date("2026-09-03T00:00:00Z"),
  });
  assert.equal(result.level, "high");
  assert.equal(result.matchedCount, 1);
});

test("required missing information is not treated as incompatibility", () => {
  const result = evaluateBenefitCompatibility({ profile: {}, criteria: [baseCriterion] });
  assert.equal(result.level, "needs_information");
  assert.equal(result.unknownCount, 1);
});

test("a required mismatch produces low compatibility", () => {
  const result = evaluateBenefitCompatibility({
    profile: { birthDate: "1990-01-01" },
    criteria: [baseCriterion],
    asOf: new Date("2026-09-03T00:00:00Z"),
  });
  assert.equal(result.level, "low");
});

test("selects only the newest active rule valid on the evaluation date", () => {
  const oldRule = { ...baseCriterion, id: "old", effectiveTo: "2025-12-31", ruleVersion: 1 };
  const currentRule = { ...baseCriterion, id: "current", effectiveFrom: "2026-01-01", ruleVersion: 2 };
  const futureRule = { ...baseCriterion, id: "future", effectiveFrom: "2027-01-01", ruleVersion: 3 };
  const selected = selectApplicableCriteria([oldRule, currentRule, futureRule], new Date("2026-09-03T00:00:00Z"));
  assert.deepEqual(selected.map((item) => item.id), ["current"]);
});

test("keeps minimum and maximum rules for the same criterion independently", () => {
  const minimum = { ...baseCriterion, id: "minimum", ruleKey: "minimum-age", groupKey: "age-range", groupOperator: "and", operator: "greater_than_or_equal", expectedValue: 15 };
  const maximum = { ...baseCriterion, id: "maximum", ruleKey: "maximum-age", groupKey: "age-range", groupOperator: "and", operator: "less_than_or_equal", expectedValue: 29 };
  const result = evaluateBenefitCompatibility({
    profile: { birthDate: "2006-02-10" },
    criteria: [minimum, maximum],
    asOf: new Date("2026-09-03T00:00:00Z"),
  });
  assert.equal(result.level, "high");
  assert.equal(result.matchedCount, 2);
});
