import type { Metadata } from "next";
import { KitHeroSection } from "@/components/sections/kit-hero-section";
import { PainPointsSection } from "@/components/sections/pain-points-section";
import { SystemSection } from "@/components/sections/system-section";
import { ArsenalSection } from "@/components/sections/arsenal-section";

export const metadata: Metadata = {
  title: "Kit de Aceleração | PqEstudar",
  description:
    "Sistema completo, templates prontos e ferramentas para acelerar resultados na sua carreira.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/kit" },
};

export default function KitPage() {
  return (
    <main className="flex-1">
      <KitHeroSection />
      <PainPointsSection />
      <SystemSection />
      <ArsenalSection />
    </main>
  );
}
