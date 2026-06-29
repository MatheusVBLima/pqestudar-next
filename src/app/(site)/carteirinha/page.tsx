import type { Metadata } from "next";
import CarteirinhaLanding from "@/components/pages/CarteirinhaLanding";

export const metadata: Metadata = {
  title: "Carteirinha de Estudante Digital ou Física",
  description:
    "Compare as opções de carteirinha estudantil digital e física e consulte as condições no ambiente parceiro.",
  alternates: { canonical: "/carteirinha" },
  openGraph: {
    title: "Carteirinha de Estudante Digital ou Física | PqEstudar",
    description:
      "Escolha sua modalidade e consulte documentos, prazos e condições antes de solicitar.",
    url: "/carteirinha",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function CarteirinhaPage() {
  return <CarteirinhaLanding />;
}
