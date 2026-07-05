import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getActiveProducts } from "@/lib/data/products";
import { findProductBySlug } from "@/lib/product-slug";

interface ProductRedirectPageProps {
  params: Promise<{ slug: string }>;
}

async function loadProductBySlug(slug: string) {
  const products = await getActiveProducts();
  return findProductBySlug(products, slug);
}

export async function generateMetadata({ params }: ProductRedirectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);

  return product
    ? {
        title: product.title,
        description: product.description,
        robots: { index: false, follow: true },
      }
    : {
        title: "Exclusivo não encontrado",
        robots: { index: false, follow: true },
      };
}

export default async function ProductRedirectPage({ params }: ProductRedirectPageProps) {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);

  if (!product) notFound();
  if (!product.cta_url || product.cta_url === "#") redirect("/exclusivos");

  redirect(product.cta_url);
}
