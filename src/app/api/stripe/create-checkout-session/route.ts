import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/supabase-server";

export const runtime = "nodejs";

const PRODUCT_CATALOG = {
  "certificado-que-conta": {
    name: "Certificado que Conta",
    description: "Acesso à ferramenta de análise de cursos",
    unitAmount: 1990,
    currency: "brl",
  },
} as const;

type ProductKey = keyof typeof PRODUCT_CATALOG;

function isProductKey(value: unknown): value is ProductKey {
  return typeof value === "string" && value in PRODUCT_CATALOG;
}

function getSiteUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  return request.nextUrl.origin.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY não configurada no ambiente." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { productKey?: string };
  const productKey = body.productKey ?? "certificado-que-conta";

  if (!isProductKey(productKey)) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }

  const product = PRODUCT_CATALOG[productKey];
  const { user } = await getServerSession();
  const siteUrl = getSiteUrl(request);

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${siteUrl}/certificado-que-conta/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${siteUrl}/certificado-que-conta`);
  params.append("automatic_payment_methods[enabled]", "true");
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", product.currency);
  params.append("line_items[0][price_data][unit_amount]", String(product.unitAmount));
  params.append("line_items[0][price_data][product_data][name]", product.name);
  params.append("line_items[0][price_data][product_data][description]", product.description);
  params.append("metadata[product_key]", productKey);
  params.append("metadata[source]", "pqestudar-sales-page");

  if (user?.id) {
    params.append("client_reference_id", user.id);
    params.append("metadata[user_id]", user.id);
  }

  if (user?.email) {
    params.append("customer_email", user.email);
    params.append("metadata[user_email]", user.email);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };

  if (!response.ok || !data.url) {
    return NextResponse.json(
      { error: data.error?.message ?? "Não foi possível criar o checkout no Stripe." },
      { status: response.status || 500 }
    );
  }

  return NextResponse.json({ url: data.url });
}
