import { EMPTY_PROFILE_FORM, profileInsertFromForm } from "../src/lib/benefit-eligibility/profile-form.ts";

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !anonKey || !serviceKey) throw new Error("Supabase environment variables are required.");

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const email = `eligibility-flow-${stamp}@example.invalid`;
const password = `Flow-${stamp}-Aa1!`;
let userId = null;

async function request(path, { token, prefer, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: token ? anonKey : serviceKey,
      Authorization: `Bearer ${token ?? serviceKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: response.ok, status: response.status, body };
}

function check(value, message) {
  if (!value) throw new Error(message);
}

async function login() {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  check(response.ok && body?.access_token, `Login failed: ${JSON.stringify(body)}`);
  return body.access_token;
}

async function profiles(token) {
  const result = await request(`/rest/v1/eligibility_profiles?owner_user_id=eq.${userId}&select=*&order=updated_at.desc`, { token });
  check(result.ok, `Profile read failed: ${JSON.stringify(result.body)}`);
  return result.body;
}

async function preference(token) {
  const result = await request(`/rest/v1/eligibility_profile_preferences?user_id=eq.${userId}&select=*`, { token });
  check(result.ok, `Preference read failed: ${JSON.stringify(result.body)}`);
  return result.body[0] ?? null;
}

async function savePreference(token, profileId, enabled) {
  const result = await request("/rest/v1/eligibility_profile_preferences?on_conflict=user_id", {
    token,
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({ user_id: userId, active_profile_id: profileId, profile_filter_enabled: enabled, updated_at: new Date().toISOString() }),
  });
  check(result.ok && result.body.length === 1, `Preference save failed: ${JSON.stringify(result.body)}`);
  return result.body[0];
}

try {
  const createdUser = await request("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  check(createdUser.ok, `Test user creation failed: ${JSON.stringify(createdUser.body)}`);
  userId = createdUser.body.id;
  let token = await login();

  // Cancelling first use performs no write and therefore cannot create an inconsistent preference.
  check((await profiles(token)).length === 0, "New user unexpectedly has a profile.");
  check((await preference(token)) === null, "New user unexpectedly has a preference.");

  const createPayload = profileInsertFromForm({
    ...EMPTY_PROFILE_FORM,
    stateCode: "SP",
    municipalityName: "São Paulo",
    municipalityIbgeCode: "3550308",
    ageYears: 29,
    householdSize: 3,
    studentStatus: "higher_education",
    educationNetwork: "private",
    cadunicoStatus: null,
    conditions: null,
  }, userId, new Date());
  const created = await request("/rest/v1/eligibility_profiles", {
    token,
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify(createPayload),
  });
  check(created.ok && created.body.length === 1, `Profile creation failed: ${JSON.stringify(created.body)}`);
  const profile = created.body[0];
  check(profile.age_years === 29 && /^\d{4}-\d{2}-\d{2}$/.test(profile.age_recorded_at), "Reported age was not persisted with its reference date.");
  const enabledPreference = await savePreference(token, profile.id, true);
  check(enabledPreference.active_profile_id === profile.id && enabledPreference.profile_filter_enabled === true, "Created profile was not activated.");
  check((await profiles(token)).length === 1, "First save created more than one profile.");

  // Refresh is a fresh REST read; login again is a fresh auth session.
  const refreshProfile = (await profiles(token))[0];
  const refreshPreference = await preference(token);
  check(refreshProfile.id === profile.id && refreshPreference.active_profile_id === profile.id && refreshPreference.profile_filter_enabled, "Refresh did not recover profile and preference.");
  token = await login();
  const reloginProfile = (await profiles(token))[0];
  check(reloginProfile.id === profile.id && (await preference(token)).profile_filter_enabled, "A new login did not recover remote state.");

  // Establish an older reference date to prove unrelated edits preserve it.
  const oldReference = await request(`/rest/v1/eligibility_profiles?id=eq.${profile.id}`, {
    token, method: "PATCH", prefer: "return=representation", body: JSON.stringify({ age_recorded_at: "2026-01-10" }),
  });
  check(oldReference.ok, "Could not prepare the age reference-date scenario.");
  const existing = oldReference.body[0];
  const conditionalPayload = profileInsertFromForm({
    ...EMPTY_PROFILE_FORM,
    ageYears: 29,
    stateCode: null,
    municipalityName: "São Paulo",
    municipalityIbgeCode: "3550308",
    studentStatus: "not_student",
    educationNetwork: "private",
    cadunicoStatus: null,
    conditions: null,
  }, userId, new Date(), existing);
  const conditionalEdit = await request(`/rest/v1/eligibility_profiles?id=eq.${profile.id}`, {
    token, method: "PATCH", prefer: "return=representation", body: JSON.stringify(conditionalPayload),
  });
  check(conditionalEdit.ok && conditionalEdit.body.length === 1, `Conditional edit failed: ${JSON.stringify(conditionalEdit.body)}`);
  const conditional = conditionalEdit.body[0];
  check(conditional.id === profile.id, "Edit changed the profile UUID.");
  check(conditional.education_network === null, "Not studying did not clear education_network remotely.");
  check(conditional.state_code === null && conditional.municipality_name === null && conditional.municipality_ibge_code === null, "Removing the state did not clear municipality fields remotely.");
  check(conditional.household_monthly_income === null && conditional.cadunico_status === null, "Optional fields acquired inferred values.");
  check(conditional.conditions === null, "Prefer not to disclose conditions was not stored as null.");
  check(conditional.age_recorded_at === "2026-01-10", "An unrelated edit incorrectly changed age_recorded_at.");

  const noConditionsPayload = profileInsertFromForm({ ...EMPTY_PROFILE_FORM, ageYears: 29, conditions: [] }, userId, new Date(), conditional);
  const noConditionsEdit = await request(`/rest/v1/eligibility_profiles?id=eq.${profile.id}`, {
    token, method: "PATCH", prefer: "return=representation", body: JSON.stringify(noConditionsPayload),
  });
  check(noConditionsEdit.ok && Array.isArray(noConditionsEdit.body[0].conditions) && noConditionsEdit.body[0].conditions.length === 0, "No conditions was not preserved as an empty array.");

  const beforeAgeChange = noConditionsEdit.body[0];
  const changedAgePayload = profileInsertFromForm({ ...EMPTY_PROFILE_FORM, ageYears: 30, conditions: [] }, userId, new Date(), beforeAgeChange);
  const ageEdit = await request(`/rest/v1/eligibility_profiles?id=eq.${profile.id}`, {
    token, method: "PATCH", prefer: "return=representation", body: JSON.stringify(changedAgePayload),
  });
  check(ageEdit.ok && ageEdit.body[0].age_years === 30 && ageEdit.body[0].age_recorded_at !== "2026-01-10", "Changing age did not renew its reference date.");
  check(ageEdit.body[0].id === profile.id && (await profiles(token)).length === 1, "Editing created a duplicate or changed UUID.");

  await savePreference(token, profile.id, false);
  check(!(await preference(token)).profile_filter_enabled && (await profiles(token)).length === 1, "Deactivation deleted the profile or remained enabled.");
  await savePreference(token, profile.id, true);
  check((await preference(token)).profile_filter_enabled && (await profiles(token)).length === 1, "Reactivation did not reuse the existing profile.");

  const rejected = await request(`/rest/v1/eligibility_profiles?id=eq.${profile.id}`, {
    token, method: "PATCH", prefer: "return=representation", body: JSON.stringify({ age_years: 121 }),
  });
  check(!rejected.ok && rejected.status >= 400, "The database accepted an invalid age.");
  check((await profiles(token))[0].age_years === 30 && (await preference(token)).profile_filter_enabled, "A rejected write corrupted profile or preference state.");

  console.log(JSON.stringify({
    passed: true,
    operationsUsedAnonAuthenticatedToken: true,
    profileId: profile.id,
    profileCount: (await profiles(token)).length,
    ageYears: (await profiles(token))[0].age_years,
    ageRecordedAt: (await profiles(token))[0].age_recorded_at,
    checks: 24,
  }, null, 2));
} finally {
  if (userId) {
    await request(`/rest/v1/eligibility_profile_preferences?user_id=eq.${userId}`, { method: "DELETE" });
    await request(`/rest/v1/eligibility_profiles?owner_user_id=eq.${userId}`, { method: "DELETE" });
    await request(`/auth/v1/admin/users/${userId}`, { method: "DELETE" });
  }
}
