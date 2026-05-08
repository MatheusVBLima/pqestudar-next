import type { Metadata } from "next";
import MapaDosBeneficios from "@/legacy-pages/MapaDosBeneficios";

export const metadata: Metadata = {
  title: "Oferta Especial: O Mapa dos Benefícios Ocultos | PqEstudar",
  description:
    "Descubra mais de 50 benefícios, auxílios e direitos que você pode ter acesso agora. Guia completo com passo a passo para cada programa do governo.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/mapa-dos-beneficios" },
};

export default function MapaDosBeneficiosPage() {
  return <MapaDosBeneficios />;
}
