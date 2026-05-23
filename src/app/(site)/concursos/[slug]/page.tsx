import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import ConcursoDetalheNext from "@/components/pages/ConcursoDetalheNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import {
  getOportunidadeBySlug,
  getOportunidadeMetadata,
  getOportunidadeRedirectSlug,
} from "@/lib/data/oportunidades";
import { JsonLd, absoluteUrl, buildBreadcrumbList } from "@/lib/seo/jsonld";
import { DEFAULT_SOCIAL_IMAGE_ALT, DEFAULT_SOCIAL_IMAGE_URL } from "@/lib/site";

interface ConcursoDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ConcursoDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getOportunidadeMetadata(slug);

  const title = data?.meta_title || data?.titulo || "Concurso | PqEstudar";
  const description = data?.meta_description || data?.resumo_editorial || "Detalhes do concurso no PqEstudar.";
  const canonicalPath = `/concursos/${slug}`;

  return {
    title: `${title} | PqEstudar`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      url: canonicalPath,
      title,
      description,
      images: [{ url: DEFAULT_SOCIAL_IMAGE_URL, alt: DEFAULT_SOCIAL_IMAGE_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE_URL],
    },
  };
}

export default async function ConcursoDetalhePage({ params }: ConcursoDetailPageProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  const detail = await getOportunidadeBySlug(slug);

  if (!detail) {
    const redirectSlug = await getOportunidadeRedirectSlug(slug);
    if (redirectSlug) {
      redirect(`/concursos/${redirectSlug}`);
    }

    queryClient.setQueryData(["concurso_detail", slug], {
      oportunidade: null,
      atualizacoes: [],
      redirectSlug: null,
      notFound: true,
    });
  } else {
    queryClient.setQueryData(["concurso_detail", slug], {
      oportunidade: detail.oportunidade,
      atualizacoes: detail.atualizacoes,
      redirectSlug: null,
      notFound: false,
    });
  }

  const op = detail?.oportunidade as
    | {
        titulo: string;
        slug: string;
        meta_description?: string | null;
        resumo_editorial?: string | null;
        data_publicacao?: string | null;
        updated_at?: string | null;
        created_at?: string | null;
      }
    | undefined;

  const articleLd = op
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: op.titulo,
        description:
          op.meta_description || op.resumo_editorial || `Detalhes do concurso ${op.titulo}.`,
        url: absoluteUrl(`/concursos/${op.slug}`),
        mainEntityOfPage: absoluteUrl(`/concursos/${op.slug}`),
        datePublished: op.data_publicacao || op.created_at || undefined,
        dateModified: op.updated_at || op.data_publicacao || undefined,
        author: { "@type": "Organization", name: "PqEstudar", url: absoluteUrl("/") },
        publisher: {
          "@type": "Organization",
          name: "PqEstudar",
          url: absoluteUrl("/"),
        },
      }
    : null;

  const breadcrumbLd = op
    ? buildBreadcrumbList([
        { name: "Inicio", path: "/" },
        { name: "Concursos", path: "/concursos" },
        { name: op.titulo, path: `/concursos/${op.slug}` },
      ])
    : null;

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      {articleLd ? <JsonLd data={articleLd} /> : null}
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      <ConcursoDetalheNext />
    </QueryHydration>
  );
}
