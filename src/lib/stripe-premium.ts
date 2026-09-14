export const PREMIUM_PRODUCT_KEY = "pqestudar-premium-lifetime";
export const PREMIUM_AMOUNT = 5990;
export const PREMIUM_LIVE_PRICE = "price_1UF5gOEfNogJi61paz25os3B";

export function premiumPriceId() {
  // A separate test price may be supplied when using a Stripe sandbox.
  return process.env.STRIPE_PREMIUM_PRICE_ID || PREMIUM_LIVE_PRICE;
}

export async function stripeGet(path: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Stripe lookup failed: ${response.status}`);
  return response.json();
}
