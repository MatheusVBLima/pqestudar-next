import type { Metadata } from "next";
import NoticiasClient from "@/components/pages/NoticiasClient";

export const metadata: Metadata = {
  title: "Notícias | PqEstudar",
  description: "Notícias e atualizações do mundo educacional, concursos e oportunidades.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/noticias" },
};

export default function NoticiasPage() {
  return <NoticiasClient />;
}
