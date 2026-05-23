import type { Metadata } from "next";
import AssineNext from "@/components/pages/AssineNext";

export const metadata: Metadata = {
  title: "Assine — PqEstudar",
  description:
    "Junte-se a mais de 500 mil pessoas e tenha acesso em primeira mão aos benefícios, truques de sistema e IAs que eu só compartilho por e-mail.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/assine" },
};

export default function AssinePage() {
  return <AssineNext />;
}
