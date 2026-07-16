import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type PurchaseStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";

type StripeCheckoutSession = {
  id: string;
  object: "checkout.session";
  amount_total?: number | null;
  currency?: string | null;
  customer?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
  } | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string | undefined> | null;
  payment_intent?: string | null;
  payment_status?: "paid" | "unpaid" | "no_payment_required" | string;
  status?: string | null;
};

type StripeCharge = {
  id: string;
  object: "charge";
  amount?: number | null;
  currency?: string | null;
  customer?: string | null;
  payment_intent?: string | null;
  refunded?: boolean | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeDispute = {
  id: string;
  object: "dispute";
  amount?: number | null;
  currency?: string | null;
  charge?: string | StripeCharge | null;
  payment_intent?: string | null;
  reason?: string | null;
  status?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession | StripeCharge | StripeDispute | Record<string, unknown>;
  };
};

function parseStripeSignature(signatureHeader: string) {
  return Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...value] = part.split("=");
      return [key, value.join("=")];
    })
  );
}

function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;

  const signature = parseStripeSignature(signatureHeader);
  const timestamp = signature.t;
  const receivedSignature = signature.v1;

  if (!timestamp || !receivedSignature) return false;

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) return false;

  const toleranceMs = 5 * 60 * 1000;
  if (Math.abs(Date.now() - timestampMs) > toleranceMs) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(receivedSignature, "hex");

  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isCheckoutSession(value: unknown): value is StripeCheckoutSession {
  return Boolean(value && typeof value === "object" && (value as { object?: unknown }).object === "checkout.session");
}

function isCharge(value: unknown): value is StripeCharge {
  return Boolean(value && typeof value === "object" && (value as { object?: unknown }).object === "charge");
}

function isDispute(value: unknown): value is StripeDispute {
  return Boolean(value && typeof value === "object" && (value as { object?: unknown }).object === "dispute");
}

function statusFromSession(session: StripeCheckoutSession, fallbackStatus: PurchaseStatus) {
  if (session.payment_status === "paid") return "paid";
  return fallbackStatus;
}

async function upsertPurchaseFromSession(session: StripeCheckoutSession, status: PurchaseStatus) {
  const admin = createSupabaseAdminClient();
  const metadata = session.metadata ?? {};
  const productKey = metadata.product_key || "certificado-que-conta";
  const userId = metadata.user_id || session.client_reference_id || null;
  const customerEmail = session.customer_details?.email || session.customer_email || metadata.user_email || null;
  const customerName = session.customer_details?.name || null;
  const incomingStatus = statusFromSession(session, status);

  const { data: existingPurchase, error: existingError } = await admin
    .from("product_purchases")
    .select("status, revoked_at")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const isAlreadyRevoked =
    existingPurchase?.status === "refunded" ||
    existingPurchase?.status === "canceled" ||
    Boolean(existingPurchase?.revoked_at);

  if (isAlreadyRevoked && incomingStatus !== "refunded" && incomingStatus !== "canceled") {
    return;
  }

  const payload = {
    product_key: productKey,
    user_id: userId,
    customer_email: customerEmail,
    customer_name: customerName,
    status: incomingStatus,
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? "brl",
    provider: "stripe",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent ?? null,
    stripe_customer_id: session.customer ?? null,
    metadata: {
      ...metadata,
      stripe_status: session.status ?? null,
      stripe_payment_status: session.payment_status ?? null,
    },
    revoked_at: status === "refunded" || status === "canceled" ? new Date().toISOString() : null,
    revoked_reason: status === "refunded" || status === "canceled" ? status : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("product_purchases")
    .upsert(payload, { onConflict: "stripe_checkout_session_id" });

  if (error) {
    throw error;
  }
}

async function updatePurchaseFromCharge(
  charge: StripeCharge,
  status: Extract<PurchaseStatus, "refunded" | "canceled">,
  revokedReason: "refund" | "dispute"
) {
  const admin = createSupabaseAdminClient();
  const paymentIntentId = charge.payment_intent ?? null;

  if (!paymentIntentId && !charge.id) {
    return;
  }

  const payload = {
    status,
    stripe_charge_id: charge.id,
    revoked_at: new Date().toISOString(),
    revoked_reason: revokedReason,
    metadata: {
      stripe_charge_id: charge.id,
      stripe_charge_refunded: charge.refunded ?? null,
      stripe_event_reason: revokedReason,
    },
    updated_at: new Date().toISOString(),
  };

  const query = admin.from("product_purchases").update(payload);

  const { error } = paymentIntentId
    ? await query.eq("stripe_payment_intent_id", paymentIntentId)
    : await query.eq("stripe_charge_id", charge.id);

  if (error) {
    throw error;
  }
}

async function updatePurchaseFromDispute(dispute: StripeDispute) {
  const admin = createSupabaseAdminClient();
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? null;
  const paymentIntentId = dispute.payment_intent ?? (typeof dispute.charge === "object" ? dispute.charge?.payment_intent : null);

  if (!paymentIntentId && !chargeId) {
    return;
  }

  const payload = {
    status: "canceled" as const,
    stripe_charge_id: chargeId,
    revoked_at: new Date().toISOString(),
    revoked_reason: "dispute",
    metadata: {
      stripe_dispute_id: dispute.id,
      stripe_dispute_status: dispute.status ?? null,
      stripe_dispute_reason: dispute.reason ?? null,
      stripe_charge_id: chargeId,
      stripe_event_reason: "dispute",
    },
    updated_at: new Date().toISOString(),
  };

  const query = admin.from("product_purchases").update(payload);

  const { error } = paymentIntentId
    ? await query.eq("stripe_payment_intent_id", paymentIntentId)
    : await query.eq("stripe_charge_id", chargeId);

  if (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET não configurado no ambiente." },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Assinatura do Stripe inválida." }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  const object = event.data.object;

  if (event.type === "checkout.session.completed" && isCheckoutSession(object)) {
    await upsertPurchaseFromSession(object, "pending");
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.async_payment_succeeded" && isCheckoutSession(object)) {
    await upsertPurchaseFromSession(object, "paid");
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.async_payment_failed" && isCheckoutSession(object)) {
    await upsertPurchaseFromSession(object, "failed");
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.expired" && isCheckoutSession(object)) {
    await upsertPurchaseFromSession(object, "canceled");
    return NextResponse.json({ received: true });
  }

  if (event.type === "charge.refunded" && isCharge(object)) {
    await updatePurchaseFromCharge(object, "refunded", "refund");
    return NextResponse.json({ received: true });
  }

  if (event.type === "charge.dispute.created" && isDispute(object)) {
    await updatePurchaseFromDispute(object);
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true, ignored: true });
}
