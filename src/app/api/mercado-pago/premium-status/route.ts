import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { MP_REFERENCE } from "@/lib/mercado-pago";
import { syncMercadoPagoOrder } from "@/lib/mercado-pago-fulfillment";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const reference = new URL(request.url).searchParams.get("reference");
  if (!MP_REFERENCE.test(reference || "")) return reply({ error: "invalid_reference" }, 400);
  let stage = "authentication";
  try {
    const auth = await createServerSupabaseClientWithAuth();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return reply({ status: "login_required" }, 401);
    stage = "database_client";
    const admin = createSupabaseAdminClient();
    const read = () => admin.from("mercado_pago_orders").select("status,live_mode,order_id,revoked_at,last_synced_at")
      .eq("id", reference).eq("user_id", user.id).maybeSingle();
    stage = "read_order";
    let { data, error } = await read();
    if (error) throw error;
    if (!data) return reply({ error: "not_found" }, 404);
    if (data.order_id && (!data.last_synced_at || Date.now() - Date.parse(data.last_synced_at) > 15000)) {
      stage = "sync_order";
      await syncMercadoPagoOrder(data.order_id);
      stage = "read_updated_order";
      ({ data, error } = await read());
      if (error) throw error;
    }
    return reply({ status: data.status === "paid" && !data.revoked_at ? (data.live_mode ? "active" : "test_paid") : data.status });
  } catch (error) {
    // Fixed categories only: never log raw errors, references, headers or credentials.
    const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
    const dbCode = error && typeof error === "object" && "code" in error ? error.code : null;
    const known = new Set(["mp_not_configured", "invalid_order", "mp_order_mismatch", "mp_intent_mismatch", "mp_missing_order_date"]);
    const code = known.has(message) || /^mp_api_[1-5]\d{2}$/.test(message) ? message
      : typeof dbCode === "string" && /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(dbCode) ? dbCode : "unexpected_error";
    const reason = /invalid api key/i.test(message) ? "invalid_api_key"
      : /invalid.*jwt|jwt.*expired/i.test(message) ? "invalid_jwt"
      : /permission denied/i.test(message) ? "permission_denied"
      : /fetch failed|network/i.test(message) ? "connection_failed"
      : /schema cache|could not find.*function/i.test(message) ? "schema_or_rpc_missing"
      : "unclassified";
    const environment = ["preview", "production", "development"].includes(process.env.VERCEL_ENV || "") ? process.env.VERCEL_ENV : "unknown";
    console.error("[mercado-pago] Premium status failed", JSON.stringify({ stage, code, reason, environment }));
    return reply({ error: "Não foi possível consultar o pagamento." }, 503);
  }
}
