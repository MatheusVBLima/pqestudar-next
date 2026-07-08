import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

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

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession | Record<string, unknown>;
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

function statusFromSession(session: StripeCheckoutSession, fallbackStatus: "pending" | "paid" | "failed") {
  if (session.payment_status === "paid") return "paid";
  return fallbackStatus;
}

async function upsertPurchaseFromSession(
  session: StripeCheckoutSession,
  status: "pending" | "paid" | "failed"
) {
  const admin = createSupabaseAdminClient();
  const metadata = session.metadata ?? {};
  const productKey = metadata.product_key || "certificado-que-conta";
  const userId = metadata.user_id || session.client_reference_id || null;
  const customerEmail = session.customer_details?.email || session.customer_email || metadata.user_email || null;
  const customerName = session.customer_details?.name || null;

  const payload = {
    product_key: productKey,
    user_id: userId,
    customer_email: customerEmail,
    customer_name: customerName,
    status: statusFromSession(session, status),
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
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("product_purchases")
    .upsert(payload, { onConflict: "stripe_checkout_session_id" });

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

  if (!isCheckoutSession(object)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (event.type === "checkout.session.completed") {
    await upsertPurchaseFromSession(object, "pending");
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    await upsertPurchaseFromSession(object, "paid");
  }

  if (event.type === "checkout.session.async_payment_failed") {
    await upsertPurchaseFromSession(object, "failed");
  }

  return NextResponse.json({ received: true });
}
