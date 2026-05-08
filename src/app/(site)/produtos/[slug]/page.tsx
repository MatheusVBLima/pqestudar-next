import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductCtaButton } from "@/components/pages/ProductCtaButton";
import { getActiveProducts } from "@/lib/data/products";
import { findProductBySlug } from "@/lib/product-slug";

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
      title: "Produto não encontrado | PqEstudar",
      description: "Produto não disponível.",
    };
  }

  return {
    title: `${product.title} | PqEstudar`,
    description: product.description,
    openGraph: product.image_url
      ? {
          title: product.title,
          description: product.description,
          images: [{ url: product.image_url }],
        }
      : undefined,
  };
}

export default async function ProdutoDetalhePage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="container mx-auto px-6 pt-8 md:pt-12 pb-16">
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
