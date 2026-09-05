import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_PROFILE_FORM, normalizeProfileForm, profileInsertFromForm, validateProfileStep } from "./profile-form.ts";
import { eligibilityPersistenceErrorMessage, persistEligibilityProfile, profileActivationAction } from "./profile-persistence.ts";

function profileRow(overrides = {}) {
  return {
    id: "profile-1", owner_user_id: "user-1", label: "Perfil principal",
    age_years: null, age_recorded_at: null, birth_date: null, state_code: null,
    municipality_name: null, municipality_ibge_code: null,
    household_monthly_income: null, household_size: null, cadunico_family_size: null, cadunico_status: null,
    student_status: null, education_network: null, employment_status: null,
    conditions: null, created_at: "2026-09-03T00:00:00Z", updated_at: "2026-09-03T00:00:00Z",
    ...overrides,
  };
}

test("normalizes a partially completed profile", () => {
  const payload = profileInsertFromForm({ ...EMPTY_PROFILE_FORM, stateCode: "ce", ageYears: 24 }, "user-1", new Date("2026-09-03T00:00:00Z"));
  assert.equal(payload.state_code, "CE");
  assert.equal(payload.age_years, 24);
  assert.equal(payload.household_size, null);
  assert.equal(payload.age_recorded_at, "2026-09-03");
});

test("clears education network when the profile no longer studies", () => {
  const normalized = normalizeProfileForm({ ...EMPTY_PROFILE_FORM, studentStatus: "not_student", educationNetwork: "private" });
  assert.equal(normalized.educationNetwork, null);
});

test("keeps CadUnico family size only while CadUnico is explicitly confirmed", () => {
  const confirmed = normalizeProfileForm({ ...EMPTY_PROFILE_FORM, cadunicoStatus: "yes", cadunicoFamilySize: 2 });
  const denied = normalizeProfileForm({ ...confirmed, cadunicoStatus: "no" });
  const unknown = normalizeProfileForm({ ...confirmed, cadunicoStatus: "unknown" });
  const undisclosed = normalizeProfileForm({ ...confirmed, cadunicoStatus: null });
  assert.equal(confirmed.cadunicoFamilySize, 2);
  assert.equal(denied.cadunicoFamilySize, null);
  assert.equal(unknown.cadunicoFamilySize, null);
  assert.equal(undisclosed.cadunicoFamilySize, null);
});

test("persists declared CadUnico family size without changing household size", () => {
  const payload = profileInsertFromForm({
    ...EMPTY_PROFILE_FORM,
    householdSize: 4,
    cadunicoStatus: "yes",
    cadunicoFamilySize: 2,
  }, "user-1");
  assert.equal(payload.household_size, 4);
  assert.equal(payload.cadunico_family_size, 2);
});

test("legacy profiles have no inferred CadUnico family size", () => {
  const legacy = profileRow({ household_size: 1 });
  delete legacy.cadunico_family_size;
  const normalized = normalizeProfileForm({
    ...EMPTY_PROFILE_FORM,
    householdSize: legacy.household_size,
    cadunicoStatus: legacy.cadunico_status,
    cadunicoFamilySize: legacy.cadunico_family_size,
  });
  assert.equal(normalized.householdSize, 1);
  assert.equal(normalized.cadunicoFamilySize, null);
});

test("clears municipality when its state is removed", () => {
  const normalized = normalizeProfileForm({ ...EMPTY_PROFILE_FORM, municipalityName: "Fortaleza", municipalityIbgeCode: "2304400" });
  assert.equal(normalized.municipalityName, null);
  assert.equal(normalized.municipalityIbgeCode, null);
});

test("validates numeric fields without requiring optional answers", () => {
  assert.equal(validateProfileStep(EMPTY_PROFILE_FORM, 1), null);
  assert.match(validateProfileStep({ ...EMPTY_PROFILE_FORM, householdSize: 0 }, 1), /quantidade/i);
  assert.match(validateProfileStep({ ...EMPTY_PROFILE_FORM, cadunicoStatus: "yes", cadunicoFamilySize: 51 }, 1), /CadÚnico/i);
});

