import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import ToolDetalheNext from "@/components/pages/ToolDetalheNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getRelatedTools, getToolBySlug } from "@/lib/data/tools";
import { JsonLd, absoluteUrl, buildBreadcrumbList } from "@/lib/seo/jsonld";
import { DEFAULT_SOCIAL_IMAGE_ALT, DEFAULT_SOCIAL_IMAGE_URL } from "@/lib/site";

interface ToolDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ToolDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as
    | { name?: string; description?: string; seo_title?: string; seo_description?: string; icon_url?: string; cover_image_url?: string }
    | null;

  if (!tool) {
    return {
      title: "Ferramenta não encontrada",
      description: "Ferramenta não disponível no PqEstudar.",
      robots: { index: false, follow: true },
    };
  }

  const title = tool.seo_title || tool.name || "Ferramenta | PqEstudar";
  const description =
    tool.seo_description || tool.description || `Conheça a ferramenta ${tool.name} no PqEstudar.`;
  const canonicalPath = `/ferramentas/${slug}`;
  const ogImage = tool.cover_image_url || tool.icon_url || DEFAULT_SOCIAL_IMAGE_URL;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      url: canonicalPath,
      title,
      description,
      images: [{ url: ogImage, alt: DEFAULT_SOCIAL_IMAGE_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function FerramentaDetalhePage({ params }: ToolDetailPageProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  const tool = await getToolBySlug(slug);

  queryClient.setQueryData(["tool_detail", slug], tool ?? null);

  if (tool?.id && Array.isArray(tool.tags) && tool.tags.length > 0) {
    const related = await getRelatedTools(tool.id as string, tool.tags as string[]);
    queryClient.setQueryData(
      ["tool_related", tool.id, [...tool.tags].sort().join(",")],
      related,
    );
  }

  const t = tool as
    | {
        name?: string;
        description?: string;
        seo_title?: string;
        seo_description?: string;
        icon_url?: string;
        cover_image_url?: string;
        updated_at?: string;
        created_at?: string;
      }
    | null;

  const articleLd = t
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: t.seo_title || t.name,
        description: t.seo_description || t.description,
        url: absoluteUrl(`/ferramentas/${slug}`),
        mainEntityOfPage: absoluteUrl(`/ferramentas/${slug}`),
        image: t.cover_image_url || t.icon_url || undefined,
        datePublished: t.created_at || undefined,
        dateModified: t.updated_at || undefined,
        author: { "@type": "Organization", name: "PqEstudar", url: absoluteUrl("/") },
        publisher: {
          "@type": "Organization",
          name: "PqEstudar",
          url: absoluteUrl("/"),
        },
      }
    : null;

  const breadcrumbLd = t
    ? buildBreadcrumbList([
        { name: "Inicio", path: "/" },
        { name: "Ferramentas", path: "/ferramentas" },
        { name: t.name || slug, path: `/ferramentas/${slug}` },
      ])
    : null;

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      {articleLd ? <JsonLd data={articleLd} /> : null}
      {breadcrumbLd ? <JsonLd data={breadcrumbLd} /> : null}
      <ToolDetalheNext />
    </QueryHydration>
  );
}
