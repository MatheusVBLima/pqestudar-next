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

interface GuiaDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GuiaDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);

  if (!guide) {
    return { title: "Guia não encontrado | PqEstudar" };
  }

  return {
    title: guide.seo_title || guide.title,
    description: guide.seo_description || guide.short_description,
    alternates: { canonical: `/guias/${slug}` },
    openGraph: guide.cover_image_url
      ? {
          title: guide.title,
          description: guide.short_description,
          images: [{ url: guide.cover_image_url }],
        }
      : undefined,
  };
}

function buildArticleJsonLd(guide: {
  seo_title?: string | null;
  seo_description?: string | null;
  title: string;
  short_description: string;
  public_category?: string | null;
  category: string;
  author_name?: string | null;
  updated_at: string;
  created_at: string;
}) {
  const displayCategory = guide.public_category || guide.category;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.seo_title || guide.title,
    description: guide.seo_description || guide.short_description,
    articleSection: displayCategory,
    author: { "@type": "Person", name: guide.author_name || "Equipe PqEstudar" },
    dateModified: guide.updated_at,
    datePublished: guide.created_at,
    publisher: {
      "@type": "Organization",
      name: "PqEstudar",
      url: "https://pqestudar.com.br",
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

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd(guide)) }}
      />
      <QueryHydration state={dehydrate(queryClient)}>
        <GuiaDetalheNext />
      </QueryHydration>
    </>
  );
}
