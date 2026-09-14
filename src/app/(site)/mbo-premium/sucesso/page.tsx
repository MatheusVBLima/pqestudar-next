import type { Metadata } from "next";
import PremiumCheckoutResult from "@/components/mbo/PremiumCheckoutResult";

export const metadata: Metadata = { title: "Seu acesso | PqEstudar Premium", robots: { index: false, follow: false } };

export default async function PremiumSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  return <PremiumCheckoutResult sessionId={session_id || ""} />;
}
