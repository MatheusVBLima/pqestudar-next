import type { Metadata } from "next";
import MeuPerfilClient from "@/components/pages/MeuPerfilClient";

export const metadata: Metadata = {
  title: "Meu Perfil | PqEstudar",
  description: "Gerencie seu perfil, conquistas e configurações de conta.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/meu-perfil" },
};

export default function MeuPerfilPage() {
  return <MeuPerfilClient />;
}
