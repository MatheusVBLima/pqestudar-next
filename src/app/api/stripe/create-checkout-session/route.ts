import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "@/lib/supabase-server";

export const runtime = "nodejs";

const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Não foi possível abrir o checkout agora. Tente novamente em instantes.";

const PRODUCT_CATALOG = {
  "certificado-que-conta": {
    name: "Certificado que Conta",
    description: "Acesso à ferramenta de análise de cursos",
    unitAmount: 1990,
    currency: "brl",
  },
} as const;

type ProductKey = keyof typeof PRODUCT_CATALOG;

type StripeCheckoutResponse = {
  url?: string;
  error?: {
    message?: string;
    param?: string;
    code?: string;
    type?: string;
  };
};

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

function buildCheckoutParams({
  productKey,
  siteUrl,
  userId,
  userEmail,
  paymentMethodTypes,
}: {
  productKey: ProductKey;
  siteUrl: string;
  userId?: string;
  userEmail?: string;
  paymentMethodTypes: string[];
}) {
  const product = PRODUCT_CATALOG[productKey];
  const params = new URLSearchParams();

  params.append("mode", "payment");
  params.append("success_url", `${siteUrl}/certificado-que-conta/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${siteUrl}/certificado-que-conta`);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", product.currency);
  params.append("line_items[0][price_data][unit_amount]", String(product.unitAmount));
  params.append("line_items[0][price_data][product_data][name]", product.name);
  params.append("line_items[0][price_data][product_data][description]", product.description);
  params.append("metadata[product_key]", productKey);
  params.append("metadata[source]", "pqestudar-sales-page");

  paymentMethodTypes.forEach((method, index) => {
    params.append(`payment_method_types[${index}]`, method);
  });

  if (userId) {
    params.append("client_reference_id", userId);
    params.append("metadata[user_id]", userId);
  }

  if (userEmail) {
    params.append("customer_email", userEmail);
    params.append("metadata[user_email]", userEmail);
  }

  return params;
}

async function createStripeCheckoutSession({
  stripeSecretKey,
  params,
}: {
  stripeSecretKey: string;
  params: URLSearchParams;
}) {
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await response.json().catch(() => ({}))) as StripeCheckoutResponse;
  return { response, data };
}

function shouldRetryWithoutPix(data: StripeCheckoutResponse) {
  const message = data.error?.message?.toLowerCase() ?? "";
  const param = data.error?.param?.toLowerCase() ?? "";

  return param.includes("payment_method_types") || message.includes("pix");
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.error("[stripe] STRIPE_SECRET_KEY is not configured.");
    return NextResponse.json({ error: CHECKOUT_UNAVAILABLE_MESSAGE }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as { productKey?: string };
  const productKey = body.productKey ?? "certificado-que-conta";

  if (!isProductKey(productKey)) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }

  const { user } = await getServerSession();
  const siteUrl = getSiteUrl(request);
  const sharedParams = {
    productKey,
    siteUrl,
    userId: user?.id,
    userEmail: user?.email,
  };

  const firstAttempt = await createStripeCheckoutSession({
    stripeSecretKey,
    params: buildCheckoutParams({
      ...sharedParams,
      paymentMethodTypes: ["card", "pix"],
    }),
  });

  if (firstAttempt.response.ok && firstAttempt.data.url) {
    return NextResponse.json({ url: firstAttempt.data.url });
  }

  console.error(
    "[stripe] Failed to create checkout session with Pix.",
    firstAttempt.data.error
  );

  if (shouldRetryWithoutPix(firstAttempt.data)) {
    const fallbackAttempt = await createStripeCheckoutSession({
      stripeSecretKey,
      params: buildCheckoutParams({
        ...sharedParams,
        paymentMethodTypes: ["card"],
      }),
    });

    if (fallbackAttempt.response.ok && fallbackAttempt.data.url) {
      return NextResponse.json({ url: fallbackAttempt.data.url, pixUnavailable: true });
    }

    console.error(
      "[stripe] Failed to create checkout session with card fallback.",
      fallbackAttempt.data.error
    );

    return NextResponse.json(
      { error: CHECKOUT_UNAVAILABLE_MESSAGE },
      { status: fallbackAttempt.response.status || 500 }
    );
  }

  return NextResponse.json(
    { error: CHECKOUT_UNAVAILABLE_MESSAGE },
    { status: firstAttempt.response.status || 500 }
  );
}
