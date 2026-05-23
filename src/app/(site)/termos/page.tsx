import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import TermosNext from "@/components/pages/TermosNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { getLegalPage } from "@/lib/data/legal";
import { absoluteUrl } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/termos");

  return {
    title: data?.title_tag ?? "Termos de Uso | PqEstudar",
    description:
      data?.meta_description ??
      "Termos de uso do PqEstudar. Conheça as regras, responsabilidades e condições para utilizar a plataforma e seus recursos.",
    alternates: { canonical: "/termos" },
  };
}

function buildJsonLd(updatedAt: string | null) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Termos de Uso",
    description: "Termos de Uso da plataforma PqEstudar",
    url: absoluteUrl("/termos"),
    dateModified: updatedAt ?? "2025-10-28",
    publisher: { "@type": "Organization", name: "PqEstudar" },
  };
}

export default async function TermosPage() {
  const queryClient = createQueryClient();

  const [pageSettings, legal] = await Promise.all([
    getPageSettings("/termos"),
    getLegalPage("/termos"),
  ]);

  queryClient.setQueryData(["page_settings", "/termos"], pageSettings ?? null);
  queryClient.setQueryData(["legal-document", "/termos"], legal.document);
  queryClient.setQueryData(["legal-sections", "/termos"], legal.sections);

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
        <TermosNext />
      </QueryHydration>
    </>
  );
}
