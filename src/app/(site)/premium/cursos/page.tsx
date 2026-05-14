import type { Metadata } from "next";
import PremiumCursosNext from "@/components/pages/premium/PremiumCursosNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

export const metadata: Metadata = {
  title: "Cursos Premium | PqEstudar",
  description: "Curadoria de cursos gratuitos e premium escolhidos a dedo para acelerar seu aprendizado.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/premium/cursos" },
};

export default async function PremiumCursosPage() {
  await requireActiveSubscription("/premium/cursos");
  return <PremiumCursosNext />;
}
