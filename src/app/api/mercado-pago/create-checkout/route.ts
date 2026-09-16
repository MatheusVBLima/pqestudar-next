import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { buildMercadoPagoOrder, isMercadoPagoCheckoutUrl, mercadoPagoConfig, mercadoPagoFetch, MP_REFERENCE, validateMercadoPagoOrder } from "@/lib/mercado-pago";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Origem inválida." }, 403);
  const body = await request.json().catch(() => null);
  if (!MP_REFERENCE.test(body?.requestId || "")) return reply({ error: "Pedido inválido." }, 400);
  let stage = "configuration";
  try {
    const config = mercadoPagoConfig();
    stage = "authentication";
    const auth = await createServerSupabaseClientWithAuth();
    const { data: { user } } = await auth.auth.getUser();
    if (!user?.email_confirmed_at) return reply({ status: "login_required" }, 401);
    stage = "database_client";
    const admin = createSupabaseAdminClient();
    // Verify credentials are for the intended Brazilian seller and environment before creating an order.
    stage = "seller_lookup";
    const seller = await mercadoPagoFetch("/users/me");
    stage = "seller_validation";
    if (String(seller.id) !== config.seller || seller.site_id !== "MLB"
      || (seller.tags || []).includes("test_user") === config.live) throw new Error("mp_seller_mismatch");
    stage = "prepare_order";
    const { data: intent, error } = await admin.rpc("prepare_mercado_pago_order", {
      p_reference: body.requestId, p_user: user.id, p_email: user.email,
      p_live: config.live, p_seller: config.seller, p_site: config.site,
    });
    if (error) throw error;
    if (["paid", "refunded", "canceled", "failed"].includes(intent.status)) return reply({ status: "finished", reference: intent.id });
    stage = "provider_order";
    const order = intent.order_id ? await mercadoPagoFetch(`/v1/orders/${intent.order_id}`)
      : await mercadoPagoFetch("/v1/orders", buildMercadoPagoOrder(intent.id, intent.customer_email, intent.site_url), intent.id);
    stage = "order_validation";
    validateMercadoPagoOrder(order, intent.id, config.seller, config.live);
    if (!isMercadoPagoCheckoutUrl(order.checkout_url)) throw new Error("mp_invalid_checkout_url");
    stage = "save_order";
    const { error: saveError } = await admin.from("mercado_pago_orders").update({ order_id: order.id })
      .eq("id", intent.id).eq("user_id", user.id);
    if (saveError) throw saveError;
    return reply({ url: order.checkout_url });
  } catch (error) {
    // Only allow known application codes or database SQLSTATE codes into logs.
    // Never log raw errors, credentials, request bodies or provider responses.
    const known = new Set(["mp_not_configured", "mp_seller_mismatch", "mp_invalid_checkout_url",
      "mp_order_mismatch", "invalid_checkout_owner", "checkout_owner_mismatch", "checkout_expired", "checkout_rate_limit"]);
    const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
    const dbCode = error && typeof error === "object" && "code" in error ? error.code : null;
    const code = known.has(message) || /^mp_api_[1-5]\d{2}$/.test(message) ? message
      : typeof dbCode === "string" && /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(dbCode) ? dbCode : "unexpected_error";
    console.error("[mercado-pago] Checkout failed", { stage, code });
    return reply({ error: "Não foi possível abrir o pagamento. Tente novamente em instantes." }, 503);
  }
}
