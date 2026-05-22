"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/layout/PageHero";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSavedItems } from "@/hooks/useSavedItems";
import { SavedToolsPanel } from "@/components/saved/SavedToolsPanel";
import { SavedContestsPanel } from "@/components/saved/SavedContestsPanel";
import { usePageSettings } from "@/hooks/usePageSettings";
import { PremiumRail } from "@/components/premium/PremiumRail";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";

const SAVED_HERO_TITLE = "Seus **Salvos** em Um Só Lugar";
const SAVED_HERO_DESCRIPTION =
  "Ferramentas e concursos que você marcou para acessar depois, sempre à mão.";

export default function FerramentasSalvos() {
  const ps = usePageSettings("/ferramentas/salvos");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?from=ferramentas-salvos");
    }
  }, [authLoading, user, router]);
  const { savedItems, loading, fetchSavedItems, getSavedByType } = useSavedItems();
  // Fetch saved items when component mounts
  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [user, fetchSavedItems]);

  const savedTools = getSavedByType('tool');
  const savedContests = getSavedByType('contest');

  const hasAnySaved = !loading && savedItems.length > 0;
  const hasTools = savedTools.length > 0;
  const hasContests = savedContests.length > 0;

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        <main className="flex-1">
          <PageHero title={SAVED_HERO_TITLE} description={SAVED_HERO_DESCRIPTION} />
          <section className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10 md:space-y-12">
            <div className="space-y-10 md:space-y-12">
              <PremiumRail title="Ferramentas Salvas" subtitle="Sua seleção de ferramentas salvas" isLoading skeletonCount={3} />
              <PremiumRail title="Concursos Salvos" subtitle="Sua seleção de concursos salvos" isLoading skeletonCount={3} />
            </div>
          </section>
        </main>
      </div>
    );
  }

  // User not authenticated — redirect handled by useEffect; render nothing meanwhile
  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <main className="flex-1">
        <PageHero title={SAVED_HERO_TITLE} description={SAVED_HERO_DESCRIPTION} isLoading={ps.isLoading} />

        <section className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10 md:space-y-12">
          <PremiumBackButton fallbackPath="/ferramentas" fallbackLabel="Ferramentas" />

          {loading ? (
            <>
              <PremiumRail title="Ferramentas Salvas" subtitle="Sua seleção de ferramentas salvas" isLoading skeletonCount={3} />
              <PremiumRail title="Concursos Salvos" subtitle="Sua seleção de concursos salvos" isLoading skeletonCount={3} />
            </>
          ) : !hasAnySaved ? (
            <div className="text-center py-12 rounded-[1.2rem] border border-border bg-card/80">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não salvou nenhum item.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild variant="outline">
                  <Link href="/ferramentas">Ver ferramentas</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/concursos">Ver concursos</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {hasTools && (
                <PremiumRail
                  title="Ferramentas Salvas"
                  subtitle="Sua seleção de ferramentas salvas"
                  viewMoreHref="/ferramentas"
                  viewMoreLabel="Explorar ferramentas"
                  isLoading={false}
                  isEmpty={false}
                >
                  <SavedToolsPanel
                    savedItems={savedTools}
                    onRefresh={fetchSavedItems}
                    shouldLoad
                    variant="rail"
                  />
                </PremiumRail>
              )}

              {hasContests && (
                <PremiumRail
                  title="Concursos Salvos"
                  subtitle="Sua seleção de concursos salvos"
                  viewMoreHref="/concursos"
                  viewMoreLabel="Explorar concursos"
                  isLoading={false}
                  isEmpty={false}
                >
                  <SavedContestsPanel
                    savedItems={savedContests}
                    onRefresh={fetchSavedItems}
                    shouldLoad
                    variant="rail"
                  />
                </PremiumRail>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
