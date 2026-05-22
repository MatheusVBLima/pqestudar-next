import PremiumBeneficiosNext from "@/components/pages/premium/PremiumBeneficiosNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata = {
  title: "Benefícios Premium | PqEstudar",
  description: "Benefícios, vantagens e recursos selecionados para assinantes premium.",
  alternates: { canonical: "/premium/beneficios" },
};

export default async function PremiumBeneficiosPage() {
  await requireActiveSubscription("/premium/beneficios");
  return <PremiumBeneficiosNext />;
}
