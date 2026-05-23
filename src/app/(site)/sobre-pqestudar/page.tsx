import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import SobrePqEstudarNext from "@/components/pages/SobrePqEstudarNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getPageSettings } from "@/lib/data/page-settings";
import { absoluteUrl } from "@/lib/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPageSettings("/sobre-pqestudar");

  return {
    title: data?.title_tag ?? "Sobre o PqEstudar: O que é e Como funciona | PqEstudar",
    description:
      data?.meta_description ??
      "Conheça o PqEstudar, plataforma que reúne concursos, ferramentas, produtos e conteúdos práticos para ajudar você a encontrar oportunidades.",
    alternates: { canonical: "/sobre-pqestudar" },
  };
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PqEstudar",
  url: absoluteUrl("/"),
  publisher: {
    "@type": "Organization",
    name: "PqEstudar",
    logo: { "@type": "ImageObject", url: absoluteUrl("/favicon.png") },
  },
};

export default async function SobrePqEstudarPage() {
  const queryClient = createQueryClient();
  const pageSettings = await getPageSettings("/sobre-pqestudar");

  queryClient.setQueryData(["page_settings", "/sobre-pqestudar"], pageSettings ?? null);

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <QueryHydration state={dehydrate(queryClient)}>
        <SobrePqEstudarNext />
      </QueryHydration>
    </>
  );
}
