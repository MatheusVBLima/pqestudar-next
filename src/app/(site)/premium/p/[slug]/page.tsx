import type { Metadata } from "next";
import PremiumCurationPageClient from "@/components/pages/premium/PremiumCurationPageClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Curadoria Premium | PqEstudar",
    robots: { index: false, follow: false },
    alternates: { canonical: `/premium/p/${slug}` },
  };
}

export default function PremiumCurationPagePage() {
  return <PremiumCurationPageClient />;
}
