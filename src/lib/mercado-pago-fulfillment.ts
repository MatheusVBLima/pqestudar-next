import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { mercadoPagoConfig, mercadoPagoFetch, mercadoPagoOrderStatus, MP_ORDER_ID, MP_REFERENCE, validateMercadoPagoOrder } from "@/lib/mercado-pago";

export async function syncMercadoPagoOrder(id: string) {
  if (!MP_ORDER_ID.test(id)) throw new Error("invalid_order");
  const config = mercadoPagoConfig();
  const order = await mercadoPagoFetch(`/v1/orders/${id}`);
  if (order.id !== id || !MP_REFERENCE.test(order.external_reference || "")) throw new Error("mp_order_mismatch");
  const admin = createSupabaseAdminClient();
  const { data: intent, error } = await admin.from("mercado_pago_orders").select("id,order_id,live_mode,seller_id")
    .eq("id", order.external_reference).maybeSingle();
  if (error) throw error;
  if (!intent) return; // Another product/application under the same seller.
  if (intent.live_mode !== config.live || intent.seller_id !== config.seller
    || (intent.order_id && intent.order_id !== id)) throw new Error("mp_intent_mismatch");
  validateMercadoPagoOrder(order, intent.id, config.seller, config.live);
  if (!order.last_updated_date || !Number.isFinite(Date.parse(order.last_updated_date))) throw new Error("mp_missing_order_date");
  const { error: saveError } = await admin.rpc("record_mercado_pago_order", {
    p_reference: intent.id, p_order_id: id, p_status: mercadoPagoOrderStatus(order),
    p_updated_at: order.last_updated_date,
  });
  if (saveError) throw saveError;
}
