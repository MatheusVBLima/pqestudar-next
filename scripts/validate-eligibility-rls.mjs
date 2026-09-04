const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !anonKey || !serviceKey) throw new Error("Supabase environment variables are required.");

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = `Rls-${stamp}-Aa1!`;
const resources = { users: [], criterionId: null };
const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function createUser(suffix) {
  const { response, body } = await jsonRequest(`${baseUrl}/auth/v1/admin/users`, {
    method: "POST", headers: serviceHeaders,
    body: JSON.stringify({ email: `eligibility-rls-${stamp}-${suffix}@example.invalid`, password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`Could not create test user: ${JSON.stringify(body)}`);
  resources.users.push(body.id);
  const login = await jsonRequest(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password }),
  });
  if (!login.response.ok) throw new Error("Could not authenticate test user.");
  return { id: body.id, token: login.body.access_token };
}

function userHeaders(token, prefer) {
  return { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) };
}

async function cleanup() {
  if (resources.criterionId) await fetch(`${baseUrl}/rest/v1/benefit_eligibility_criteria?id=eq.${resources.criterionId}`, { method: "DELETE", headers: serviceHeaders });
  for (const id of resources.users) {
    await fetch(`${baseUrl}/rest/v1/eligibility_profile_preferences?user_id=eq.${id}`, { method: "DELETE", headers: serviceHeaders });
    await fetch(`${baseUrl}/rest/v1/eligibility_profiles?owner_user_id=eq.${id}`, { method: "DELETE", headers: serviceHeaders });
    await fetch(`${baseUrl}/rest/v1/subscriptions?user_id=eq.${id}`, { method: "DELETE", headers: serviceHeaders });
    await fetch(`${baseUrl}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: serviceHeaders });
  }
}

try {
  const owner = await createUser("owner");
  const stranger = await createUser("stranger");

  const created = await jsonRequest(`${baseUrl}/rest/v1/eligibility_profiles`, {
    method: "POST", headers: userHeaders(owner.token, "return=representation"),
    body: JSON.stringify({ owner_user_id: owner.id, label: "RLS test profile", state_code: "CE" }),
  });
  if (!created.response.ok || created.body.length !== 1) throw new Error("Owner could not create a profile.");
  const profileId = created.body[0].id;

  const ownRead = await jsonRequest(`${baseUrl}/rest/v1/eligibility_profiles?id=eq.${profileId}`, { headers: userHeaders(owner.token) });
  if (!ownRead.response.ok || ownRead.body.length !== 1) throw new Error("Owner could not read own profile.");

  const foreignRead = await jsonRequest(`${baseUrl}/rest/v1/eligibility_profiles?id=eq.${profileId}`, { headers: userHeaders(stranger.token) });
  if (!foreignRead.response.ok || foreignRead.body.length !== 0) throw new Error("Another user could read the owner's profile.");

  const ownUpdate = await jsonRequest(`${baseUrl}/rest/v1/eligibility_profiles?id=eq.${profileId}`, {
    method: "PATCH", headers: userHeaders(owner.token, "return=representation"), body: JSON.stringify({ label: "RLS updated profile" }),
  });
  if (!ownUpdate.response.ok || ownUpdate.body[0]?.label !== "RLS updated profile") throw new Error("Owner could not update own profile.");

  const foreignPreference = await jsonRequest(`${baseUrl}/rest/v1/eligibility_profile_preferences`, {
    method: "POST", headers: userHeaders(stranger.token, "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({ user_id: stranger.id, active_profile_id: profileId, profile_filter_enabled: true }),
  });
  if (foreignPreference.response.ok) throw new Error("A user selected another user's profile as active.");

  const ownPreference = await jsonRequest(`${baseUrl}/rest/v1/eligibility_profile_preferences`, {
    method: "POST", headers: userHeaders(owner.token, "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({ user_id: owner.id, active_profile_id: profileId, profile_filter_enabled: true }),
  });
  if (!ownPreference.response.ok) throw new Error("Owner could not activate own profile.");

  const benefitResponse = await jsonRequest(`${baseUrl}/rest/v1/premium_items?select=id&status=eq.published&limit=1`, { headers: serviceHeaders });
  const benefitId = benefitResponse.body[0]?.id;
  const criterionPayload = {
    benefit_id: benefitId, rule_key: `rls-test-${stamp}`, criterion_key: "age", operator: "greater_than_or_equal",
    expected_value: 18, group_key: "rls-test", group_operator: "and", importance: "required",
    match_message: "test match", unknown_message: "test unknown", mismatch_message: "test mismatch",
    source_url: "https://example.gov.br", verified_at: "2026-09-03", rule_version: 1,
  };
  const criterion = await jsonRequest(`${baseUrl}/rest/v1/benefit_eligibility_criteria`, {
    method: "POST", headers: { ...serviceHeaders, Prefer: "return=representation" }, body: JSON.stringify(criterionPayload),
  });
  if (!criterion.response.ok) throw new Error(`Could not create test criterion: ${JSON.stringify(criterion.body)}`);
  resources.criterionId = criterion.body[0].id;

  const unauthorizedWrite = await jsonRequest(`${baseUrl}/rest/v1/benefit_eligibility_criteria`, {
    method: "POST", headers: userHeaders(stranger.token, "return=representation"),
    body: JSON.stringify({ ...criterionPayload, rule_key: `unauthorized-${stamp}` }),
  });
  if (unauthorizedWrite.response.ok) throw new Error("A regular user could create eligibility criteria.");

  await jsonRequest(`${baseUrl}/rest/v1/subscriptions`, {
    method: "POST", headers: serviceHeaders,
    body: JSON.stringify({ user_id: owner.id, plan_type: "monthly", plan_tier: "premium", status: "active", ends_at: "2099-12-31T00:00:00Z" }),
  });
  const subscriberRead = await jsonRequest(`${baseUrl}/rest/v1/benefit_eligibility_criteria?id=eq.${resources.criterionId}`, { headers: userHeaders(owner.token) });
  if (!subscriberRead.response.ok || subscriberRead.body.length !== 1) throw new Error("Active subscriber could not read criteria.");
  const nonSubscriberRead = await jsonRequest(`${baseUrl}/rest/v1/benefit_eligibility_criteria?id=eq.${resources.criterionId}`, { headers: userHeaders(stranger.token) });
  if (!nonSubscriberRead.response.ok || nonSubscriberRead.body.length !== 0) throw new Error("Non-subscriber could read criteria.");

  const ownDelete = await jsonRequest(`${baseUrl}/rest/v1/eligibility_profiles?id=eq.${profileId}`, { method: "DELETE", headers: userHeaders(owner.token, "return=representation") });
  if (!ownDelete.response.ok || ownDelete.body.length !== 1) throw new Error("Owner could not delete own profile.");

  console.log(JSON.stringify({ passed: true, checks: 10 }, null, 2));
} finally {
  await cleanup();
}
