"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Bookmark, BookmarkCheck, Clock, ExternalLink, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";
import { PREMIUM_BENEFIT_TAG, visiblePremiumTags } from "@/lib/premium-benefits";

interface BenefitDetail {
  id: string;
  title: string;
  slug: string;
  description_short: string | null;
  description_full: string | null;
  external_url: string | null;
  logo_url: string | null;
  tags: string[] | null;
  status: string;
}

export default function PremiumBeneficioDetalheNext() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [benefit, setBenefit] = useState<BenefitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();

  useEffect(() => {
    if (!slug) return;
    const fetchBenefit = async () => {
      try {
        const { data, error } = await supabase
          .from("premium_items")
          .select("id, title, slug, description_short, description_full, external_url, logo_url, tags, status")
          .eq("slug", slug)
          .eq("item_type", "course")
          .contains("tags", [PREMIUM_BENEFIT_TAG])
          .single();
        if (error) throw error;
        if (!data) throw new Error("Benefício não encontrado");
        setBenefit(data as BenefitDetail);
      } catch (err) {
        console.error("Error fetching benefit:", err);
        setError("Não foi possível carregar este benefício.");
      } finally {
        setLoading(false);
      }
    };
    fetchBenefit();
  }, [slug]);

  if (loading) {
    return (
      <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="max-w-3xl mx-auto space-y-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 rounded-[1.2rem]" />
        </div>
      </main>
    );
  }

  if (error || !benefit) {
    return (
      <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="text-center py-16 max-w-lg mx-auto">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Benefício não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Este benefício não está disponível no momento."}
          </p>
          <Button asChild>
            <Link href="/premium/beneficios">Voltar para benefícios</Link>
          </Button>
        </div>
      </main>
    );
  }

  const tags = visiblePremiumTags(benefit.tags);
  const hasExternalUrl = !!benefit.external_url;
  const saved = isSaved(benefit.id);

  return (
    <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <div className="max-w-3xl mx-auto space-y-8">
        <PremiumBackButton fallbackPath="/premium/beneficios" fallbackLabel="Benefícios" />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs uppercase tracking-wide">
              Benefício
            </Badge>
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {benefit.status !== "published" && (
              <Badge variant="outline" className="text-xs">Em breve</Badge>
            )}
          </div>

          <div className="flex items-start gap-4">
            {benefit.logo_url ? (
              <img
                src={benefit.logo_url}
                alt=""
                className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
              {benefit.title}
            </h1>
          </div>

          {benefit.description_short && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {benefit.description_short}
            </p>
          )}
        </div>

        {benefit.description_full && (
          <div className="rounded-[1.2rem] border border-border bg-card p-6 md:p-8 shadow-card">
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line">
              {benefit.description_full}
            </div>
          </div>
        )}

        {hasExternalUrl ? (
          <div className="rounded-[1.2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-10 text-center space-y-5 shadow-card">
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Pronto para usar este benefício?
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Você será direcionado para{" "}
                <span className="font-medium text-foreground">
                  {new URL(benefit.external_url!).hostname.replace(/^www\./, "")}
                </span>
                .
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button size="lg" className="w-full sm:w-auto sm:min-w-[280px] h-12 text-base font-semibold" asChild>
                <a href={benefit.external_url!} target="_blank" rel="noopener noreferrer">
                  Acessar benefício
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSave(benefit.id, { title: benefit.title, slug: benefit.slug })}
                disabled={isToggling(benefit.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                {saved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2" />
                    Salvo nos seus itens
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Salvar para depois
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-border bg-muted/30 p-8 md:p-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted text-muted-foreground mx-auto">
              <Clock className="h-5 w-5" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-lg md:text-xl font-semibold">Acesso em breve</h2>
              <p className="text-sm text-muted-foreground">
                Ainda estamos finalizando o link oficial deste benefício. Salve para acessar depois.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
