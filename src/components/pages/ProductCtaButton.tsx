"use client";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ProductCtaButtonProps {
  productId: string;
  ctaUrl: string;
  label?: string;
}

export function ProductCtaButton({ productId, ctaUrl, label = "Saiba Mais" }: ProductCtaButtonProps) {
  const handleClick = async () => {
    void supabase.rpc("increment_product_click", { product_id: productId });

    if (ctaUrl && ctaUrl !== "#") {
      window.open(ctaUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Button size="lg" onClick={handleClick}>
      {label}
    </Button>
  );
}
