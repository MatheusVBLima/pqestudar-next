import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { PREMIUM_PRODUCT_KEY, PREMIUM_AMOUNT, premiumPriceId, stripeGet } from "@/lib/stripe-premium";

export const runtime = "nodejs";

const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Não foi possível abrir o checkout agora. Tente novamente em instantes.";

const PRODUCT_CATALOG = {
  [PREMIUM_PRODUCT_KEY]: { name: "PqEstudar Premium", description: "Acesso vitalicio. Pagamento unico, sem mensalidade.", unitAmount: PREMIUM_AMOUNT, currency: "brl" },
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
  return typeof value === "string" && Object.hasOwn(PRODUCT_CATALOG, value);
}

function getSiteUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

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
  const landing = productKey === PREMIUM_PRODUCT_KEY ? "/mbo-premium" : "/certificado-que-conta";
  params.append("success_url", `${siteUrl}${landing}/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${siteUrl}${landing}${productKey === PREMIUM_PRODUCT_KEY ? "?checkout=cancelado#premium" : ""}`);
  params.append("line_items[0][quantity]", "1");
  if (productKey === PREMIUM_PRODUCT_KEY) {
    params.append("line_items[0][price]", premiumPriceId());
    params.append("custom_text[submit][message]", "Use o e-mail da sua conta Google para acessar o Premium depois do pagamento.");
    params.append("metadata[plan_type]", "lifetime");
    params.append("metadata[plan_tier]", "premium");
  } else {
  params.append("line_items[0][price_data][currency]", product.currency);
  params.append("line_items[0][price_data][unit_amount]", String(product.unitAmount));
  params.append("line_items[0][price_data][product_data][name]", product.name);
  params.append("line_items[0][price_data][product_data][description]", product.description);
  }
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
    signal: AbortSignal.timeout(15000),
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
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
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

  if (productKey === PREMIUM_PRODUCT_KEY) {
    const price = await stripeGet(`prices/${encodeURIComponent(premiumPriceId())}`);
    if (!price.active || price.type !== "one_time" || price.currency !== "brl" || price.unit_amount !== PREMIUM_AMOUNT) {
      throw new Error("Premium price does not match the configured offer");
    }
  }
  const auth = await createServerSupabaseClientWithAuth();
  const { data: { user } } = await auth.auth.getUser();
  const siteUrl = getSiteUrl(request);
  const sharedParams: Omit<Parameters<typeof buildCheckoutParams>[0], "paymentMethodTypes"> = {
    productKey,
    siteUrl,
    userId: user?.email_confirmed_at ? user.id : undefined,
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
  } catch {
    console.error("[stripe] Checkout unavailable");
    return NextResponse.json({ error: CHECKOUT_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
}
