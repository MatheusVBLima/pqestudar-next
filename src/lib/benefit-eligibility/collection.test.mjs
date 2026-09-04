import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBenefitCollection, filterBenefitCollection, sortBenefitsNormally, sortEvaluatedBenefits } from "./collection.ts";
import { compatibilityExplanationMessages, visibleCompatibility } from "./presentation.ts";

const benefits = [
  { id: "z", title: "Zeta", category: "Educação", scope: "Brasil", territorialSpecificity: 0, coverages: [{ label: "Brasil", level: "national" }] },
  { id: "a", title: "Alfa", category: "Assistência", scope: "Ceará", territorialSpecificity: 2, coverages: [{ label: "Ceará", level: "state" }] },
  { id: "m", title: "Meio", category: "Educação", scope: "Distrito Federal", territorialSpecificity: 2, coverages: [{ label: "Distrito Federal", level: "district" }] },
];

function criterion(overrides = {}) {
  return {
    id: "rule", benefitId: "z", ruleKey: "age", criterionKey: "age", operator: "greater_than_or_equal",
    expectedValue: 18, groupKey: "required", groupOperator: "and", importance: "required",
    matchMessage: "Faixa etária compatível", unknownMessage: "Idade não informada", mismatchMessage: "Faixa etária não compatível",
    sourceUrl: "https://example.gov.br", verifiedAt: "2026-09-04", ruleVersion: 1, isActive: true,
    ...overrides,
  };
}

function result(level, counts = {}) {
  const rank = { high: 4, possible: 3, needs_information: 2, low: 1, unstructured: 0 }[level];
  return { level, rank, matchedCount: 0, unknownCount: 0, mismatchedCount: 0, explanations: [], ...counts };
}

test("profile disabled preserves normal alphabetical order", () => {
  assert.deepEqual(sortBenefitsNormally(benefits).map((item) => item.id), ["a", "m", "z"]);
});

test("profile enabled evaluates benefits and keeps unstructured visible", () => {
  const evaluated = evaluateBenefitCollection({ benefits, profile: { ageYears: 20 }, criteria: [criterion()] });
  assert.equal(evaluated.find((item) => item.id === "z").compatibility.level, "high");
  assert.equal(evaluated.find((item) => item.id === "a").compatibility.level, "unstructured");
  assert.equal(evaluated.length, benefits.length);
});

test("sorts high, possible, needs information, low and unstructured in that order", () => {
  const evaluated = [
    { ...benefits[0], compatibility: result("unstructured") },
    { ...benefits[1], compatibility: result("low") },
    { ...benefits[2], id: "needs", compatibility: result("needs_information") },
    { ...benefits[2], id: "possible", compatibility: result("possible") },
    { ...benefits[2], id: "high", compatibility: result("high") },
  ];
  assert.deepEqual(sortEvaluatedBenefits(evaluated).map((item) => item.compatibility.level), ["high", "possible", "needs_information", "low", "unstructured"]);
});

test("uses matches, unknowns, mismatches, territory and title as deterministic tie-breakers", () => {
  const tied = [
    { ...benefits[0], title: "Beta", compatibility: result("high", { matchedCount: 2 }) },
    { ...benefits[1], title: "Zeta", compatibility: result("high", { matchedCount: 3, unknownCount: 1 }) },
    { ...benefits[2], title: "Alfa", compatibility: result("high", { matchedCount: 3 }) },
  ];
  assert.deepEqual(sortEvaluatedBenefits(tied).map((item) => item.id), ["m", "a", "z"]);
});

test("partial profile produces unknown rather than incompatibility", () => {
  const [evaluated] = evaluateBenefitCollection({ benefits: [benefits[0]], profile: {}, criteria: [criterion()] });
  assert.equal(evaluated.compatibility.level, "needs_information");
  assert.equal(evaluated.compatibility.unknownCount, 1);
});

test("badge visibility follows profile activation", () => {
  const compatibility = result("high");
  assert.equal(visibleCompatibility(false, compatibility), null);
  assert.equal(visibleCompatibility(true, compatibility), compatibility);
});

test("explanations preserve rule messages and neutral unstructured wording", () => {
  const [evaluated] = evaluateBenefitCollection({ benefits: [benefits[0]], profile: {}, criteria: [criterion()] });
  assert.deepEqual(compatibilityExplanationMessages(evaluated.compatibility), ["Idade não informada"]);
  assert.match(compatibilityExplanationMessages(result("unstructured"))[0], /ainda não foram estruturados/i);
});

test("search, region and category filters run before evaluation", () => {
  const coveragesFor = (benefit) => benefit.coverages;
  assert.deepEqual(filterBenefitCollection({ benefits, search: "zeta", region: "all", category: "all", coveragesFor }).map((item) => item.id), ["z"]);
  assert.deepEqual(filterBenefitCollection({ benefits, search: "", region: "Ceará", category: "all", coveragesFor }).map((item) => item.id), ["z", "a"]);
  assert.deepEqual(filterBenefitCollection({ benefits, search: "", region: "all", category: "Educação", coveragesFor }).map((item) => item.id), ["z", "m"]);
});

test("editing the same profile reevaluates without duplicating benefits", () => {
  const before = evaluateBenefitCollection({ benefits, profile: {}, criteria: [criterion()] });
  const after = evaluateBenefitCollection({ benefits, profile: { ageYears: 20 }, criteria: [criterion()] });
  assert.equal(before.find((item) => item.id === "z").compatibility.level, "needs_information");
  assert.equal(after.find((item) => item.id === "z").compatibility.level, "high");
  assert.equal(new Set(after.map((item) => item.id)).size, benefits.length);
});

test("disabling restores normal order and reactivation can reuse the same profile object", () => {
  const profile = { id: "same-profile", ageYears: 20 };
  const active = sortEvaluatedBenefits(evaluateBenefitCollection({ benefits, profile, criteria: [criterion()] }));
  const disabled = sortBenefitsNormally(benefits);
  const reactivated = sortEvaluatedBenefits(evaluateBenefitCollection({ benefits, profile, criteria: [criterion()] }));
  assert.deepEqual(disabled.map((item) => item.id), ["a", "m", "z"]);
  assert.deepEqual(reactivated.map((item) => item.id), active.map((item) => item.id));
  assert.equal(profile.id, "same-profile");
});
