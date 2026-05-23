import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductCtaButton } from "@/components/pages/ProductCtaButton";
import { getActiveProducts } from "@/lib/data/products";
import { findProductBySlug } from "@/lib/product-slug";
import { JsonLd, absoluteUrl, buildBreadcrumbList } from "@/lib/seo/jsonld";
import { DEFAULT_SOCIAL_IMAGE_ALT, DEFAULT_SOCIAL_IMAGE_URL } from "@/lib/site";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function loadProductBySlug(slug: string) {
  const products = await getActiveProducts();
  return findProductBySlug(products, slug);
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);

  if (!product) {
    return {
      title: "Produto não encontrado",
      description: "Produto não disponível.",
      robots: { index: false, follow: true },
    };
  }

  const canonicalPath = `/produtos/${slug}`;
  const socialImage = product.image_url || DEFAULT_SOCIAL_IMAGE_URL;

  return {
    title: product.title,
    description: product.description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      url: canonicalPath,
      title: product.title,
      description: product.description,
      images: [{ url: socialImage, alt: DEFAULT_SOCIAL_IMAGE_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description,
      images: [socialImage],
    },
  };
}

export default async function ProdutoDetalhePage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    category: product.category,
    url: absoluteUrl(`/produtos/${slug}`),
    image: product.image_url || undefined,
    brand: { "@type": "Organization", name: "PqEstudar" },
  };

  const breadcrumbLd = buildBreadcrumbList([
    { name: "Inicio", path: "/" },
    { name: "Produtos", path: "/produtos" },
    { name: product.title, path: `/produtos/${slug}` },
  ]);

  return (
    <main className="container mx-auto px-6 pt-8 md:pt-12 pb-16">
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="mb-6">
        <Link
          href="/produtos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para produtos
        </Link>
      </div>

      <article className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="rounded-[1.2rem] overflow-hidden border bg-muted aspect-[4/3]">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Sem imagem
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Badge variant="secondary" className="w-fit">
            {product.category}
          </Badge>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{product.title}</h1>

          <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description}
          </p>

          <div className="pt-2">
            <ProductCtaButton
              productId={product.id}
              ctaUrl={product.cta_url}
              label="Saiba Mais"
            />
          </div>

          <p className="text-xs text-muted-foreground pt-4 border-t">
            {product.clicks_count.toLocaleString("pt-BR")} pessoas já clicaram neste produto.
          </p>
        </div>
      </article>
    </main>
  );
}
