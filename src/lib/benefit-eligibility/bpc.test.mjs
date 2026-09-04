import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBenefitCompatibility } from "./evaluate.ts";

const mds = "https://www.gov.br/mds/pt-br/acoes-e-programas/suas/beneficios-assistenciais/beneficio-assistencial-ao-idoso-e-a-pessoa-com-deficiencia-bpc";
const common = {
  benefitId: "bpc", groupOperator: "and", sourceUrl: mds,
  verifiedAt: "2026-09-04", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31",
  ruleVersion: 1, isActive: true,
};
const criterion = (value) => ({
  ...common, importance: "required", matchMessage: "Compatível.",
  unknownMessage: "Informação ausente.", mismatchMessage: "Incompatível.", ...value,
});
const criteria = [
  criterion({ id: "cad", ruleKey: "cad", routeKey: "common", criterionKey: "cadunico_status", operator: "equals", expectedValue: "yes", groupKey: "common" }),
  criterion({ id: "income", ruleKey: "income", routeKey: "common", criterionKey: "per_capita_income", operator: "less_than_or_equal", expectedValue: 405.25, groupKey: "common", importance: "supporting" }),
  criterion({ id: "age", ruleKey: "age", routeKey: "elderly", criterionKey: "age", operator: "greater_than_or_equal", expectedValue: 65, groupKey: "elderly" }),
  criterion({ id: "disability", ruleKey: "disability", routeKey: "disability", criterionKey: "disability", operator: "is_true", expectedValue: true, groupKey: "disability" }),
];
const verification = (id, routeKey) => ({
  id, benefitId: "bpc", routeKey, verificationKey: id, message: id,
  sourceUrl: mds, verifiedAt: "2026-09-04", effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31", ruleVersion: 1, isActive: true,
});
const verifications = [
  verification("official-income", "common"),
  verification("cadunico-current", "common"),
  verification("biometric", "common"),
  verification("residence", "common"),
  verification("non-accumulation", "common"),
  verification("biopsychosocial", "disability"),
];
const asOf = new Date("2026-09-04T12:00:00Z");
const evaluate = (profile) => evaluateBenefitCompatibility({ profile, criteria, verifications, asOf });

test("A: age 65+ and compatible estimate follows elderly route without disability verification", () => {
  const result = evaluate({ ageYears: 70, householdMonthlyIncome: 1000, householdSize: 4, cadunicoStatus: "yes", conditions: [] });
  assert.equal(result.level, "possible");
  assert.equal(result.routeEvaluations.find((route) => route.routeKey === "elderly")?.status, "verification_required");
  assert.equal(result.verificationExplanations.some((item) => item.verificationKey === "biopsychosocial"), false);
});

test("B: declared disability opens disability route but requires official assessment", () => {
  const result = evaluate({ ageYears: 40, householdMonthlyIncome: 1000, householdSize: 4, cadunicoStatus: "yes", conditions: ["disability"] });
  assert.equal(result.level, "possible");
  assert.equal(result.routeEvaluations.find((route) => route.routeKey === "disability")?.status, "verification_required");
  assert.equal(result.verificationExplanations.some((item) => item.verificationKey === "biopsychosocial"), true);
});

test("C: absent age and disability information asks for information", () => {
  const result = evaluate({ householdMonthlyIncome: 1000, householdSize: 4, cadunicoStatus: "yes", conditions: null });
  assert.equal(result.level, "needs_information");
  assert.equal(result.canCompleteProfile, true);
});

test("D: under 65 and explicitly no disability is low because every personal route rejects", () => {
  const result = evaluate({ ageYears: 40, householdMonthlyIncome: 1000, householdSize: 4, cadunicoStatus: "yes", conditions: [] });
  assert.equal(result.level, "low");
  assert.deepEqual(result.routeEvaluations.map((route) => route.status).sort(), ["rejected", "rejected"]);
});

test("E: preliminary household estimate above the basic limit cannot reject BPC", () => {
  const result = evaluate({ ageYears: 70, householdMonthlyIncome: 5000, householdSize: 1, cadunicoStatus: "yes", conditions: [] });
  assert.equal(result.level, "possible");
  assert.equal(result.explanations.find((item) => item.criterionId === "income")?.outcome, "mismatch");
});

test("E2: an explicit missing CadUnico requirement rejects all routes", () => {
  const result = evaluate({ ageYears: 70, householdMonthlyIncome: 1000, householdSize: 4, cadunicoStatus: "no", conditions: ["disability"] });
  assert.equal(result.level, "low");
  assert.deepEqual(result.routeEvaluations.map((route) => route.status).sort(), ["rejected", "rejected"]);
});

test("F: rejected elderly route never makes low while disability route remains possible", () => {
  const result = evaluate({ ageYears: 40, householdMonthlyIncome: 1000, householdSize: 4, cadunicoStatus: "yes", conditions: ["disability"] });
  assert.notEqual(result.level, "low");
});

test("G: rejected disability route never makes low while elderly route remains possible", () => {
  const result = evaluate({ ageYears: 70, householdMonthlyIncome: 1000, householdSize: 4, cadunicoStatus: "yes", conditions: [] });
  assert.notEqual(result.level, "low");
});

test("H: biopsychosocial verification belongs only to disability route", () => {
  const elderly = evaluate({ ageYears: 70, cadunicoStatus: "yes", conditions: [] });
  const disability = evaluate({ ageYears: 40, cadunicoStatus: "yes", conditions: ["disability"] });
  assert.equal(elderly.verificationExplanations.some((item) => item.verificationKey === "biopsychosocial"), false);
  assert.equal(disability.verificationExplanations.some((item) => item.verificationKey === "biopsychosocial"), true);
});

test("I: explanations do not leak pending checks from a rejected route", () => {
  const result = evaluate({ ageYears: 70, cadunicoStatus: "yes", conditions: [] });
  assert.equal(result.routeEvaluations.find((route) => route.routeKey === "disability")?.status, "rejected");
  assert.equal(result.explanations.some((item) => item.criterionId === "disability"), false);
  assert.equal(result.verificationExplanations.some((item) => item.verificationKey === "biopsychosocial"), false);
});

test("BPC rules expire instead of silently reusing 2026 values", () => {
  const result = evaluateBenefitCompatibility({
    profile: { ageYears: 70, cadunicoStatus: "yes", conditions: [] },
    criteria, verifications, asOf: new Date("2027-01-01T12:00:00Z"),
  });
  assert.equal(result.level, "unstructured");
});
