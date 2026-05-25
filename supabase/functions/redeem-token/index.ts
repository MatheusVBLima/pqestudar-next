import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlanType = "monthly" | "annual" | "trial_30d" | "lifetime";
type PlanTier = "basic" | "premium" | "founder";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEndsAt(planType: PlanType) {
  const endsAt = new Date();
  if (planType === "lifetime") endsAt.setFullYear(endsAt.getFullYear() + 100);
  else if (planType === "annual") endsAt.setFullYear(endsAt.getFullYear() + 1);
  else if (planType === "trial_30d") endsAt.setDate(endsAt.getDate() + 30);
  else endsAt.setMonth(endsAt.getMonth() + 1);
  return endsAt.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!jwt) return json(401, { error: "Login necessario para resgatar o token." });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData.user) {
      return json(401, { error: "Sessao expirada. Faca login novamente." });
    }

    const body = await req.json();
    const tokenValue = String(body.token ?? "").trim().toUpperCase();
    if (!tokenValue) return json(400, { error: "Token obrigatorio." });

    const { data: token, error: tokenError } = await supabase
      .from("redeem_tokens")
      .select("*")
      .eq("token", tokenValue)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!token) return json(404, { error: "Token nao encontrado." });
    if (token.status === "used") return json(409, { error: "Este token ja foi utilizado." });
    if (token.status === "revoked") return json(409, { error: "Este token foi revogado." });

    const now = new Date();
    if (token.status === "expired" || new Date(token.expires_at).getTime() <= now.getTime()) {
      await supabase.from("redeem_tokens").update({ status: "expired" }).eq("id", token.id);
      return json(409, { error: "Este token expirou." });
    }

    const planType = token.plan_type as PlanType;
    const planTier = (token.plan_tier ?? "premium") as PlanTier;
    const endsAt = getEndsAt(planType);

    const { data: currentSub, error: currentSubError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentSubError) throw currentSubError;

    if (currentSub) {
      const { error: updateSubError } = await supabase
        .from("subscriptions")
        .update({
          plan_type: planType,
          plan_tier: planTier,
          status: "active",
          starts_at: now.toISOString(),
          ends_at: endsAt,
          updated_at: now.toISOString(),
        })
        .eq("id", currentSub.id);

      if (updateSubError) throw updateSubError;
    } else {
      const { error: insertSubError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userData.user.id,
          plan_type: planType,
          plan_tier: planTier,
          status: "active",
          starts_at: now.toISOString(),
          ends_at: endsAt,
        });

      if (insertSubError) throw insertSubError;
    }

    const { error: updateTokenError } = await supabase
      .from("redeem_tokens")
      .update({
        status: "used",
        used_at: now.toISOString(),
        used_by_user_id: userData.user.id,
      })
      .eq("id", token.id);

    if (updateTokenError) throw updateTokenError;

    return json(200, {
      success: true,
      message: "Assinatura ativada com sucesso!",
      plan_type: planType,
      plan_tier: planTier,
    });
  } catch (error) {
    console.error("redeem-token error", error);
    return json(500, { error: (error as Error).message });
  }
});
