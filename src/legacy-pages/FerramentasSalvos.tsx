"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/layout/PageHero";
import { AlertTriangle, Bookmark, CheckCircle2, Copy, Eye, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);

  return (
    <>
      {savedItems.map((item) => {
        const metadata = item.metadata ?? {};
        const title = metadata.course_name || metadata.title || "Análise de curso";
        const provider = metadata.provider_name;
        const verdict = typeof metadata.verdict === "string" ? metadata.verdict.replaceAll("_", " ") : "Análise salva";
        const summary = typeof metadata.description === "string" ? metadata.description : "";

        return (
          <button
            type="button"
            key={item.id}
            onClick={() => setSelectedItem((current) => (current?.id === item.id ? null : item))}
            className="flex h-full w-72 shrink-0 snap-start flex-col rounded-[1.2rem] border border-primary/15 bg-card/80 p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3 shrink-0" />
                Certificado que Conta
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Admin
              </span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-tight">{title}</h3>
            {provider && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{provider}</p>}
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{verdict}</p>
            {summary && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{summary}</p>}
            <div className="mt-auto pt-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <span>Ver análise completa</span>
                <Eye className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
          </button>
        );
      })}

      <SavedCourseAnalysisViewer
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      />
    </>
  );
}

function SavedCourseAnalysisViewer({
  item,
  open,
  onOpenChange,
}: {
  item: SavedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const metadata = (item?.metadata ?? {}) as Record<string, unknown>;
  const result = getRecord(metadata.result);
  const title = getText(metadata.course_name) || getText(metadata.title) || "Análise de curso";
  const provider = getText(metadata.provider_name);
  const verdict = formatVerdict(getText(result.verdict) || getText(metadata.verdict) || "Análise salva");
  const confidence = getText(result.confidence) || getText(metadata.confidence);
  const summary = getText(result.summary) || getText(metadata.description);
  const scores = getScores(result.scores);
  const complementaryHours = getRecord(result.complementary_hours);
  const strengths = getTextArray(result.strengths);
  const warnings = getTextArray(result.warnings);
  const missing = getTextArray(result.missing_information);
  const actions = getTextArray(result.recommended_actions);
  const cvExample = getText(result.cv_example);
  const linkedinExample = getText(result.linkedin_example);
  const disclaimer = getText(result.disclaimer);

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-primary/20 bg-background p-0 sm:max-w-3xl">
        <div className="min-h-full bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_35%)]">
          <SheetHeader className="border-b border-border/70 px-5 py-5 text-left sm:px-7">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Certificado que Conta
              </span>
              {confidence && (
                <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  Confiança: {confidence}
                </span>
              )}
            </div>
            <SheetTitle className="text-2xl leading-tight">{title}</SheetTitle>
            <SheetDescription className="text-sm">
              {provider ? `${provider} — ` : ""}{verdict}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-5 py-5 sm:px-7">
            {summary && (
              <section className="rounded-[1.2rem] border border-primary/15 bg-card/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Resumo da análise</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
              </section>
            )}

            {scores.length > 0 && (
              <section className="grid gap-3 sm:grid-cols-2">
                {scores.map((score) => (
                  <div key={score.label} className="rounded-[1rem] border bg-card/75 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{score.label}</p>
                      <span className="text-sm font-bold text-primary">{score.value}/100</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, score.value))}%` }} />
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section className="grid gap-4 lg:grid-cols-2">
              <AnalysisListCard title="Aspectos favoráveis" items={strengths} tone="positive" />
              <AnalysisListCard title="Pontos de atenção" items={warnings} tone="warning" />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <AnalysisChecklistCard title="O que falta confirmar" items={missing} />
              <AnalysisChecklistCard title="O que fazer agora" items={actions} />
            </section>

            {(getText(complementaryHours.status) || getText(complementaryHours.reason)) && (
              <section className="rounded-[1.2rem] border border-primary/20 bg-primary/10 p-5">
                <p className="text-sm font-semibold">
                  Uso como horas complementares{getText(complementaryHours.status) ? `: ${getText(complementaryHours.status)}` : ""}
                </p>
                {getText(complementaryHours.reason) && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{getText(complementaryHours.reason)}</p>
                )}
              </section>
            )}

            <section className="grid gap-4 lg:grid-cols-2">
              {cvExample && <CopyableSavedText title="Como colocar no currículo" text={cvExample} />}
              {linkedinExample && <CopyableSavedText title="Como apresentar no LinkedIn" text={linkedinExample} linkedIn />}
            </section>

            {disclaimer && <p className="text-center text-xs italic text-muted-foreground">{disclaimer}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AnalysisListCard({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "warning" }) {
  const isPositive = tone === "positive";

  return (
    <section className={`rounded-[1.2rem] border p-5 ${isPositive ? "border-emerald-500/25 bg-emerald-500/12" : "border-rose-500/25 bg-rose-500/12"}`}>
      <h3 className="text-base font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-3">
              {isPositive ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum item salvo nessa seção.</p>
      )}
    </section>
  );
}

function AnalysisChecklistCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[1.2rem] border bg-card/75 p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-3">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-primary/70" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma ação salva nessa seção.</p>
      )}
    </section>
  );
}

function CopyableSavedText({ title, text, linkedIn = false }: { title: string; text: string; linkedIn?: boolean }) {
  return (
    <section className="rounded-[1.2rem] border bg-card/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          {linkedIn && <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#0A66C2] text-xs font-bold text-white">in</span>}
          {title}
        </h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={() => navigator.clipboard?.writeText(text)}
          aria-label={`Copiar ${title}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </section>
  );
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function getScores(value: unknown): Array<{ label: string; value: number }> {
  const scores = getRecord(value);
  const labels: Record<string, string> = {
    goal: "Ajuda no objetivo",
    resume: "Valor para o currículo",
    portfolio: "Ajuda a criar trabalhos práticos",
    fit: "Cabe na rotina",
  };

  return Object.entries(scores)
    .map(([key, rawValue]) => ({
      label: labels[key] ?? key,
      value: typeof rawValue === "number" ? Math.round(rawValue) : Number(rawValue),
    }))
    .filter((score) => Number.isFinite(score.value));
}

function formatVerdict(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"));
}
