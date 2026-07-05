"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { Json } from "@/integrations/supabase/types";
import { parseProductSalesPage } from "@/lib/product-sales-page";

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  cta_url: string;
  clicks_count: number;
  is_active: boolean;
  sort_order: number;
  sales_page: Json;
}

const PLACEHOLDER_CARD = {
  title: "Produto em breve",
  description: "Estamos preparando algo especial para você. Fique de olho!",
  category: "Em breve",
};

const ease = [0.16, 1, 0.3, 1] as const;

function PlaceholderCard() {
  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-[1.2rem]">
      <div className="w-full aspect-[16/10] overflow-hidden bg-muted flex items-center justify-center">
        <Clock className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3 className="text-lg font-semibold leading-tight text-muted-foreground">
          {PLACEHOLDER_CARD.title}
        </h3>
        <p className="text-sm text-muted-foreground/70 leading-relaxed flex-1">
          {PLACEHOLDER_CARD.description}
        </p>
        <div className="flex flex-col gap-3 mt-auto pt-2">
          <Badge variant="secondary" className="w-fit text-xs opacity-60">
            {PLACEHOLDER_CARD.category}
          </Badge>
          <Badge variant="outline" className="w-fit text-xs text-muted-foreground/60">
            Em breve
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function ProductCard({
  product,
  onClickSaibaMais,
}: {
  product: Product;
  onClickSaibaMais: () => void;
}) {
  const salesPage = parseProductSalesPage(product.sales_page);

  return (
    <Card
      className="group flex h-full cursor-pointer flex-col overflow-hidden relative rounded-[1.2rem] transition-all hover:-translate-y-1 hover:shadow-lg"
      role="link"
      tabIndex={0}
      onClick={onClickSaibaMais}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClickSaibaMais();
        }
      }}
    >
      {/* Click counter */}
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm border px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Eye className="h-3 w-3" />
          {product.clicks_count}
        </span>
      </div>

      {/* Image */}
      <div className="w-full aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3 className="text-lg font-semibold leading-tight">{product.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">
          {product.description}
        </p>
        <div className="flex flex-col gap-3 mt-auto pt-2">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary" className="w-fit text-xs">
              {product.category}
            </Badge>
            {salesPage.priceLabel ? (
              <span className="flex shrink-0 flex-col items-end leading-tight">
                {salesPage.oldPriceLabel ? (
                  <span className="text-xs text-muted-foreground line-through decoration-1">
                    {salesPage.oldPriceLabel}
                  </span>
                ) : null}
                <span className={salesPage.oldPriceLabel ? "text-base font-bold text-primary" : "text-sm font-semibold"}>
                  {salesPage.priceLabel}
                </span>
              </span>
            ) : null}
          </div>
          <Button className="w-full" onClick={(event) => {
            event.stopPropagation();
            onClickSaibaMais();
          }}>
            {salesPage.ctaLabel || (product.title === "Mapa dos Benefícios Ocultos" ? "Explorar o mapa" : "Acessar produto")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function HomeProductsSectionNext() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const clickMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.rpc("increment_product_click", { product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-public"] });
    },
  });

  const handleSaibaMais = (product: Product) => {
    if (!product.cta_url || product.cta_url === "#") return;
    clickMutation.mutate(product.id, {
      onSettled: () => window.location.assign(product.cta_url),
    });
  };

  const displayProducts = products.slice(0, 3);
  const placeholderCount = Math.max(0, 3 - displayProducts.length);

  return (
    <section className="pt-0 pb-16 md:pb-24">
      <div className="container mx-auto px-6">
        {/* Divisor between sections */}
        <Separator className="mb-14 md:mb-20 bg-border/50" />
        
        {/* Section container with subtle background */}
        <div className="rounded-[1.2rem] border border-border/40 bg-muted/30 p-6 md:p-10 lg:p-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10"
          >
            <div>
              <Badge variant="secondary" className="mb-4 text-xs">
                Nossos exclusivos
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Exclusivos do PqEstudar
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg">
                Guias e recursos prontos para acelerar seu progresso. Em breve, novos exclusivos.
              </p>
            </div>
            <Link href="/exclusivos" className="w-full sm:w-auto">
              <Button variant="outline" className="gap-2 rounded-[1.2rem] w-full sm:w-auto shrink-0">
                Explorar exclusivos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-[1.2rem]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {displayProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease }}
                className="h-full"
              >
                <ProductCard
                  product={product}
                  onClickSaibaMais={() => handleSaibaMais(product)}
                />
              </motion.div>
            ))}
            {Array.from({ length: placeholderCount }).map((_, idx) => (
              <motion.div
                key={`placeholder-${idx}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: (displayProducts.length + idx) * 0.1, ease }}
                className="h-full"
              >
                <PlaceholderCard />
              </motion.div>
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
