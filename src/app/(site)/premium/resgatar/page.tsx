import type { Metadata } from "next";
import PremiumRedeemClient from "@/components/pages/premium/PremiumRedeemClient";

export const metadata: Metadata = {
  title: "Resgatar Token Premium | PqEstudar",
  description: "Resgate seu token de acesso Premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/resgatar" },
};

export default function PremiumRedeemPage() {
  return <PremiumRedeemClient />;
}
