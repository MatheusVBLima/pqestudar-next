import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBenefitCompatibility } from "./evaluate.ts";
import { sortBenefitsNormally } from "./collection.ts";

function criterion(id, routeKey, overrides = {}) {
  return {
    id, benefitId: "benefit", ruleKey: id, routeKey, criterionKey: "age",
    operator: "greater_than_or_equal", expectedValue: 18, groupKey: id,
    groupOperator: "and", importance: "required", matchMessage: `${id}: match`,
    unknownMessage: `${id}: missing`, mismatchMessage: `${id}: mismatch`,
    sourceUrl: "https://example.gov.br", verifiedAt: "2026-09-04",
    ruleVersion: 1, isActive: true, ...overrides,
  };
}

function verification(id, routeKey, overrides = {}) {
  return {
    id, benefitId: "benefit", routeKey, verificationKey: id,
    message: `${id}: external verification`, sourceUrl: "https://example.gov.br",
    verifiedAt: "2026-09-04", ruleVersion: 1, isActive: true, ...overrides,
  };
}

function evaluate(profile, criteria = [], verifications = []) {
  return evaluateBenefitCompatibility({ profile, criteria, verifications, asOf: new Date("2026-09-04T00:00:00Z") });
}

test("A: a fully satisfied route without external verification is high", () => {
  const result = evaluate({ ageYears: 20 }, [criterion("age", "standard")]);
  assert.equal(result.level, "high");
  assert.equal(result.routeEvaluations[0].status, "matched");
});

test("B: satisfied automatic criteria plus external verification is possible", () => {
  const result = evaluate({ ageYears: 20 }, [criterion("age", "standard")], [verification("document", "standard")]);
  assert.equal(result.level, "possible");
  assert.equal(result.routeEvaluations[0].status, "verification_required");
});

test("C: missing profile information is needs_information", () => {
  const result = evaluate({}, [criterion("age", "standard")]);
  assert.equal(result.level, "needs_information");
  assert.equal(result.canCompleteProfile, true);
});

test("D: missing profile information has priority over external verification in the same route", () => {
  const result = evaluate({}, [criterion("age", "standard")], [verification("document", "standard")]);
  assert.equal(result.level, "needs_information");
  assert.equal(result.routeEvaluations[0].status, "needs_information");
  assert.equal(result.canCompleteProfile, true);
});

test("E: one rejected route and another pending verification is possible, never low", () => {
  const result = evaluate(
    { ageYears: 30, conditions: ["disability"] },
    [
      criterion("elderly", "elderly", { expectedValue: 65 }),
      criterion("disability", "disability", { criterionKey: "disability", operator: "is_true", expectedValue: true }),
    ],
    [verification("assessment", "disability")],
  );
  assert.equal(result.level, "possible");
  assert.deepEqual(result.routeEvaluations.map((route) => route.status).sort(), ["rejected", "verification_required"]);
});

test("F: one rejected route and another missing profile field is needs_information", () => {
  const result = evaluate(
    { ageYears: 30, conditions: null },
    [
      criterion("elderly", "elderly", { expectedValue: 65 }),
      criterion("disability", "disability", { criterionKey: "disability", operator: "is_true", expectedValue: true }),
    ],
  );
  assert.equal(result.level, "needs_information");
});

test("G: all represented routes objectively rejected is low", () => {
  const result = evaluate(
    { ageYears: 30, conditions: [] },
    [
      criterion("elderly", "elderly", { expectedValue: 65 }),
      criterion("disability", "disability", { criterionKey: "disability", operator: "is_true", expectedValue: true }),
    ],
  );
  assert.equal(result.level, "low");
  assert.ok(result.routeEvaluations.every((route) => route.status === "rejected"));
});

test("H: one matched route wins over rejected and externally pending routes", () => {
  const result = evaluate(
    { ageYears: 70, conditions: [] },
    [
      criterion("elderly", "elderly", { expectedValue: 65 }),
      criterion("disability", "disability", { criterionKey: "disability", operator: "is_true", expectedValue: true }),
    ],
    [verification("other-route-check", "other")],
  );
  assert.equal(result.level, "high");
});

test("I: an incompatible common requirement rejects all dependent routes", () => {
  const common = criterion("common-disability", "common", {
    criterionKey: "disability", operator: "is_true", expectedValue: true,
  });
  const result = evaluate({ conditions: [] }, [common], [verification("route-a", "a"), verification("route-b", "b")]);
  assert.equal(result.level, "low");
  assert.ok(result.routeEvaluations.every((route) => route.status === "rejected"));
});

test("common may target selected routes without invalidating an independent route", () => {
  const scopedCommon = criterion("scoped-common", "common", {
    appliesToRoutes: ["a", "b"], criterionKey: "disability", operator: "is_true", expectedValue: true,
  });
  const independent = criterion("independent-age", "c", { expectedValue: 18 });
  const result = evaluate({ ageYears: 20, conditions: [] }, [scopedCommon, independent], [verification("route-a", "a"), verification("route-b", "b")]);
  assert.equal(result.level, "high");
  assert.equal(result.routeEvaluations.find((route) => route.routeKey === "c").status, "matched");
});

test("J: benefit without criteria or external verification remains unstructured", () => {
  assert.equal(evaluate({}, [], []).level, "unstructured");
});

test("K: external verification alone does not suggest completing the profile", () => {
  const result = evaluate({}, [], [verification("assessment", "standard")]);
  assert.equal(result.level, "possible");
  assert.equal(result.canCompleteProfile, false);
  assert.equal(result.verificationExplanations[0].outcome, "verification_required");
});

test("L: missing fillable information enables completing the profile", () => {
  const result = evaluate({}, [criterion("age", "standard")], [verification("assessment", "standard")]);
  assert.equal(result.level, "needs_information");
  assert.equal(result.canCompleteProfile, true);
});

test("M: profile-disabled normal sorting remains unchanged", () => {
  const benefits = [{ id: "2", title: "Zeta" }, { id: "1", title: "Alfa" }];
  assert.deepEqual(sortBenefitsNormally(benefits).map((benefit) => benefit.id), ["1", "2"]);
});