test("creates one profile and persists it as active", async () => {
  const calls = [];
  const saved = profileRow();
  const result = await persistEligibilityProfile({
    userId: "user-1", values: EMPTY_PROFILE_FORM,
    port: {
      create: async () => { calls.push("create"); return saved; },
      update: async () => { calls.push("update"); return saved; },
      savePreference: async ({ activeProfileId, enabled }) => { calls.push(`preference:${activeProfileId}:${enabled}`); },
    },
  });
  assert.equal(result.id, "profile-1");
  assert.deepEqual(calls, ["create", "preference:profile-1:true"]);
});

test("edits the same profile rather than creating a duplicate", async () => {
  const calls = [];
  await persistEligibilityProfile({
    userId: "user-1", existingProfile: profileRow(), values: { ...EMPTY_PROFILE_FORM, ageYears: 31 },
    port: {
      create: async () => { calls.push("create"); return profileRow(); },
      update: async (id) => { calls.push(`update:${id}`); return profileRow({ age_years: 31 }); },
      savePreference: async () => { calls.push("preference"); },
    },
  });
  assert.deepEqual(calls, ["update:profile-1", "preference"]);
});

test("preserves the age reference date when the declared age is unchanged", () => {
  const payload = profileInsertFromForm(
    { ...EMPTY_PROFILE_FORM, ageYears: 31 },
    "user-1",
    new Date("2026-09-04T00:00:00Z"),
    profileRow({ age_years: 31, age_recorded_at: "2026-01-10" }),
  );
  assert.equal(payload.age_recorded_at, "2026-01-10");
});

test("updates or clears the age reference date coherently", () => {
  const previous = profileRow({ age_years: 31, age_recorded_at: "2026-01-10" });
  const changed = profileInsertFromForm(
    { ...EMPTY_PROFILE_FORM, ageYears: 32 }, "user-1", new Date("2026-09-04T00:00:00Z"), previous,
  );
  const cleared = profileInsertFromForm(
    { ...EMPTY_PROFILE_FORM, ageYears: null }, "user-1", new Date("2026-09-04T00:00:00Z"), previous,
  );
  assert.equal(changed.age_recorded_at, "2026-09-04");
  assert.equal(cleared.age_recorded_at, null);
});

test("propagates persistence errors and does not pretend the profile was saved", async () => {
  await assert.rejects(() => persistEligibilityProfile({
    userId: "user-1", values: EMPTY_PROFILE_FORM,
    port: {
      create: async () => { throw new Error("database unavailable"); },
      update: async () => profileRow(),
      savePreference: async () => undefined,
    },
  }), /database unavailable/);
});

test("preserves the created profile when activating the preference fails", async () => {
  const saved = profileRow();
  await assert.rejects(async () => {
    try {
      await persistEligibilityProfile({
        userId: "user-1", values: EMPTY_PROFILE_FORM,
        port: {
          create: async () => saved,
          update: async () => saved,
          savePreference: async () => { throw new Error("preference unavailable"); },
        },
      });
    } catch (error) {
      assert.equal(error.savedProfile.id, "profile-1");
      throw error;
    }
  }, /perfil foi salvo.*tente novamente/i);
});

test("first-use cancellation cannot leave the filter enabled", () => {
  assert.equal(profileActivationAction(true, false), "open_dialog");
  assert.equal(profileActivationAction(false, false), "disable");
});

test("an existing profile is enabled without reopening creation", () => {
  assert.equal(profileActivationAction(true, true), "enable");
});

test("converts technical persistence failures into retryable user messages", () => {
  assert.match(eligibilityPersistenceErrorMessage(new TypeError("Failed to fetch"), "save"), /internet.*tente novamente/i);
  assert.match(eligibilityPersistenceErrorMessage(new Error("violates check constraint"), "save"), /revise os campos/i);
  assert.match(eligibilityPersistenceErrorMessage(new Error("opaque backend detail"), "preference"), /tente novamente/i);
});
