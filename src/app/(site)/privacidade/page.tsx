import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import PrivacidadeNext from "@/components/pages/PrivacidadeNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getLegalPage } from "@/lib/data/legal";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/privacidade");

  return {
    title: data?.title_tag ?? "Política de Privacidade e LGPD | PqEstudar",
    description:
      data?.meta_description ??
      "Entenda como o PqEstudar coleta, usa e protege seus dados conforme a LGPD. Transparência, segurança e controle para você.",
    alternates: { canonical: "/privacidade" },
  };
}

function buildJsonLd(updatedAt: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": ["WebPage", "PrivacyPolicy"],
    "@id": "https://pqestudar.com.br/privacidade",
    name: "Política de Privacidade – PqEstudar",
    description: "Transparência e proteção dos seus dados pessoais.",
    publisher: { "@type": "Organization", name: "PqEstudar" },
    dateModified: updatedAt ?? "2025-10-28",
  };
}

export default async function PrivacidadePage() {
  const queryClient = createQueryClient();

  const [pageSettings, legal] = await Promise.all([
    getPageSettings("/privacidade"),
    getLegalPage("/privacidade"),
  ]);

  queryClient.setQueryData(["page_settings", "/privacidade"], pageSettings ?? null);
  queryClient.setQueryData(["legal-document", "/privacidade"], legal.document);
  queryClient.setQueryData(["legal-sections", "/privacidade"], legal.sections);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(legal.document?.updated_at ?? null)),
        }}
      />
      <QueryHydration state={dehydrate(queryClient)}>
        <PrivacidadeNext />
      </QueryHydration>
    </>
  );
}
