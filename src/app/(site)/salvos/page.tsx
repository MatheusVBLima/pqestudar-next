import type { Metadata } from "next";
import FerramentasSalvosClient from "@/components/pages/FerramentasSalvosClient";

export const metadata: Metadata = {
  title: "Itens Salvos | PqEstudar",
  description: "Acesse todas as ferramentas e concursos que voce salvou.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/salvos" },
};

export default function SalvosPage() {
  return <FerramentasSalvosClient />;
}
