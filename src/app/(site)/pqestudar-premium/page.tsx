import type { Metadata } from "next";
import PqEstudarPremiumLanding from "@/components/pages/PqEstudarPremiumLanding";

export const metadata: Metadata = {
  title: "PqEstudar Premium | Beneficios, cursos e vagas em um so lugar",
  description:
    "Entre no PqEstudar Premium e receba curadoria de beneficios, cursos e vagas para avancar com mais clareza.",
  alternates: { canonical: "/pqestudar-premium" },
};

export default function PqEstudarPremiumPage() {
  return <PqEstudarPremiumLanding />;
}
