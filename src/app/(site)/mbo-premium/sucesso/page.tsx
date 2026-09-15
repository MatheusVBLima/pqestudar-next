import type { Metadata } from "next";
import PremiumCheckoutResult from "@/components/mbo/PremiumCheckoutResult";

export const metadata: Metadata = { title: "Seu acesso | PqEstudar Premium", robots: { index: false, follow: false } };

export default async function PremiumSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string; provider?: string; reference?: string }> }) {
  const { session_id, provider, reference } = await searchParams;
  return <PremiumCheckoutResult sessionId={provider === "mercadopago" ? reference || "" : session_id || ""} provider={provider === "mercadopago" ? "mercadopago" : "stripe"} />;
}
