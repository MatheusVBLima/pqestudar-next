import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

type ContactSegment = "all" | "registered" | "standard" | "premium" | "newsletter" | "unsubscribed";
type ContactSource = "registered" | "newsletter" | "purchase" | "premium" | "mixed";

type EmailContact = {
  id: string;
  email: string;
  name: string | null;
  userId: string | null;
  source: ContactSource;
  segments: Array<"registered" | "standard" | "premium" | "newsletter" | "unsubscribed">;
  createdAt: string | null;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

function isActivePremium(subscription: { status?: string | null; ends_at?: string | null }) {
  if (subscription.status !== "active") return false;
  if (!subscription.ends_at) return true;
  return new Date(subscription.ends_at).getTime() > Date.now();
}

function matchesSegment(contact: EmailContact, segment: ContactSegment) {
  if (segment === "all") return true;
  return contact.segments.includes(segment);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Erro desconhecido.";
}

function mergeSource(current: ContactSource, next: ContactSource): ContactSource {
  if (current === next) return current;
  if (current === "mixed") return "mixed";
  return "mixed";
}

function upsertContact(
  contactsByEmail: Map<string, EmailContact>,
  payload: {
    email: string | null | undefined;
    idPrefix: string;
    source: ContactSource;
    segments?: EmailContact["segments"];
    name?: string | null;
    userId?: string | null;
    createdAt?: string | null;
    unsubscribedEmails: Set<string>;
  },
) {
  const email = normalizeEmail(payload.email);
  if (!email) return;

  const existing = contactsByEmail.get(email);
  const segments = [...(payload.segments || [])];
  if (payload.unsubscribedEmails.has(email) && !segments.includes("unsubscribed")) {
    segments.push("unsubscribed");
  }

  if (existing) {
    existing.source = mergeSource(existing.source, payload.source);
    if (payload.name && !existing.name) existing.name = payload.name;
    if (payload.userId && !existing.userId) existing.userId = payload.userId;
    if (payload.createdAt && (!existing.createdAt || payload.createdAt > existing.createdAt)) {
      existing.createdAt = payload.createdAt;
    }
    for (const segment of segments) {
      if (!existing.segments.includes(segment)) existing.segments.push(segment);
    }
    return;
  }

  contactsByEmail.set(email, {
    id: `${payload.idPrefix}:${email}`,
    email,
    name: payload.name || null,
    userId: payload.userId || null,
    source: payload.source,
    segments,
    createdAt: payload.createdAt || null,
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const segment = (searchParams.get("segment") || "all") as ContactSegment;
  const query = normalizeEmail(searchParams.get("q"));

  if (!["all", "registered", "standard", "premium", "newsletter", "unsubscribed"].includes(segment)) {
    return NextResponse.json({ error: "Filtro inválido." }, { status: 400 });
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;

  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "A Central de E-mails precisa da variável SUPABASE_SERVICE_ROLE_KEY no ambiente para listar contatos com segurança.",
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }

  const sourceErrors: string[] = [];

  const [
    { data: newsletterRows, error: newsletterError },
    { data: subscriptionRows, error: subscriptionError },
    { data: unsubscribeRows, error: unsubscribeError },
    { data: purchaseRows, error: purchaseError },
    { data: redeemTokenRows, error: redeemTokenError },
  ] = await Promise.all([
      admin
        .from("newsletter_subscribers")
        .select("email, created_at, source, unsubscribed_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      admin
        .from("subscriptions")
        .select("user_id, status, ends_at, plan_tier, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5000),
      admin.from("email_unsubscribes").select("email, created_at").limit(5000),
      admin
        .from("product_purchases")
        .select("customer_email, customer_name, user_id, status, created_at, updated_at")
        .not("customer_email", "is", null)
        .order("updated_at", { ascending: false })
        .limit(5000),
      admin
        .from("redeem_tokens")
        .select("buyer_email, plan_tier, status, created_at, used_by_user_id")
        .not("buyer_email", "is", null)
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

  if (newsletterError) {
    console.error("[emails] Failed to load newsletter contacts", newsletterError);
    sourceErrors.push("Newsletter: não foi possível ler newsletter_subscribers.");
  }

  if (subscriptionError) {
    console.error("[emails] Failed to load subscriptions", subscriptionError);
    sourceErrors.push("Assinaturas: não foi possível ler subscriptions.");
  }

  if (unsubscribeError) {
    console.error("[emails] Failed to load unsubscribes", unsubscribeError);
    sourceErrors.push("Descadastros: não foi possível ler email_unsubscribes. Rode a migration da Central de E-mails.");
  }

  if (purchaseError) {
    console.error("[emails] Failed to load product purchases", purchaseError);
    sourceErrors.push("Compras: não foi possível ler product_purchases.");
  }

  if (redeemTokenError) {
    console.error("[emails] Failed to load redeem tokens", redeemTokenError);
    sourceErrors.push("Tokens premium: não foi possível ler redeem_tokens.");
  }

  const premiumUserIds = new Set(
    (subscriptionRows || [])
      .filter(isActivePremium)
      .map((row) => row.user_id)
      .filter(Boolean),
  );

  const unsubscribedEmails = new Set((unsubscribeRows || []).map((row) => normalizeEmail(row.email)).filter(Boolean));
  const contactsByEmail = new Map<string, EmailContact>();

  const usersResponse = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersResponse.error) {
    console.error("[emails] Failed to load auth users", usersResponse.error);
    sourceErrors.push("Usuários cadastrados: não foi possível listar usuários do Auth.");
  }

  for (const user of usersResponse.data?.users || []) {
    const email = normalizeEmail(user.email);
    if (!email) continue;

    const isPremium = premiumUserIds.has(user.id);
    const segments: EmailContact["segments"] = ["registered", isPremium ? "premium" : "standard"];
    if (unsubscribedEmails.has(email)) segments.push("unsubscribed");

    upsertContact(contactsByEmail, {
      idPrefix: `user:${user.id}`,
      email,
      name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null,
      userId: user.id,
      source: "registered",
      segments,
      createdAt: user.created_at ?? null,
      unsubscribedEmails,
    });
  }

  for (const row of newsletterRows || []) {
    const email = normalizeEmail(row.email);
    upsertContact(contactsByEmail, {
      idPrefix: "newsletter",
      email: row.email,
      source: "newsletter",
      segments: ["newsletter", ...(row.unsubscribed_at || unsubscribedEmails.has(email) ? ["unsubscribed" as const] : [])],
      createdAt: row.created_at ?? null,
      unsubscribedEmails,
    });
  }

  for (const row of purchaseRows || []) {
    upsertContact(contactsByEmail, {
      idPrefix: "purchase",
      email: row.customer_email,
      name: row.customer_name,
      userId: row.user_id,
      source: "purchase",
      segments: [],
      createdAt: row.updated_at ?? row.created_at ?? null,
      unsubscribedEmails,
    });
  }

  for (const row of redeemTokenRows || []) {
    upsertContact(contactsByEmail, {
      idPrefix: "redeem",
      email: row.buyer_email,
      userId: row.used_by_user_id,
      source: "premium",
      segments: row.status === "used" || row.status === "active" ? ["premium"] : [],
      createdAt: row.created_at ?? null,
      unsubscribedEmails,
    });
  }

  const contacts = Array.from(contactsByEmail.values())
    .filter((contact) => matchesSegment(contact, segment))
    .filter((contact) => !query || contact.email.includes(query) || contact.name?.toLowerCase().includes(query))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 500);

  const counts = Array.from(contactsByEmail.values()).reduce(
    (acc, contact) => {
      acc.all += 1;
      contact.segments.forEach((item) => {
        acc[item] += 1;
      });
      return acc;
    },
    {
      all: 0,
      registered: 0,
      standard: 0,
      premium: 0,
      newsletter: 0,
      unsubscribed: 0,
    },
  );

  return NextResponse.json({ contacts, counts, sourceErrors });
}
