import type { Metadata } from "next";
import RankingComunidadeNext from "@/components/pages/RankingComunidadeNext";

export const metadata: Metadata = {
  title: "Ranking da Comunidade | PqEstudar",
  description:
    "Veja os membros que mais contribuem para enriquecer nossa plataforma educacional. Pontos, contribuições e conquistas em um ranking.",
  alternates: { canonical: "/ranking-comunidade" },
};

export default function RankingComunidadePage() {
  return <RankingComunidadeNext />;
}
