import type { Metadata } from "next";
import MboPremiumLanding from "@/components/mbo/MboPremiumLanding";

export const metadata: Metadata = {
  title: "MBO Premium | Mapa dos Benefícios Ocultos",
  description: "Explore uma amostra de benefícios, consulte fontes oficiais e organize seus próximos passos. Conheça o Mapa dos Benefícios Ocultos do PqEstudar.",
  alternates: { canonical: "/mbo-premium" },
};

export default function MboPremiumPage() {
  return <MboPremiumLanding />;
}
