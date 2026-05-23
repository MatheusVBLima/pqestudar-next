import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import CuradoriaPublicNext from "@/components/pages/CuradoriaPublicNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getCurationBySlug } from "@/lib/data/curations";
import { JsonLd, buildBreadcrumbList } from "@/lib/seo/jsonld";
import { DEFAULT_SOCIAL_IMAGE_ALT, DEFAULT_SOCIAL_IMAGE_URL } from "@/lib/site";

interface CuradoriaPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CuradoriaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const curation = await getCurationBySlug(slug);

  if (!curation) {
    return {
      title: "Curadoria não encontrada",
      robots: { index: false, follow: true },
    };
  }

  const title = curation.title;
  const description = curation.description || `Curadoria de ferramentas: ${curation.title}`;
  const canonicalPath = `/curadoria/${slug}`;

  return {
    title,
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

export default async function CuradoriaPage({ params }: CuradoriaPageProps) {
  const { slug } = await params;
  const curation = await getCurationBySlug(slug);

  if (!curation) {
    notFound();
  }

  const queryClient = createQueryClient();
  queryClient.setQueryData(["curations", "slug", slug], curation);

  const breadcrumbLd = buildBreadcrumbList([
    { name: "Inicio", path: "/" },
    { name: "Curadoria", path: `/curadoria/${slug}` },
    { name: curation.title, path: `/curadoria/${slug}` },
  ]);

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <JsonLd data={breadcrumbLd} />
      <CuradoriaPublicNext />
    </QueryHydration>
  );
}
