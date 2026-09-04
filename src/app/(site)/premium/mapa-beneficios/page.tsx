import PremiumBenefitsMapLoader from "@/components/pages/premium/PremiumBenefitsMapLoader";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata = { title: "Mapa de Benefícios | PqEstudar Premium", description: "Encontre benefícios disponíveis na sua região e locais de atendimento.", alternates: { canonical: "/premium/mapa-beneficios" } };

export default async function PremiumBenefitsMapPage() {
  await requireActiveSubscription("/premium/mapa-beneficios");
  return <PremiumBenefitsMapLoader />;
}
