import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlanType = "monthly" | "annual" | "trial_30d" | "lifetime";
type PlanTier = "basic" | "premium" | "founder";

type PlanConfig = {
  type: PlanType;
  tier: PlanTier;
};

type CaktoPayload = {
  secret?: string;
  event?: string;
  data?: {
    id?: string;
    refId?: string;
    customer?: {
      email?: string;
      name?: string;
    };
    product?: {
      id?: string;
      name?: string;
    };
    offer?: {
      id?: string;
      name?: string;
    };
    subscription?: {
      id?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const cryptoValues = new Uint8Array(16);
  crypto.getRandomValues(cryptoValues);

  let token = "";
  for (let index = 0; index < cryptoValues.length; index++) {
    if (index > 0 && index % 4 === 0) token += "-";
    token += chars[cryptoValues[index] % chars.length];
  }
  return token;
}

function isPlanType(value: unknown): value is PlanType {
  return value === "monthly" || value === "annual" || value === "trial_30d" || value === "lifetime";
}

function isPlanTier(value: unknown): value is PlanTier {
  return value === "basic" || value === "premium" || value === "founder";
}

function getPlanConfig(payload: CaktoPayload): PlanConfig {
  const productId = String(payload.data?.product?.id ?? "");
  const offerId = String(payload.data?.offer?.id ?? "");
  const planMapRaw = Deno.env.get("CAKTO_PLAN_MAP");

  if (planMapRaw) {
    try {
      const planMap = JSON.parse(planMapRaw) as Record<string, PlanType | PlanConfig>;
      const mapped = planMap[offerId] || planMap[productId];
      if (isPlanType(mapped)) return { type: mapped, tier: "premium" };
      if (mapped && typeof mapped === "object" && isPlanType(mapped.type)) {
        return {
          type: mapped.type,
          tier: isPlanTier(mapped.tier) ? mapped.tier : "premium",
        };
      }
    } catch (error) {
      console.warn("Invalid CAKTO_PLAN_MAP JSON", error);
    }
  }

  const text = `${payload.data?.product?.name ?? ""} ${payload.data?.offer?.name ?? ""}`.toLowerCase();
  const isFounder = text.includes("fundador") || text.includes("founder") || text.includes("lancamento") || text.includes("lançamento");
  const type: PlanType = isFounder || text.includes("vitalicio") || text.includes("vitalício") || text.includes("unico") || text.includes("único")
    ? "lifetime"
    : text.includes("trial") || text.includes("teste") || text.includes("30")
    ? "trial_30d"
    : text.includes("mensal") || text.includes("monthly") || text.includes("mes")
      ? "monthly"
      : "annual";
  const tier: PlanTier = isFounder
    ? "founder"
    : text.includes("basico") || text.includes("básico") || text.includes("basic") || text.includes("padrao") || text.includes("padrão")
    ? "basic"
    : "premium";

  return { type, tier };
}

function getExpiry(planType: PlanType) {
  const expiresAt = new Date();
  const configuredHours = Number(Deno.env.get("REDEEM_TOKEN_EXPIRY_HOURS") || "72");
  expiresAt.setHours(expiresAt.getHours() + (Number.isFinite(configuredHours) ? configuredHours : 72));
  return expiresAt.toISOString();
}

function getOrderId(payload: CaktoPayload) {
  return String(payload.data?.id || payload.data?.refId || "").trim();
}

function isCaktoTestPayload(payload: CaktoPayload) {
  const data = payload.data as Record<string, unknown> | undefined;
  const email = normalizeEmail(payload.data?.customer?.email);
  const productName = String(payload.data?.product?.name ?? "").toLowerCase();
  const utmSource = String(data?.utm_source ?? "").toLowerCase();
  const utmMedium = String(data?.utm_medium ?? "").toLowerCase();

  return (
    email === "john.doe@example.com" ||
    productName.includes("produto teste") ||
    utmSource === "test" ||
    utmMedium === "webhook"
  );
}

function getRefundLookupIds(payload: CaktoPayload) {
  const values = [
    payload.data?.id,
    payload.data?.refId,
    payload.data?.subscription?.id,
    (payload.data as Record<string, unknown> | undefined)?.purchase_id,
    (payload.data as Record<string, unknown> | undefined)?.transaction_id,
    (payload.data as Record<string, unknown> | undefined)?.order_id,
  ];

  return values.map((value) => String(value ?? "").trim()).filter(Boolean);
}

async function sendRedeemEmail(params: {
  email: string;
  name?: string;
  token: string;
  planType: PlanType;
  planTier: PlanTier;
}) {
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "PqEstudar";
  const siteUrl = Deno.env.get("SITE_URL") || "https://pqestudar.com";

  if (!brevoKey || !senderEmail) {
    console.warn("Brevo email not configured. Token generated but email not sent.", {
      email: params.email,
      token: params.token,
    });
    return { sent: false, reason: "BREVO_API_KEY or BREVO_SENDER_EMAIL missing" };
  }

  const planLabel =
    params.planType === "lifetime"
      ? "Vitalício"
      : params.planType === "annual"
        ? "Anual"
        : params.planType === "monthly"
          ? "Mensal"
          : "Trial 30 dias";
  const tierLabel =
    params.planTier === "founder" ? "Fundador" : params.planTier === "basic" ? "Básico" : "Premium";

  const redeemUrl = `${siteUrl.replace(/\/$/, "")}/premium/resgatar`;
  const firstName = params.name?.trim().split(/\s+/)[0] || "Tudo certo";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: params.email, name: params.name || undefined }],
      subject: `Seu acesso ${tierLabel} PqEstudar`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717">
          <h1>Seu acesso ${tierLabel} esta pronto</h1>
          <p>${firstName}, obrigado pela compra do plano ${tierLabel} ${planLabel}.</p>
          <p>Use o código abaixo para ativar seu acesso:</p>
          <p style="font-size:24px;font-weight:700;letter-spacing:2px;background:#f3f3f3;padding:16px;border-radius:8px;display:inline-block">${params.token}</p>
          <p>Acesse <a href="${redeemUrl}">${redeemUrl}</a>, faça login e cole o código.</p>
          <p>Se você não reconhece essa compra, ignore este e-mail.</p>
        </div>
      `,
      textContent: `Seu acesso ${tierLabel} PqEstudar esta pronto.\n\nCodigo: ${params.token}\n\nAcesse ${redeemUrl}, faca login e cole o codigo.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Brevo email error", response.status, detail);
    return { sent: false, reason: detail.slice(0, 500) };
  }

  return { sent: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const payload = (await req.json()) as CaktoPayload;
    const expectedSecrets = (Deno.env.get("CAKTO_WEBHOOK_SECRET") || "")
      .split(",")
      .map((secret) => secret.trim())
      .filter(Boolean);

    if (expectedSecrets.length > 0 && !expectedSecrets.includes(String(payload.secret ?? ""))) {
      return json(401, { error: "Invalid webhook secret" });
    }

    const event = String(payload.event ?? "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (event === "purchase_approved" || event === "subscription_renewed") {
      if (isCaktoTestPayload(payload)) {
        return json(200, {
          success: true,
          ignored: true,
          reason: "cakto_test_payload",
        });
      }

      const email = normalizeEmail(payload.data?.customer?.email);
      const orderId = getOrderId(payload);
      const planConfig = getPlanConfig(payload);

      if (!email || !orderId) {
        console.warn("Cakto purchase event ignored because test payload is incomplete", {
          event,
          hasEmail: Boolean(email),
          hasOrderId: Boolean(orderId),
          product: payload.data?.product?.name,
          offer: payload.data?.offer?.name,
        });

        return json(200, {
          success: true,
          ignored: true,
          reason: "missing_customer_email_or_order_id",
        });
      }

      const { data: existing, error: existingError } = await supabase
        .from("redeem_tokens")
        .select("*")
        .eq("cakto_order_id", orderId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return json(200, {
          success: true,
          idempotent: true,
          token_status: existing.status,
          email_sent: Boolean(existing.email_sent_at),
        });
      }

      const token = generateToken();
      const { data: created, error: createError } = await supabase
        .from("redeem_tokens")
        .insert({
          token,
          plan_type: planConfig.type,
          plan_tier: planConfig.tier,
          status: "new",
          buyer_email: email,
          expires_at: getExpiry(planConfig.type),
          cakto_order_id: orderId,
          cakto_ref_id: payload.data?.refId ?? null,
          cakto_product_id: payload.data?.product?.id ?? null,
          cakto_offer_id: payload.data?.offer?.id ?? null,
          cakto_subscription_id: payload.data?.subscription?.id ?? null,
          cakto_event: event,
        })
        .select()
        .single();

      if (createError) throw createError;

      const emailResult = await sendRedeemEmail({
        email,
        name: payload.data?.customer?.name,
        token,
        planType: planConfig.type,
        planTier: planConfig.tier,
      });

      if (emailResult.sent) {
        await supabase
          .from("redeem_tokens")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", created.id);
      }

      return json(200, {
        success: true,
        action: "token_created",
        token_id: created.id,
        email_sent: emailResult.sent,
        email_reason: emailResult.sent ? undefined : emailResult.reason,
      });
    }

    if (["refund", "chargeback", "subscription_canceled"].includes(event)) {
      const lookupIds = getRefundLookupIds(payload);
      const email = normalizeEmail(payload.data?.customer?.email);

      let query = supabase
        .from("redeem_tokens")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (lookupIds.length > 0) {
        query = query.or(
          lookupIds
            .flatMap((id) => [
              `cakto_order_id.eq.${id}`,
              `cakto_ref_id.eq.${id}`,
              `cakto_subscription_id.eq.${id}`,
            ])
            .join(","),
        );
      } else if (email) {
        query = query.eq("buyer_email", email);
      } else {
        return json(400, { error: "Missing order/ref id or customer email for revocation" });
      }

      const { data: matches, error: matchError } = await query;
      if (matchError) throw matchError;

      const token = matches?.[0];
      if (!token) {
        return json(200, { success: true, action: "nothing_to_revoke" });
      }

      const now = new Date().toISOString();
      const { error: tokenError } = await supabase
        .from("redeem_tokens")
        .update({
          status: "revoked",
          revoked_at: now,
          revoked_reason: event,
          cakto_event: event,
        })
        .eq("id", token.id);

      if (tokenError) throw tokenError;

      let subscriptionCanceled = false;
      if (token.used_by_user_id) {
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            ends_at: now,
            updated_at: now,
          })
          .eq("user_id", token.used_by_user_id)
          .eq("status", "active");

        if (subscriptionError) throw subscriptionError;
        subscriptionCanceled = true;
      }

      return json(200, {
        success: true,
        action: "token_revoked",
        subscription_canceled: subscriptionCanceled,
      });
    }

    return json(200, { success: true, ignored: true, event });
  } catch (error) {
    console.error("cakto-premium-webhook error", error);
    return json(500, { error: (error as Error).message });
  }
});
