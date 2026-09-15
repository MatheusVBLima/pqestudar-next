import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { MP_REFERENCE } from "@/lib/mercado-pago";
import { syncMercadoPagoOrder } from "@/lib/mercado-pago-fulfillment";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const reference = new URL(request.url).searchParams.get("reference");
  if (!MP_REFERENCE.test(reference || "")) return reply({ error: "invalid_reference" }, 400);
  try {
    const auth = await createServerSupabaseClientWithAuth();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return reply({ status: "login_required" }, 401);
    const admin = createSupabaseAdminClient();
    const read = () => admin.from("mercado_pago_orders").select("status,live_mode,order_id,revoked_at,last_synced_at")
      .eq("id", reference).eq("user_id", user.id).maybeSingle();
    let { data, error } = await read();
    if (error) throw error;
    if (!data) return reply({ error: "not_found" }, 404);
    if (data.order_id && (!data.last_synced_at || Date.now() - Date.parse(data.last_synced_at) > 15000)) {
      await syncMercadoPagoOrder(data.order_id);
      ({ data, error } = await read());
      if (error) throw error;
    }
    return reply({ status: data.status === "paid" && !data.revoked_at ? (data.live_mode ? "active" : "test_paid") : data.status });
  } catch {
    return reply({ error: "Não foi possível consultar o pagamento." }, 503);
  }
}
