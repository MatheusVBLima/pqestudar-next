import type { Metadata } from "next";
import PremiumCurationPageNext from "@/components/pages/premium/PremiumCurationPageNext";
import { requireActiveSubscription } from "@/lib/auth/require-active-subscription";

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

export default async function PremiumCurationPagePage({ params }: PageProps) {
  const { slug } = await params;
  await requireActiveSubscription(`/premium/p/${slug}`);
  return <PremiumCurationPageNext />;
}
