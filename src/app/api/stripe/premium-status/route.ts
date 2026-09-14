import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { PREMIUM_PRODUCT_KEY } from "@/lib/stripe-premium";

export async function GET(request: Request) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  const id = new URL(request.url).searchParams.get("session_id");
  if (!id || !/^cs_[a-zA-Z0-9_]{6,240}$/.test(id)) return reply({ error: "invalid_session" }, 400);
  try {
    const auth = await createServerSupabaseClientWithAuth();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return reply({ status: "login_required" }, 401);
    const { error: accessError } = await auth.rpc("get_effective_subscription");
    if (accessError) throw accessError;
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("product_purchases")
      .select("status, revoked_at, metadata, amount_total, currency")
      .eq("product_key", PREMIUM_PRODUCT_KEY).eq("stripe_checkout_session_id", id).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    const active = data?.status === "paid" && !data.revoked_at && data.amount_total === 5990
      && data.currency === "brl" && !!data.metadata?.verified_price_id;
    return reply({ status: active ? "active" : data?.status === "paid" ? "pending" : data?.status || "pending" });
  } catch {
    return reply({ error: "Não foi possível consultar o pagamento." }, 503);
  }
}
