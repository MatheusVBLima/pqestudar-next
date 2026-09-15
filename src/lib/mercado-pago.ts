import { createHmac, timingSafeEqual } from "node:crypto";

export const MP_PRODUCT_KEY = "pqestudar-premium-lifetime";
export const MP_AMOUNT = "59.90";
export const MP_ORDER_ID = /^ORD[A-Z0-9]{10,60}$/;
export const MP_REFERENCE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export function mercadoPagoConfig() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const seller = process.env.MERCADO_PAGO_SELLER_ID;
  const mode = process.env.MERCADO_PAGO_MODE;
  const site = new URL(process.env.MERCADO_PAGO_SITE_URL || "https://www.pqestudar.com.br");
  if (!token || !secret || !/^\d+$/.test(seller || "") || !["test", "live"].includes(mode || "")
    || site.protocol !== "https:" || site.username || site.password) throw new Error("mp_not_configured");
  return { token, secret, seller, live: mode === "live", site: site.origin };
}

export function isMercadoPagoCheckoutUrl(value: unknown): value is string {
  try {
    if (typeof value !== "string") return false;
    const url = new URL(value);
    return url.protocol === "https:" && ["www.mercadopago.com.br", "sandbox.mercadopago.com.br"].includes(url.hostname)
      && !url.username && !url.password && !url.port && url.pathname.startsWith("/checkout/");
  } catch { return false; }
}

export function buildMercadoPagoOrder(reference: string, email: string, site: string) {
  const back = `${site}/mbo-premium/sucesso?provider=mercadopago&reference=${reference}`;
  return {
    type: "online", processing_mode: "manual", total_amount: MP_AMOUNT,
    external_reference: reference, expiration_time: "P1D", payer: { email },
    items: [{ external_code: MP_PRODUCT_KEY, title: "PqEstudar Premium — Acesso vitalício",
      description: "Mapa dos Benefícios Ocultos. Compra única, sem mensalidade.", quantity: 1, unit_price: MP_AMOUNT }],
    config: { notification_url: `${site}/api/mercado-pago/webhook`,
      online: { success_url: back, pending_url: back, failure_url: back, auto_return: "approved" } },
  };
}

export async function mercadoPagoFetch(path: string, body?: unknown, idempotencyKey?: string) {
  const { token } = mercadoPagoConfig();
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`mp_api_${response.status}`);
  return response.json();
}

export function verifyMercadoPagoSignature(request: Request, secret: string) {
  const id = new URL(request.url).searchParams.get("data.id");
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature") || "";
  const ts = signature.match(/(?:^|,)\s*ts=(\d+)\s*(?:,|$)/)?.[1];
  const hash = signature.match(/(?:^|,)\s*v1=([a-f0-9]{64})\s*(?:,|$)/)?.[1];
  if (!secret || !id || !MP_ORDER_ID.test(id.toUpperCase()) || !requestId || !ts || !hash) return false;
  // IDs in the signed manifest are lowercase, per the Mercado Pago HMAC specification.
  // Retries can arrive much later; replay safety is enforced by database state transitions.
  const expected = createHmac("sha256", secret).update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`).digest();
  return timingSafeEqual(expected, Buffer.from(hash, "hex"));
}

type Payment = { status?: string; status_detail?: string; amount?: string; paid_amount?: string };
export type MercadoPagoOrder = {
  id: string; type?: string; external_reference?: string; user_id?: string | number;
  currency?: string; country_code?: string; total_amount?: string; total_paid_amount?: string;
  status?: string; status_detail?: string; last_updated_date?: string;
  items?: { external_code: string; quantity: number; unit_price: string }[];
  transactions?: { payments?: Payment[] };
};

export function moneyCents(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,9}(\.\d{1,2})?$/.test(value)) return -1;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function validateMercadoPagoOrder(order: MercadoPagoOrder, reference: string, seller: string, live: boolean) {
  if (!MP_ORDER_ID.test(order.id || "") || order.id.startsWith("ORDTST") === live
    || order.type !== "online" || order.external_reference !== reference || String(order.user_id) !== seller
    || order.currency !== "BRL" || order.country_code !== "BR" || moneyCents(order.total_amount) !== 5990
    || order.items?.length !== 1 || order.items[0].external_code !== MP_PRODUCT_KEY
    || order.items[0].quantity !== 1 || moneyCents(order.items[0].unit_price) !== 5990) throw new Error("mp_order_mismatch");
}

export function mercadoPagoOrderStatus(order: MercadoPagoOrder) {
  const payments = order.transactions?.payments || [];
  const states = [order.status, order.status_detail, ...payments.flatMap(p => [p.status, p.status_detail])];
  if (states.some(s => ["refunded", "partially_refunded"].includes(s))) return "refunded";
  if (states.some(s => ["charged_back", "chargeback", "in_mediation", "canceled", "expired"].includes(s))) return "canceled";
  if (order.status === "processed" && order.status_detail === "accredited"
    && moneyCents(order.total_paid_amount) >= 5990 && payments.length > 0
    && payments.every(p => p.status === "processed" && p.status_detail === "accredited")
    && payments.reduce((sum, p) => sum + moneyCents(p.amount), 0) === 5990) return "paid";
  if (order.status === "failed") return "failed";
  return "pending";
}
