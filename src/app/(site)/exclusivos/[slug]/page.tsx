import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Download, Expand, ExternalLink } from "lucide-react";
import { getActiveProducts } from "@/lib/data/products";
import { findProductBySlug } from "@/lib/product-slug";
import { getProductDocumentUrls } from "@/lib/product-document";

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
      <main className="container mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <section className="overflow-hidden rounded-[1.2rem] border bg-card shadow-sm">
          <header className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Leitor PqEstudar</p>
              <h1 className="mt-1 truncate text-xl font-bold md:text-2xl">{product.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Leia na plataforma ou baixe para consultar quando quiser.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex h-10 items-center gap-2 rounded-[1.2rem] border px-4 text-sm font-medium hover:bg-accent" href={document.viewerUrl} target="_blank" rel="noreferrer">
                <Expand className="h-4 w-4" /> Tela cheia
              </a>
              <a className="inline-flex h-10 items-center gap-2 rounded-[1.2rem] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" href={document.downloadUrl} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" /> Baixar PDF
              </a>
            </div>
          </header>
          <div className="bg-muted/40 p-2 sm:p-4">
            <iframe title={`PDF — ${product.title}`} src={document.viewerUrl} className="h-[calc(100dvh-15rem)] min-h-[620px] w-full rounded-xl border bg-background" allowFullScreen />
          </div>
          <footer className="flex items-center justify-between gap-4 border-t px-5 py-4 text-sm text-muted-foreground">
            <span>Continue explorando os conteúdos do PqEstudar após a leitura.</span>
            <a href="/exclusivos" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">Ver mais exclusivos <ExternalLink className="h-3.5 w-3.5" /></a>
          </footer>
        </section>
      </main>
    );
  }

  redirect(product.cta_url);
}
