import type { Metadata } from "next";
import MeusMateriaisClient from "@/components/pages/MeusMateriaisClient";

export const metadata: Metadata = {
  title: "Meus Materiais | PqEstudar",
  description: "Acesse os materiais disponíveis no seu perfil PqEstudar.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/meus-materiais" },
};

export default function MeusMateriaisPage() {
  return <MeusMateriaisClient />;
}
