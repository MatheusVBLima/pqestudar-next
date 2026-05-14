import type { Metadata } from "next";
import PremiumSalvosNext from "@/components/pages/premium/PremiumSalvosNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata: Metadata = {
  title: "Salvos Premium | PqEstudar",
  description: "Cursos e vagas que você marcou para acessar depois.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/salvos" },
};

export default async function PremiumSalvosPage() {
  await requireActiveSubscription("/premium/salvos");
  return <PremiumSalvosNext />;
}
