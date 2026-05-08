import type { Metadata } from "next";
import PremiumCoursesClient from "@/components/pages/premium/PremiumCoursesClient";

export const metadata: Metadata = {
  title: "Cursos Premium | PqEstudar",
  description: "Cursos selecionados para assinantes Premium.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/cursos" },
};

export default function PremiumCursosPage() {
  return <PremiumCoursesClient />;
}
