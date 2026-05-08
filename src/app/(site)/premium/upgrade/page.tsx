import type { Metadata } from "next";
import PremiumUpgradeClient from "@/components/pages/premium/PremiumUpgradeClient";

export const metadata: Metadata = {
  title: "Upgrade Premium | PqEstudar",
  description: "Faça upgrade para o plano Premium e desbloqueie recursos exclusivos.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/upgrade" },
};

export default function PremiumUpgradePage() {
  return <PremiumUpgradeClient />;
}
