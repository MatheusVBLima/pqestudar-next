"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/layout/PageHero";
import { Bookmark, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSavedItems, type SavedItem } from "@/hooks/useSavedItems";
import { useUserRoles } from "@/hooks/useUserRoles";
import { SavedToolsPanel } from "@/components/saved/SavedToolsPanel";
import { SavedContestsPanel } from "@/components/saved/SavedContestsPanel";
import { usePageSettings } from "@/hooks/usePageSettings";
import { PremiumRail } from "@/components/premium/PremiumRail";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";

const SAVED_HERO_TITLE = "Seus **Salvos** em Um Só Lugar";
const SAVED_HERO_DESCRIPTION =
  "Ferramentas e concursos que você marcou para acessar depois, sempre à mão.";

export default function FerramentasSalvos() {
  const ps = usePageSettings("/salvos");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRoles();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?from=/salvos");
    }
  }, [authLoading, user, router]);
  const { loading, fetchSavedItems, getSavedByType } = useSavedItems();
  // Fetch saved items when component mounts
  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [user, fetchSavedItems]);

  const savedTools = getSavedByType('tool');
  const savedContests = getSavedByType('contest');
  const savedAnalyses = getSavedByType('course_analysis');

  const hasAnyVisibleSaved = !loading && (savedTools.length > 0 || savedContests.length > 0 || (isAdmin && savedAnalyses.length > 0));
  const hasTools = savedTools.length > 0;
  const hasContests = savedContests.length > 0;
  const hasAnalyses = isAdmin && savedAnalyses.length > 0;

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
          ) : !hasAnyVisibleSaved ? (
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

              {hasAnalyses && (
                <PremiumRail
                  title="Análises de Cursos Salvas"
                  subtitle="Protótipo visível apenas para admins enquanto o produto é validado"
                  viewMoreHref="/admin/certificado-que-conta"
                  viewMoreLabel="Gerar nova análise"
                  isLoading={false}
                  isEmpty={false}
                >
                  <SavedCourseAnalysesPanel savedItems={savedAnalyses} />
                </PremiumRail>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function SavedCourseAnalysesPanel({ savedItems }: { savedItems: SavedItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {savedItems.map((item) => {
        const metadata = item.metadata ?? {};
        const title = metadata.course_name || metadata.title || "Análise de curso";
        const provider = metadata.provider_name;
        const verdict = typeof metadata.verdict === "string" ? metadata.verdict.replaceAll("_", " ") : "Análise salva";
        const summary = typeof metadata.description === "string" ? metadata.description : "";

        return (
          <article key={item.id} className="rounded-[1.2rem] border border-primary/15 bg-card/80 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Certificado que Conta
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Admin
              </span>
            </div>
            <h3 className="mt-4 line-clamp-2 text-lg font-semibold">{title}</h3>
            {provider && <p className="mt-1 text-sm text-muted-foreground">{provider}</p>}
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-primary">{verdict}</p>
            {summary && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{summary}</p>}
            <div className="mt-5 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
              Em breve, usuários poderão desbloquear este recurso e manter suas análises salvas aqui.
            </div>
          </article>
        );
      })}
    </div>
  );
}
