import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProductPdfReader } from "@/components/products/ProductPdfReader";
import { getActiveProducts } from "@/lib/data/products";
import { getProductDocumentUrls } from "@/lib/product-document";
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

  const document = getProductDocumentUrls(product.cta_url);
  if (document) {
    return (
      <main className="mx-auto w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] py-4 sm:w-[90vw] sm:max-w-[90vw] sm:py-8">
        <ProductPdfReader
          title={product.title}
          viewerUrl={document.viewerUrl}
          downloadUrl={document.downloadUrl}
        />
      </main>
    );
  }

  redirect(product.cta_url);
}
