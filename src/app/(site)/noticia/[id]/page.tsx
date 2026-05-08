import type { Metadata } from "next";
import NoticiaDetalhesClient from "@/components/pages/NoticiaDetalhesClient";

interface NoticiaPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: NoticiaPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Notícia ${id} | PqEstudar`,
    description: "Detalhes da notícia",
    robots: { index: false, follow: true },
    alternates: { canonical: `/noticia/${id}` },
  };
}

export default function NoticiaDetalhesPage() {
  return <NoticiaDetalhesClient />;
}
