import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import GuiaDetalheNext from "@/components/pages/GuiaDetalheNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import {
  getGuideBySlug,
  getGuideRelatedTools,
  getGuideRelatedContests,
  getGuideRelatedGuides,
} from "@/lib/data/guides";
import { JsonLd, absoluteUrl, buildBreadcrumbList } from "@/lib/seo/jsonld";
import { DEFAULT_SOCIAL_IMAGE_ALT, DEFAULT_SOCIAL_IMAGE_URL } from "@/lib/site";

interface GuiaDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GuiaDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guia não encontrado",
      robots: { index: false, follow: true },
    };
  }

  const title = guide.seo_title || guide.title;
  const description = guide.seo_description || guide.short_description;
  const canonicalPath = `/guias/${slug}`;
  const socialImage = guide.cover_image_url || DEFAULT_SOCIAL_IMAGE_URL;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      url: canonicalPath,
      title: guide.title,
      description: guide.short_description,
      images: [{ url: socialImage, alt: DEFAULT_SOCIAL_IMAGE_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.short_description,
      images: [socialImage],
    },
  };
}

function buildArticleJsonLd(guide: {
  slug: string;
  seo_title?: string | null;
  seo_description?: string | null;
  title: string;
  short_description: string;
  public_category?: string | null;
  category: string;
  author_name?: string | null;
  cover_image_url?: string | null;
  updated_at: string;
  created_at: string;
}) {
  const displayCategory = guide.public_category || guide.category;
  const url = absoluteUrl(`/guias/${guide.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.seo_title || guide.title,
    description: guide.seo_description || guide.short_description,
    articleSection: displayCategory,
    url,
    mainEntityOfPage: url,
    image: guide.cover_image_url || undefined,
    author: { "@type": "Person", name: guide.author_name || "Equipe PqEstudar" },
    dateModified: guide.updated_at,
    datePublished: guide.created_at,
    publisher: {
      "@type": "Organization",
      name: "PqEstudar",
      url: absoluteUrl("/"),
    },
  };
}

export default async function GuiaDetalhePage({ params }: GuiaDetailPageProps) {
  const { slug } = await params;
  const queryClient = createQueryClient();

  const guide = await getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  queryClient.setQueryData(["guides", "slug", slug], guide);

  const [tools, contests, guides] = await Promise.all([
    getGuideRelatedTools(guide.id),
    getGuideRelatedContests(guide.id),
    getGuideRelatedGuides(guide.id),
  ]);

  queryClient.setQueryData(["guide_related_tools", guide.id], tools);
  queryClient.setQueryData(["guide_related_contests", guide.id], contests);
  queryClient.setQueryData(["guide_related_guides", guide.id], guides);

  const breadcrumbLd = buildBreadcrumbList([
    { name: "Inicio", path: "/" },
    { name: "Guias", path: "/guias" },
    { name: guide.title, path: `/guias/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={buildArticleJsonLd(guide)} />
      <JsonLd data={breadcrumbLd} />
      <QueryHydration state={dehydrate(queryClient)}>
        <GuiaDetalheNext />
      </QueryHydration>
    </>
  );
}
