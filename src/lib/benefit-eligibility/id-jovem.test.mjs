import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBenefitCompatibility } from "./evaluate.ts";

const sourceUrl = "https://www.gov.br/pt-br/servicos/obter-a-carteira-de-identidade-jovem";
const common = {
  benefitId: "id-jovem", routeKey: "default", groupKey: "id-jovem-requirements",
  groupOperator: "and", importance: "required", sourceUrl, verifiedAt: "2026-09-04",
  effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31", ruleVersion: 1, isActive: true,
};
const criteria = [
  { ...common, id: "age-min", ruleKey: "age-min", criterionKey: "age", operator: "greater_than_or_equal", expectedValue: 15, matchMessage: "Idade compatível.", unknownMessage: "Idade não informada.", mismatchMessage: "Idade incompatível." },
  { ...common, id: "age-max", ruleKey: "age-max", criterionKey: "age", operator: "less_than_or_equal", expectedValue: 29, matchMessage: "Idade compatível.", unknownMessage: "Idade não informada.", mismatchMessage: "Idade incompatível." },
  { ...common, id: "income", ruleKey: "income", criterionKey: "household_monthly_income", operator: "less_than_or_equal", expectedValue: 3242, matchMessage: "Renda compatível.", unknownMessage: "Renda não informada.", mismatchMessage: "Renda incompatível." },
  { ...common, id: "cadunico", ruleKey: "cadunico", criterionKey: "cadunico_status", operator: "equals", expectedValue: "yes", matchMessage: "Cadastro compatível.", unknownMessage: "Cadastro não informado.", mismatchMessage: "Cadastro incompatível." },
];
const verifications = [{
  id: "updated", benefitId: "id-jovem", routeKey: "default",
  verificationKey: "cadunico-updated", message: "O Cadastro Único precisa ter sido atualizado nos últimos 24 meses.",
  sourceUrl, verifiedAt: "2026-09-04", effectiveFrom: "2026-01-01", effectiveTo: "2026-12-31",
  ruleVersion: 1, isActive: true,
}];
const asOf = new Date("2026-09-04T12:00:00Z");
const evaluate = (profile) => evaluateBenefitCompatibility({ profile, criteria, verifications, asOf });

test("ID Jovem compatible profile remains possible because the 24-month update is external", () => {
  const result = evaluate({ ageYears: 20, householdMonthlyIncome: 3000, cadunicoStatus: "yes" });
  assert.equal(result.level, "possible");
  assert.equal(result.routeEvaluations[0].status, "verification_required");
  assert.match(result.verificationExplanations[0].message, /últimos 24 meses/i);
});

test("ID Jovem missing profile data has priority over the external verification", () => {
  const result = evaluate({ ageYears: 20, cadunicoStatus: "yes" });
  assert.equal(result.level, "needs_information");
  assert.equal(result.canCompleteProfile, true);
});

test("ID Jovem objectively incompatible required data can safely produce low", () => {
  const result = evaluate({ ageYears: 30, householdMonthlyIncome: 4000, cadunicoStatus: "no" });
  assert.equal(result.level, "low");
  assert.equal(result.routeEvaluations[0].status, "rejected");
});

test("ID Jovem rules expire instead of reusing the 2026 income ceiling forever", () => {
  const result = evaluateBenefitCompatibility({
    profile: { ageYears: 20, householdMonthlyIncome: 3000, cadunicoStatus: "yes" },
    criteria, verifications, asOf: new Date("2027-01-01T12:00:00Z"),
  });
  assert.equal(result.level, "unstructured");
});
