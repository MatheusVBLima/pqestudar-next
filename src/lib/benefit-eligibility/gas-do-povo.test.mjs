import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBenefitCompatibility } from "./evaluate.ts";

const benefitId = "a715c384-a5ff-4cf4-8d35-2d47af5da813";
const asOf = new Date("2026-09-05T12:00:00Z");
const base = {
  benefitId, routeKey: "default", appliesToRoutes: null,
  groupOperator: "and", sourceUrl: "https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo/gas-do-povo",
  verifiedAt: "2026-09-05", effectiveFrom: "2026-03-20", effectiveTo: "2026-12-31",
  ruleVersion: 1, isActive: true,
};
const criterion = (id, criterionKey, expectedValue, importance = "required", operator = "equals") => ({
  ...base, id, ruleKey: id, criterionKey, operator, expectedValue,
  groupKey: importance === "required" ? "gas-do-povo-core" : "gas-do-povo-income-estimate",
  importance, matchMessage: `${id}: compatível`, unknownMessage: `${id}: ausente`, mismatchMessage: `${id}: incompatível`,
});
const criteria = [
  criterion("cadunico", "cadunico_status", "yes"),
  criterion("family", "cadunico_family_size", 2, "required", "greater_than_or_equal"),
  criterion("income", "per_capita_income", 810.5, "supporting", "less_than_or_equal"),
];
const verifications = ["official-income", "cadunico-current", "bolsa-context", "cpf", "impediments", "averiguacao", "selection"].map((id, index) => ({
  ...base, id, verificationKey: id, message: `${id}: confirmação externa`, sortOrder: 40 + index * 10,
}));
const evaluate = (profile, date = asOf) => evaluateBenefitCompatibility({ profile, criteria, verifications, asOf: date });
const route = (result) => result.routeEvaluations.find((item) => item.routeKey === "default")?.status;

test("A/G: compatible automatic data remains possible because official checks are external", () => {
  const result = evaluate({ cadunicoStatus: "yes", cadunicoFamilySize: 2, householdMonthlyIncome: 1600, householdSize: 4 });
  assert.equal(result.level, "possible");
  assert.equal(route(result), "verification_required");
  assert.equal(result.explanations.find((item) => item.criterionKey === "per_capita_income")?.outcome, "match");
});

test("B: one-person CadUnico family objectively rejects the represented entry route", () => {
  const result = evaluate({ cadunicoStatus: "yes", cadunicoFamilySize: 1 });
  assert.equal(result.level, "low");
  assert.equal(route(result), "rejected");
});

test("C: missing CadUnico family size requests profile information", () => {
  const result = evaluate({ cadunicoStatus: "yes" });
  assert.equal(result.level, "needs_information");
  assert.equal(result.canCompleteProfile, true);
});

test("D: explicit absence from CadUnico rejects the represented entry route", () => {
  const result = evaluate({ cadunicoStatus: "no", cadunicoFamilySize: 2 });
  assert.equal(result.level, "low");
  assert.equal(route(result), "rejected");
});

test("E: unknown CadUnico status requests profile information", () => {
  assert.equal(evaluate({ cadunicoStatus: "unknown" }).level, "needs_information");
  assert.equal(evaluate({}).level, "needs_information");
});

test("F: high household estimate is supporting and never rejects", () => {
  const result = evaluate({ cadunicoStatus: "yes", cadunicoFamilySize: 3, householdMonthlyIncome: 9000, householdSize: 1 });
  assert.equal(result.level, "possible");
  assert.equal(result.explanations.find((item) => item.criterionKey === "per_capita_income")?.outcome, "mismatch");
});

test("H/I: only cadunicoFamilySize controls the minimum registered-family requirement", () => {
  assert.equal(evaluate({ cadunicoStatus: "yes", cadunicoFamilySize: 2, householdSize: 1 }).level, "possible");
  assert.equal(evaluate({ cadunicoStatus: "yes", cadunicoFamilySize: 1, householdSize: 5 }).level, "low");
});

test("J/K: Bolsa Familia and cadastral facts stay external, not invented profile mismatches", () => {
  const result = evaluate({ cadunicoStatus: "yes", cadunicoFamilySize: 2 });
  assert.equal(result.level, "possible");
  assert.ok(result.verificationExplanations.some((item) => item.verificationKey === "bolsa-context"));
  assert.ok(result.verificationExplanations.some((item) => item.verificationKey === "averiguacao"));
});

test("L: no future VIII/IX criterion or verification is modeled", () => {
  const keys = [...criteria.map((item) => item.ruleKey), ...verifications.map((item) => item.verificationKey)];
  assert.equal(keys.some((key) => /biometr|address|localization/i.test(key)), false);
});

test("M: after audited validity ends the benefit safely becomes unstructured", () => {
  const result = evaluate({ cadunicoStatus: "yes", cadunicoFamilySize: 2 }, new Date("2027-01-01T12:00:00Z"));
  assert.equal(result.level, "unstructured");
});

test("messages preserve triage semantics", () => {
  const allMessages = [
    ...criteria.flatMap((item) => [item.matchMessage, item.unknownMessage, item.mismatchMessage]),
    ...verifications.map((item) => item.message),
  ].join(" ");
  assert.doesNotMatch(allMessages, /você tem direito|você receberá|benefício garantido|você foi aprovado/i);
});
