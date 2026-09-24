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
    // Orders notifications are configured in the application Webhooks panel.
    config: {
      online: { success_url: back, pending_url: back, failure_url: back, auto_return: "approved" } },
  };
}

// Select diagnostic fields only; never print the complete provider response.
export function mercadoPagoErrorDetails(payload: unknown, requestBody?: unknown) {
  const hidden = Object.entries(process.env)
    .filter(([key]) => /TOKEN|SECRET|KEY|SELLER_ID/.test(key))
    .map(([, value]) => value).filter((value): value is string => !!value);
  const collect = (value: unknown): void => {
    if (typeof value === "string" && value.length >= 3) hidden.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  collect(requestBody);
  const clean = (value: unknown) => {
    if (typeof value !== "string" && typeof value !== "number") return undefined;
    let text = String(value);
    for (const secret of hidden.sort((a, b) => b.length - a.length)) text = text.split(secret).join("[redacted]");
    return text.replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:APP_USR|TEST)-[\w-]+|Bearer\s+\S+|\b\d{6,}\b/gi, "[redacted]")
      .replace(/[\r\n\t\x00-\x1f\x7f]/g, " ").slice(0, 400);
  };
  const fields = (value: unknown) => {
    if (!value || typeof value !== "object") return {};
    const record = value as Record<string, unknown>;
    return Object.fromEntries(["code", "error", "message", "description"].flatMap(key => {
      const text = clean(record[key]);
      return text === undefined ? [] : [[key, text]];
    }));
  };
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const causes = [record.cause, record.errors].flatMap(value => Array.isArray(value) ? value : []).slice(0, 5).map(fields);
  return { ...fields(record), causes };
}

export async function mercadoPagoFetch(path: string, body?: unknown, idempotencyKey?: string) {
  const { token } = mercadoPagoConfig();
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    let payload: unknown;
    try { payload = await response.json(); } catch { /* HTML/empty errors have no safe diagnostic fields. */ }
    console.error("[mercado-pago] API rejected request", JSON.stringify({
      status: response.status,
      operation: path === "/users/me" ? "seller_lookup" : body ? "create_order" : "get_order",
      details: mercadoPagoErrorDetails(payload, body),
    }, null, 2));
    throw new Error(`mp_api_${response.status}`);
  }
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
  const checks = {
    id: MP_ORDER_ID.test(order.id || ""),
    environment: typeof order.id === "string" && order.id.startsWith("ORDTST") !== live,
    type: order.type === "online",
    external_reference: order.external_reference === reference,
    seller: String(order.user_id) === seller,
    currency: order.currency === "BRL",
    country_code: order.country_code === "BRA" || order.country_code === "BR",
    total_amount: moneyCents(order.total_amount) === 5990,
    items_count: order.items?.length === 1,
    product: order.items?.[0]?.external_code === MP_PRODUCT_KEY,
    quantity: order.items?.[0]?.quantity === 1,
    unit_price: moneyCents(order.items?.[0]?.unit_price) === 5990,
  };
  const failedFields = Object.entries(checks).filter(([, valid]) => !valid).map(([field]) => field);
  if (failedFields.length) {
    // Field names only: no order identifiers, payer data or raw provider response.
    console.error("[mercado-pago] Order validation failed", JSON.stringify({ failedFields }));
    throw new Error("mp_order_mismatch");
  }
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
