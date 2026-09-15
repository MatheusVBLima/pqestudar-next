import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { buildMercadoPagoOrder, isMercadoPagoCheckoutUrl, mercadoPagoConfig, mercadoPagoFetch, MP_REFERENCE, validateMercadoPagoOrder } from "@/lib/mercado-pago";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Origem inválida." }, 403);
  const body = await request.json().catch(() => null);
  if (!MP_REFERENCE.test(body?.requestId || "")) return reply({ error: "Pedido inválido." }, 400);
  try {
    const config = mercadoPagoConfig();
    const auth = await createServerSupabaseClientWithAuth();
    const { data: { user } } = await auth.auth.getUser();
    if (!user?.email_confirmed_at) return reply({ status: "login_required" }, 401);
    const admin = createSupabaseAdminClient();
    // Verify credentials are for the intended Brazilian seller and environment before creating an order.
    const seller = await mercadoPagoFetch("/users/me");
    if (String(seller.id) !== config.seller || seller.site_id !== "MLB"
      || (seller.tags || []).includes("test_user") === config.live) throw new Error("mp_seller_mismatch");
    const { data: intent, error } = await admin.rpc("prepare_mercado_pago_order", {
      p_reference: body.requestId, p_user: user.id, p_email: user.email,
      p_live: config.live, p_seller: config.seller, p_site: config.site,
    });
    if (error) throw error;
    if (["paid", "refunded", "canceled", "failed"].includes(intent.status)) return reply({ status: "finished", reference: intent.id });
    const order = intent.order_id ? await mercadoPagoFetch(`/v1/orders/${intent.order_id}`)
      : await mercadoPagoFetch("/v1/orders", buildMercadoPagoOrder(intent.id, intent.customer_email, intent.site_url), intent.id);
    validateMercadoPagoOrder(order, intent.id, config.seller, config.live);
    if (!isMercadoPagoCheckoutUrl(order.checkout_url)) throw new Error("mp_invalid_checkout_url");
    const { error: saveError } = await admin.from("mercado_pago_orders").update({ order_id: order.id })
      .eq("id", intent.id).eq("user_id", user.id);
    if (saveError) throw saveError;
    return reply({ url: order.checkout_url });
  } catch {
    console.error("[mercado-pago] Checkout unavailable; check credentials, seller and migration.");
    return reply({ error: "Não foi possível abrir o pagamento. Tente novamente em instantes." }, 503);
  }
}
