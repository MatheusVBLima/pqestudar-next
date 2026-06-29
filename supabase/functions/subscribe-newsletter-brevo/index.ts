import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const ALLOWED_ORIGINS = [
  "https://pqestudar.com.br",
  "https://www.pqestudar.com.br",
  "https://pqestudar-prototipo.lovable.app",
  "http://localhost:3000",
];

const LOVABLE_PREVIEW_REGEX = /^https:\/\/([a-z0-9-]+\.)?lovable\.app$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SHORT_WINDOW_MIN = 15;
const SHORT_WINDOW_MAX = 5;
const DAILY_CAP = 20;

interface SubscribeRequest {
  email: string;
  consent: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  pageSlug?: string;
  resendWelcome?: boolean;
  website?: string;
}

type Utms = Pick<
  SubscribeRequest,
  "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "utmTerm"
>;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = Boolean(
    origin && (ALLOWED_ORIGINS.includes(origin) || LOVABLE_PREVIEW_REGEX.test(origin)),
  );

  return {
    "Access-Control-Allow-Origin": allowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 255 && EMAIL_REGEX.test(value);
}

async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

async function logEvent(
  supabase: any,
  eventType: string,
  emailHash: string,
  ipHash: string,
  utms: Utms,
  pageSlug?: string,
  errorMessage?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("newsletter_events").insert({
    event_type: eventType,
    email_hash: emailHash,
    ip_hash: ipHash,
    page_slug: pageSlug,
    utm_source: utms.utmSource,
    utm_medium: utms.utmMedium,
    utm_campaign: utms.utmCampaign,
    utm_content: utms.utmContent,
    utm_term: utms.utmTerm,
    error_message: errorMessage,
    metadata: metadata ?? null,
  });

  if (error) console.error(`newsletter event insert failed: ${error.code}`);
}

async function checkRateLimit(
  supabase: any,
  ipHash: string,
): Promise<{ ok: boolean; reason?: string }> {
  const shortStart = new Date(Date.now() - SHORT_WINDOW_MIN * 60_000).toISOString();
  const dayStart = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const { data: shortRow } = await supabase
    .from("newsletter_rate_limit")
    .select("id, attempts")
    .eq("ip_hash", ipHash)
    .gte("window_start", shortStart)
    .order("window_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (shortRow?.attempts >= SHORT_WINDOW_MAX) {
    return { ok: false, reason: "short_window" };
  }

  const { data: dayRows } = await supabase
    .from("newsletter_rate_limit")
    .select("attempts")
    .eq("ip_hash", ipHash)
    .gte("window_start", dayStart);

  const dailyAttempts = (dayRows ?? []).reduce(
    (total: number, row: { attempts?: number }) => total + (row.attempts ?? 0),
    0,
  );

  if (dailyAttempts >= DAILY_CAP) return { ok: false, reason: "daily_cap" };

  if (shortRow) {
    await supabase
      .from("newsletter_rate_limit")
      .update({ attempts: shortRow.attempts + 1 })
      .eq("id", shortRow.id);
  } else {
    await supabase.from("newsletter_rate_limit").insert({
      ip_hash: ipHash,
      attempts: 1,
      window_start: new Date().toISOString(),
    });
  }

  return { ok: true };
}

async function captureSubscriber(
  supabase: any,
  email: string,
  pageSlug: string | undefined,
  utms: Utms,
): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      {
        email,
        sync_status: "pending",
        sync_error: null,
        consent_at: now,
        last_sync_attempt_at: now,
        source: "site",
        page_slug: pageSlug || "homepage",
        utm_source: utms.utmSource,
        utm_medium: utms.utmMedium,
        utm_campaign: utms.utmCampaign,
        utm_content: utms.utmContent,
        utm_term: utms.utmTerm,
        unsubscribed_at: null,
      },
      { onConflict: "email" },
    )
    .select("id, sync_attempts")
    .single();

  if (error || !data) {
    console.error(`subscriber capture failed: ${error?.code ?? "unknown"}`);
    throw new Error("Não foi possível salvar o cadastro");
  }

  const { error: attemptError } = await supabase
    .from("newsletter_subscribers")
    .update({ sync_attempts: (data.sync_attempts ?? 0) + 1 })
    .eq("id", data.id);

  if (attemptError) console.error(`subscriber attempt update failed: ${attemptError.code}`);
}

async function setSyncState(
  supabase: any,
  email: string,
  status: "synced" | "failed",
  errorMessage: string | null = null,
): Promise<void> {
  const patch: Record<string, unknown> = {
    sync_status: status,
    sync_error: errorMessage,
    last_sync_attempt_at: new Date().toISOString(),
  };

  if (status === "synced") patch.brevo_synced_at = new Date().toISOString();

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update(patch)
    .eq("email", email);

  if (error) console.error(`subscriber sync state update failed: ${error.code}`);
}

serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);

  let supabase: any;
  let capturedEmail: string | null = null;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let body: SubscribeRequest;
    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400, headers);
    }

    if (body.website?.trim()) {
      return json({ success: true, message: "Inscrição recebida." }, 200, headers);
    }

    if (!body.consent) return json({ error: "Consentimento é obrigatório" }, 400, headers);

    const normalizedEmail = body.email?.trim().toLowerCase();
    if (!validEmail(normalizedEmail)) return json({ error: "E-mail inválido" }, 400, headers);

    const emailHash = await hash(normalizedEmail);
    const ipHash = await hash(clientIp(req));
    const utms: Utms = {
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      utmTerm: body.utmTerm,
    };

    const rateLimit = await checkRateLimit(supabase, ipHash);
    if (!rateLimit.ok) {
      await logEvent(
        supabase,
        "newsletter_error",
        emailHash,
        ipHash,
        utms,
        body.pageSlug,
        `Rate limit: ${rateLimit.reason}`,
      );
      return json({ error: "Muitas tentativas. Tente novamente mais tarde." }, 429, headers);
    }

    await logEvent(supabase, "newsletter_submit", emailHash, ipHash, utms, body.pageSlug);

    // Critical ordering: persist the recoverable address before calling Brevo.
    await captureSubscriber(supabase, normalizedEmail, body.pageSlug, utms);
    capturedEmail = normalizedEmail;

    const { data: config, error: configError } = await supabase
      .from("brevo_config")
      .select("default_list_id, opt_in_mode, success_message_doi, success_message_single, error_message_already_subscribed")
      .single();

    if (configError || !config) throw new Error("Configuração da Brevo não encontrada");

    const listId = Number.parseInt(config.default_list_id, 10);
    if (!Number.isInteger(listId)) throw new Error("Lista da Brevo inválida");

    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) throw new Error("BREVO_API_KEY não configurada");

    const brevoUrl = "https://api.brevo.com/v3/contacts";
    const brevoHeaders = {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
      "user-agent": "pqestudar-edge/2.0 (+https://pqestudar.com.br)",
    };

    const contactResponse = await fetch(
      `${brevoUrl}/${encodeURIComponent(normalizedEmail)}`,
      { method: "GET", headers: brevoHeaders },
    );

    if (contactResponse.ok) {
      const contact = await contactResponse.json();
      if (Array.isArray(contact.listIds) && contact.listIds.includes(listId)) {
        await setSyncState(supabase, normalizedEmail, "synced");
        await logEvent(
          supabase,
          "newsletter_already_subscribed",
          emailHash,
          ipHash,
          utms,
          body.pageSlug,
        );
        return json(
          {
            success: true,
            alreadySubscribed: true,
            message: config.error_message_already_subscribed,
          },
          200,
          headers,
        );
      }
    }

    const attributes: Record<string, string> = {
      SOURCE: "site",
      PAGE_SLUG: body.pageSlug || "homepage",
    };
    if (body.utmSource) attributes.UTM_SOURCE = body.utmSource;
    if (body.utmMedium) attributes.UTM_MEDIUM = body.utmMedium;
    if (body.utmCampaign) attributes.UTM_CAMPAIGN = body.utmCampaign;
    if (body.utmContent) attributes.UTM_CONTENT = body.utmContent;
    if (body.utmTerm) attributes.UTM_TERM = body.utmTerm;

    const brevoResponse = await fetch(brevoUrl, {
      method: "POST",
      headers: brevoHeaders,
      body: JSON.stringify({
        email: normalizedEmail,
        attributes,
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!brevoResponse.ok) {
      let providerCode = "unknown";
      try {
        const providerError = await brevoResponse.json();
        providerCode = String(providerError?.code || "unknown").slice(0, 80);
      } catch {
        // Never persist or log the raw provider response because it can contain PII.
      }

      const safeError = `Brevo ${brevoResponse.status} ${providerCode}`;
      await setSyncState(supabase, normalizedEmail, "failed", safeError);
      await logEvent(
        supabase,
        "newsletter_error",
        emailHash,
        ipHash,
        utms,
        body.pageSlug,
        safeError,
      );
      return json(
        { error: "Cadastro salvo, mas a sincronização com a Brevo falhou." },
        502,
        headers,
      );
    }

    await setSyncState(supabase, normalizedEmail, "synced");
    await logEvent(
      supabase,
      "newsletter_subscribed",
      emailHash,
      ipHash,
      utms,
      body.pageSlug,
      undefined,
      { brevoStatus: brevoResponse.status, listId },
    );

    const requiresConfirmation = config.opt_in_mode === "double_opt_in";
    return json(
      {
        success: true,
        requiresConfirmation,
        message: requiresConfirmation
          ? config.success_message_doi
          : config.success_message_single,
      },
      200,
      headers,
    );
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`subscribe-newsletter-brevo failed: ${safeMessage}`);

    if (supabase && capturedEmail) {
      await setSyncState(supabase, capturedEmail, "failed", safeMessage.slice(0, 200));
    }

    return json({ error: "Erro ao processar inscrição" }, 500, headers);
  }
});
