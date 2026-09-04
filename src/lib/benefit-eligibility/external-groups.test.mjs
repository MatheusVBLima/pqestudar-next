import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBenefitCompatibility } from "./evaluate.ts";

const criterion = (id, routeKey, overrides = {}) => ({
  id, benefitId: "benefit", ruleKey: id, routeKey, criterionKey: "disability",
  operator: "is_true", expectedValue: true, groupKey: "health-condition",
  groupOperator: "or", importance: "required", matchMessage: `${id}: match`,
  unknownMessage: `${id}: missing`, mismatchMessage: `${id}: mismatch`,
  sourceUrl: "https://example.gov.br", verifiedAt: "2026-09-04",
  ruleVersion: 1, isActive: true, ...overrides,
});
const verification = (id, routeKey, overrides = {}) => ({
  id, benefitId: "benefit", routeKey, verificationKey: id,
  message: `${id}: external`, sourceUrl: "https://example.gov.br",
  verifiedAt: "2026-09-04", ruleVersion: 1, isActive: true, ...overrides,
});
const evaluate = (profile, criteria, verifications) => evaluateBenefitCompatibility({
  profile, criteria, verifications, asOf: new Date("2026-09-04T12:00:00Z"),
});

test("A: automatic OR external is satisfied by an automatic match", () => {
  const result = evaluate(
    { conditions: ["disability"] },
    [criterion("disability", "medical")],
    [verification("disease", "medical", { groupKey: "health-condition", groupOperator: "or" })],
  );
  assert.equal(result.level, "high");
  assert.equal(result.routeEvaluations[0].status, "matched");
  assert.equal(result.verificationExplanations.length, 0);
});

test("B: automatic mismatch OR external is indeterminate, never rejected", () => {
  const result = evaluate(
    { conditions: [] },
    [criterion("disability", "medical")],
    [verification("disease", "medical", { groupKey: "health-condition", groupOperator: "or" })],
  );
  assert.equal(result.level, "possible");
  assert.equal(result.routeEvaluations[0].status, "indeterminate");
  assert.equal(result.verificationExplanations[0].outcome, "indeterminate");
});

test("C: automatic match AND external produces verification_required", () => {
  const result = evaluate(
    { cadunicoStatus: "yes" },
    [criterion("cadunico", "medical", { criterionKey: "cadunico_status", operator: "equals", expectedValue: "yes", groupKey: "medical-proof", groupOperator: "and" })],
    [verification("equipment", "medical", { groupKey: "medical-proof", groupOperator: "and" })],
  );
  assert.equal(result.level, "possible");
  assert.equal(result.routeEvaluations[0].status, "verification_required");
});

test("D and I: needs_information wins over an indeterminate route", () => {
  const result = evaluate(
    { conditions: [], ageYears: null },
    [
      criterion("age", "fillable", { criterionKey: "age", operator: "greater_than_or_equal", expectedValue: 18, groupKey: "age", groupOperator: "and" }),
      criterion("disability", "medical"),
    ],
    [verification("disease", "medical", { groupKey: "health-condition", groupOperator: "or" })],
  );
  assert.equal(result.level, "needs_information");
  assert.equal(result.canCompleteProfile, true);
});

test("E: indeterminate plus rejected routes remains possible, never low", () => {
  const result = evaluate(
    { conditions: [], ageYears: 15 },
    [
      criterion("age", "adult", { criterionKey: "age", operator: "greater_than_or_equal", expectedValue: 18, groupKey: "age", groupOperator: "and" }),
      criterion("disability", "medical"),
    ],
    [verification("disease", "medical", { groupKey: "health-condition", groupOperator: "or" })],
  );
  assert.equal(result.level, "possible");
  assert.deepEqual(result.routeEvaluations.map((route) => route.status).sort(), ["indeterminate", "rejected"]);
});

test("F: all objectively rejected routes produce low", () => {
  const result = evaluate(
    { conditions: [], ageYears: 15 },
    [
      criterion("age", "adult", { criterionKey: "age", operator: "greater_than_or_equal", expectedValue: 18, groupKey: "age", groupOperator: "and" }),
      criterion("disability", "medical", { groupOperator: "and" }),
    ],
    [],
  );
  assert.equal(result.level, "low");
});

test("G: a matched route wins over indeterminate and rejected routes", () => {
  const result = evaluate(
    { conditions: [], ageYears: 70 },
    [
      criterion("elderly", "elderly", { criterionKey: "age", operator: "greater_than_or_equal", expectedValue: 65, groupKey: "age", groupOperator: "and" }),
      criterion("minor", "adult", { criterionKey: "age", operator: "less_than", expectedValue: 18, groupKey: "minor", groupOperator: "and" }),
      criterion("disability", "medical"),
    ],
    [verification("disease", "medical", { groupKey: "health-condition", groupOperator: "or" })],
  );
  assert.equal(result.level, "high");
});

test("H: verification_required wins over indeterminate", () => {
  const result = evaluate(
    { conditions: [], cadunicoStatus: "yes" },
    [
      criterion("disability", "medical"),
      criterion("cad", "documented", { criterionKey: "cadunico_status", operator: "equals", expectedValue: "yes", groupKey: "proof", groupOperator: "and" }),
    ],
    [
      verification("disease", "medical", { groupKey: "health-condition", groupOperator: "or" }),
      verification("document", "documented", { groupKey: "proof", groupOperator: "and" }),
    ],
  );
  assert.equal(result.level, "possible");
  assert.equal(result.verificationExplanations[0].verificationKey, "document");
  assert.equal(result.verificationExplanations[0].outcome, "verification_required");
});

test("J: an indeterminate route alone does not offer profile completion", () => {
  const result = evaluate(
    { conditions: [] },
    [criterion("disability", "medical")],
    [verification("disease", "medical", { groupKey: "health-condition", groupOperator: "or" })],
  );
  assert.equal(result.level, "possible");
  assert.equal(result.canCompleteProfile, false);
});

test("M: legacy ungrouped verification preserves mandatory verification semantics", () => {
  const result = evaluate(
    { ageYears: 20 },
    [criterion("age", "legacy", { criterionKey: "age", operator: "greater_than_or_equal", expectedValue: 18, groupKey: "age", groupOperator: "and" })],
    [verification("legacy-document", "legacy")],
  );
  assert.equal(result.level, "possible");
  assert.equal(result.routeEvaluations[0].status, "verification_required");
  assert.equal(result.verificationExplanations[0].outcome, "verification_required");
});
