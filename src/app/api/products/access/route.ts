import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getServerSession } from "@/lib/supabase-server";

export const runtime = "nodejs";

const PRODUCT_KEYS = new Set(["certificado-que-conta"]);

async function findPaidPurchase(productKey: string, userId: string, email?: string | null) {
  const admin = createSupabaseAdminClient();

  const byUser = await admin
    .from("product_purchases")
    .select("id, product_key, status, customer_email, user_id, updated_at")
    .eq("product_key", productKey)
    .eq("status", "paid")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (byUser.error) {
    throw byUser.error;
  }

  if (byUser.data) {
    return byUser.data;
  }

  if (!email) {
    return null;
  }

  const byEmail = await admin
    .from("product_purchases")
    .select("id, product_key, status, customer_email, user_id, updated_at")
    .eq("product_key", productKey)
    .eq("status", "paid")
    .ilike("customer_email", email)
    .limit(1)
    .maybeSingle();

  if (byEmail.error) {
    throw byEmail.error;
  }

  return byEmail.data ?? null;
}

export async function GET(request: NextRequest) {
  const productKey = request.nextUrl.searchParams.get("productKey") ?? "";

  if (!PRODUCT_KEYS.has(productKey)) {
    return NextResponse.json({ hasAccess: false, reason: "invalid_product" }, { status: 400 });
  }

  const { user } = await getServerSession();

  if (!user) {
    return NextResponse.json({ hasAccess: false, reason: "unauthenticated" }, { status: 401 });
  }

  try {
    const purchase = await findPaidPurchase(productKey, user.id, user.email);

    return NextResponse.json({
      productKey,
      hasAccess: Boolean(purchase),
      purchaseId: purchase?.id ?? null,
      status: purchase?.status ?? null,
    });
  } catch (error) {
    console.error("[product-access] Failed to check product access:", error);
    return NextResponse.json(
      { hasAccess: false, reason: "server_error" },
      { status: 500 }
    );
  }
}
