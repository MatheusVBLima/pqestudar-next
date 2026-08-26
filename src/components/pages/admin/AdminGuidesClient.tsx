"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileText,
  GitBranch,
  Layers3,
  ListTree,
  MessageCircleQuestion,
  PenLine,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { type Guide, useGuides } from "@/hooks/useGuides";
import {
  buildAllTrailCoverages,
  buildTrailCoverage,
  buildTrailRecommendation,
  getGuideTrailStage,
  getGuideTrailSubject,
  TRAIL_STAGES,
  type TrailStage,
  type TrailSubjectCoverage,
} from "@/lib/guide-trail-planner";
import { cn } from "@/lib/utils";

const ALL_SUBJECTS = "all";
const UNCATEGORIZED = "Sem tema";
type GuideView = "journey" | "map" | "questions";

const stageTone: Record<TrailStage, string> = {
  busca: "border-sky-500/25 bg-sky-500/10 text-sky-700",
  exploracao: "border-violet-500/25 bg-violet-500/10 text-violet-700",
  decisao: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  validacao: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  expansao: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-700",
  aplicacao: "border-rose-500/25 bg-rose-500/10 text-rose-700",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function subjectOf(guide: Guide) {
  return getGuideTrailSubject(guide) ?? UNCATEGORIZED;
}

function stageOf(guide: Guide) {
  return getGuideTrailStage(guide);
}

function statusLabel(guide: Guide) {
  if (guide.is_published) return "Publicado";
  return "Rascunho";
}

export default function AdminGuidesClient() {
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(ALL_SUBJECTS);
  const [view, setView] = useState<GuideView>("journey");
  const { data: guides = [], isLoading } = useGuides(true);

  const filteredGuides = useMemo(() => {
    const term = normalize(query);

    return guides.filter((guide) => {
      const subject = subjectOf(guide);
      const stage = stageOf(guide);
      const stageLabel = TRAIL_STAGES.find((item) => item.value === stage)?.label ?? "";
      const matchesSubject = selectedSubject === ALL_SUBJECTS || subject === selectedSubject;

      if (!matchesSubject) return false;
      if (!term) return true;

      return normalize(
        [
          guide.title,
          guide.slug,
          guide.short_description,
          guide.category,
          guide.public_category,
          subject,
          stageLabel,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(term);
    });
  }, [guides, query, selectedSubject]);

  const coverages = useMemo(() => buildAllTrailCoverages(guides), [guides]);

  const subjectOptions = useMemo(() => {
    const subjects = new Map<string, { subject: string; total: number; coverage: TrailSubjectCoverage | null }>();

    coverages.forEach((coverage) => {
      subjects.set(coverage.subject, {
        subject: coverage.subject,
        total: TRAIL_STAGES.reduce((sum, stage) => sum + coverage.stages[stage.value].guides.length, 0),
        coverage,
      });
    });

    const uncategorized = guides.filter((guide) => !getGuideTrailSubject(guide));
    if (uncategorized.length > 0) {
      subjects.set(UNCATEGORIZED, {
        subject: UNCATEGORIZED,
        total: uncategorized.length,
        coverage: null,
      });
    }

    return Array.from(subjects.values()).sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      return a.subject.localeCompare(b.subject, "pt-BR");
    });
  }, [coverages, guides]);

  const visibleCoverage = useMemo(() => {
    if (selectedSubject === ALL_SUBJECTS || selectedSubject === UNCATEGORIZED) return null;
    return buildTrailCoverage(guides, selectedSubject);
  }, [guides, selectedSubject]);

  const boardByStage = useMemo(() => {
    const grouped = TRAIL_STAGES.reduce(
      (acc, stage) => {
        acc[stage.value] = [] as Guide[];
        return acc;
      },
      {} as Record<TrailStage, Guide[]>,
    );

    filteredGuides.forEach((guide) => {
      const stage = stageOf(guide);
      if (stage) grouped[stage].push(guide);
    });

    return grouped;
  }, [filteredGuides]);

  const uncategorizedGuides = useMemo(
    () => filteredGuides.filter((guide) => !stageOf(guide)),
    [filteredGuides],
  );

  const publishedCount = filteredGuides.filter((guide) => guide.is_published).length;
  const draftCount = filteredGuides.length - publishedCount;
  const mappedCount = filteredGuides.filter((guide) => stageOf(guide)).length;
  const mappedPercent = filteredGuides.length > 0 ? Math.round((mappedCount / filteredGuides.length) * 100) : 0;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Layers3 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Mapa editorial</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Guias</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Visualize o acervo por tema e etapa da jornada: busca, exploração, decisão, validação, expansão e aplicação.
          </p>
        </div>

        <Button asChild className="w-full xl:w-auto">
          <Link href="/admin/fluxo-guias">
            <Sparkles className="h-4 w-4" />
            Criar no fluxo
          </Link>
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Guias filtrados" value={filteredGuides.length} detail={`${publishedCount} publicados`} />
        <MetricCard label="Mapeados" value={`${mappedPercent}%`} detail={`${mappedCount} com etapa reconhecida`} />
        <MetricCard label="Rascunhos" value={draftCount} detail="fora do público" />
        <MetricCard
          label="Temas"
          value={subjectOptions.filter((item) => item.total > 0).length}
          detail="clusters editoriais"
        />
      </section>

      <section className="rounded-[var(--admin-radius)] border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, tema, etapa, categoria ou slug..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <SubjectButton
              active={selectedSubject === ALL_SUBJECTS}
              onClick={() => setSelectedSubject(ALL_SUBJECTS)}
            >
              Todos
            </SubjectButton>
            {subjectOptions
              .filter((item) => item.total > 0)
              .slice(0, 8)
              .map((item) => (
                <SubjectButton
                  key={item.subject}
                  active={selectedSubject === item.subject}
                  onClick={() => setSelectedSubject(item.subject)}
                >
                  {item.subject}
                  <span className="ml-1 text-[11px] opacity-70">{item.total}</span>
                </SubjectButton>
              ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--admin-radius)] border border-border/60 bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-[calc(var(--admin-radius)-0.4rem)] bg-muted/45 p-1">
          <ViewButton active={view === "journey"} onClick={() => setView("journey")} icon={ListTree}>
            Jornada
          </ViewButton>
          <ViewButton active={view === "map"} onClick={() => setView("map")} icon={GitBranch}>
            Mapa do tema
          </ViewButton>
          <ViewButton active={view === "questions"} onClick={() => setView("questions")} icon={MessageCircleQuestion}>
            Dúvidas
          </ViewButton>
        </div>
        <p className="px-2 text-xs text-muted-foreground">
          {view === "journey" && "Organize os guias pela etapa editorial."}
          {view === "map" && "Veja a página central e seus desdobramentos."}
          {view === "questions" && "Planeje as respostas que conduzem o usuário."}
        </p>
      </section>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <Skeleton className="h-[520px] rounded-[var(--admin-radius)]" />
          <Skeleton className="h-[520px] rounded-[var(--admin-radius)]" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-[var(--admin-radius)] border border-border/60 bg-card p-3 shadow-sm">
              <div className="px-2 py-1">
                <h2 className="text-sm font-semibold">Temas</h2>
                <p className="text-xs text-muted-foreground">Cobertura por etapa da jornada.</p>
              </div>

              <div className="mt-3 space-y-2">
                {subjectOptions
                  .filter((item) => item.total > 0)
                  .map((item) => (
                    <button
                      key={item.subject}
                      type="button"
                      onClick={() => setSelectedSubject(item.subject)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors",
                        selectedSubject === item.subject
                          ? "border-primary/35 bg-primary/10"
                          : "border-border/60 bg-background/60 hover:border-primary/25 hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.subject}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.coverage ? `${item.coverage.coveredCount} de 6 etapas` : "sem etapa clara"}
                          </p>
                        </div>
                        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold shadow-sm">
                          {item.total}
                        </span>
                      </div>

                      {item.coverage ? (
                        <div className="mt-3 grid grid-cols-6 gap-1">
                          {TRAIL_STAGES.map((stage) => {
                            const status = item.coverage?.stages[stage.value].status;
                            return (
                              <span
                                key={stage.value}
                                title={`${stage.label}: ${status === "missing" ? "faltando" : status === "published" ? "publicado" : "rascunho"}`}
                                className={cn(
                                  "h-2 rounded-full",
                                  status === "published" && "bg-emerald-500",
                                  status === "draft" && "bg-amber-500",
                                  status === "missing" && "bg-muted",
                                )}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </button>
                  ))}
              </div>
            </section>

            {visibleCoverage?.recommendation && (
              <section className="rounded-[var(--admin-radius)] border border-primary/20 bg-primary/5 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">Próxima peça sugerida</h2>
                </div>
                <p className="mt-3 text-sm font-semibold">{visibleCoverage.recommendation.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {visibleCoverage.recommendation.reason}
                </p>
                <Button asChild size="sm" className="mt-4 w-full">
                  <Link href="/admin/fluxo-guias">
                    Abrir fluxo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </section>
            )}
          </aside>

          <section className="overflow-hidden rounded-[var(--admin-radius)] border border-border/60 bg-card shadow-sm">
            <div className="flex flex-col gap-2 border-b border-border/60 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedSubject === ALL_SUBJECTS
                    ? view === "journey" ? "Todos os guias por jornada" : "Selecione um tema"
                    : selectedSubject}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {view === "journey" && "Cards agrupados pela etapa editorial reconhecida no fluxo."}
                  {view === "map" && "Tema, página central e conteúdos que sustentam o cluster."}
                  {view === "questions" && "Dúvidas organizadas na ordem em que o usuário precisa resolvê-las."}
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {filteredGuides.length} guia(s)
              </Badge>
            </div>

            {view !== "journey" && !visibleCoverage ? (
              <SelectThemePrompt subjects={subjectOptions.filter((item) => item.total > 0)} onSelect={setSelectedSubject} />
            ) : null}

            {view === "journey" && <div className="overflow-x-auto">
              <div className="grid min-w-[1180px] grid-cols-6 gap-3 p-4">
                {TRAIL_STAGES.map((stage) => {
                  const items = boardByStage[stage.value];
                  return (
                    <div key={stage.value} className="rounded-xl border border-border/60 bg-muted/25">
                      <div className="border-b border-border/60 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge variant="outline" className={cn("text-xs", stageTone[stage.value])}>
                              {stage.label}
                            </Badge>
                            <p className="mt-2 text-xs leading-snug text-muted-foreground">
                              {stage.description}
                            </p>
                          </div>
                          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold shadow-sm">
                            {items.length}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 p-2">
                        {items.length === 0 ? (
                          <EmptyStage />
                        ) : (
                          items.map((guide) => <GuideCard key={guide.id} guide={guide} />)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>}

            {view === "map" && visibleCoverage ? <TopicMap coverage={visibleCoverage} /> : null}
            {view === "questions" && visibleCoverage ? <QuestionsMap coverage={visibleCoverage} /> : null}

            {view === "journey" && uncategorizedGuides.length > 0 && (
              <div className="border-t border-border/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CircleDashed className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Sem etapa reconhecida</h3>
                  <Badge variant="outline">{uncategorizedGuides.length}</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {uncategorizedGuides.map((guide) => (
                    <GuideCard key={guide.id} guide={guide} compact />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="rounded-[var(--admin-radius)] border border-border/60 bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SubjectButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function GuideCard({ guide, compact = false }: { guide: Guide; compact?: boolean }) {
  const subject = subjectOf(guide);
  const hasLinks = Array.isArray(guide.internal_links) && guide.internal_links.length > 0;

  return (
    <article className="rounded-lg border border-border/60 bg-background p-3 shadow-sm transition-colors hover:border-primary/25">
      <div className="flex items-start justify-between gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-[11px]",
            guide.is_published
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
              : "border-amber-500/20 bg-amber-500/10 text-amber-700",
          )}
        >
          {statusLabel(guide)}
        </Badge>
        {guide.is_featured && (
          <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[11px]">
            Destaque
          </Badge>
        )}
      </div>

      <h3 className={cn("mt-3 font-semibold leading-snug text-foreground", compact ? "text-sm" : "text-[13px]")}>
        {guide.title}
      </h3>
      {!compact && guide.short_description && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {guide.short_description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {subject}
        </Badge>
        {guide.public_category && (
          <Badge variant="outline" className="text-[10px]">
            {guide.public_category}
          </Badge>
        )}
        {hasLinks && (
          <Badge variant="outline" className="text-[10px]">
            <BookOpenCheck className="mr-1 h-3 w-3" />
            links
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <Button asChild size="sm" variant="outline" className="h-8 flex-1 px-2 text-xs">
          <Link href={`/admin/fluxo-guias?guide=${guide.id}`}>
            <PenLine className="h-3.5 w-3.5" />
            Fluxo
          </Link>
        </Button>
        {guide.slug && (
          <Button asChild size="icon" variant="outline" className="h-8 w-8">
            <Link href={`/guias/${guide.slug}`} target="_blank" aria-label="Abrir guia público">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function EmptyStage() {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/60 p-3 text-center">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <p className="mt-2 text-xs font-medium text-muted-foreground">Sem guia nesta etapa</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">Boa lacuna para preencher.</p>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-[calc(var(--admin-radius)-0.65rem)] px-3 text-xs font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function SelectThemePrompt({
  subjects,
  onSelect,
}: {
  subjects: Array<{ subject: string; total: number }>;
  onSelect: (subject: string) => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <GitBranch className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Escolha um tema para montar o mapa</h3>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        O sistema cruza os guias existentes, identifica o que já foi respondido e destaca as lacunas editoriais.
      </p>
      <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
        {subjects.map((item) => (
          <Button key={item.subject} type="button" variant="outline" size="sm" onClick={() => onSelect(item.subject)}>
            {item.subject}
            <span className="text-[10px] text-muted-foreground">{item.total}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function primaryGuide(guides: Guide[]) {
  return guides.find((guide) => guide.is_published) ?? guides[0] ?? null;
}

function creationUrl(coverage: TrailSubjectCoverage, stage: TrailStage) {
  const recommendation = buildTrailRecommendation(coverage.subject, stage, coverage.stages);
  const params = new URLSearchParams({
    subject: recommendation.subject,
    stage: recommendation.stage,
    title: recommendation.title,
    keyword: recommendation.keyword,
    intent: recommendation.intent,
    category: recommendation.internalCategory,
    publicCategory: recommendation.publicCategory,
    context: recommendation.context,
  });
  return `/admin/fluxo-guias?${params.toString()}`;
}

function statusMeta(status: "published" | "draft" | "missing") {
  if (status === "published") return { label: "Publicado", dot: "bg-emerald-500", badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600" };
  if (status === "draft") return { label: "Rascunho", dot: "bg-amber-500", badge: "border-amber-500/25 bg-amber-500/10 text-amber-600" };
  return { label: "Lacuna", dot: "bg-muted-foreground/35", badge: "border-border bg-muted/45 text-muted-foreground" };
}

function TopicMap({ coverage }: { coverage: TrailSubjectCoverage }) {
  const hubGuide = primaryGuide(coverage.stages.busca.guides);
  const hubTitle = hubGuide?.title ?? `Guia completo sobre ${coverage.subject.toLowerCase()}`;

  return (
    <div className="overflow-x-auto p-5 md:p-8">
      <div className="mx-auto min-w-[850px] max-w-6xl">
        <MapNode eyebrow="Tema principal" title={coverage.subject} tone="primary" />
        <Connector vertical />
        <MapNode
          eyebrow={hubGuide ? "Página central encontrada" : "Página central sugerida"}
          title={hubTitle}
          status={coverage.stages.busca.status}
          href={hubGuide ? `/admin/fluxo-guias?guide=${hubGuide.id}` : creationUrl(coverage, "busca")}
        />
        <div className="mx-auto h-8 w-px bg-border" />
        <div className="relative pt-8">
          <div className="absolute left-[8.33%] right-[8.33%] top-0 h-px bg-border" />
          <div className="grid grid-cols-6 gap-3">
            {TRAIL_STAGES.map((stage) => {
              const item = coverage.stages[stage.value];
              const guide = primaryGuide(item.guides);
              const recommendation = buildTrailRecommendation(coverage.subject, stage.value, coverage.stages);
              return (
                <div key={stage.value} className="relative">
                  <div className="absolute left-1/2 -top-8 h-8 w-px bg-border" />
                  <MapNode
                    eyebrow={stage.label}
                    title={guide?.title ?? recommendation.title}
                    status={item.status}
                    href={guide ? `/admin/fluxo-guias?guide=${guide.id}` : creationUrl(coverage, stage.value)}
                    compact
                  />
                  {item.guides.length > 1 && (
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">+{item.guides.length - 1} conteúdo(s)</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <MapLegend />
      </div>
    </div>
  );
}

function MapNode({
  eyebrow,
  title,
  status,
  href,
  tone,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  status?: "published" | "draft" | "missing";
  href?: string;
  tone?: "primary";
  compact?: boolean;
}) {
  const meta = status ? statusMeta(status) : null;
  const content = (
    <div className={cn(
      "mx-auto flex flex-col border text-center shadow-sm transition-colors",
      compact ? "min-h-32 w-full p-3" : "min-h-24 w-[360px] justify-center p-4",
      tone === "primary" ? "border-primary/35 bg-primary/10" : "border-border/70 bg-background hover:border-primary/35",
    )}>
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {meta && <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />}
        {eyebrow}
      </div>
      <p className={cn("mt-2 font-semibold leading-snug", compact ? "line-clamp-4 text-xs" : "text-sm")}>{title}</p>
      {href && (
        <span className="mt-auto pt-3 text-[10px] font-semibold text-primary">
          {status === "missing" ? "Criar conteúdo →" : "Abrir no fluxo →"}
        </span>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function Connector({ vertical }: { vertical?: boolean }) {
  return vertical ? <div className="mx-auto h-8 w-px bg-border" /> : null;
}

const QUESTION_COPY: Record<TrailStage, { question: (subject: string) => string; answer: string }> = {
  busca: { question: (subject) => `O que é ${subject.toLowerCase()} e por onde começo?`, answer: "Dê uma resposta direta, defina o assunto e mostre o primeiro passo." },
  exploracao: { question: (subject) => `Onde encontro as melhores opções de ${subject.toLowerCase()}?`, answer: "Organize alternativas confiáveis e explique para quem cada caminho serve." },
  decisao: { question: (subject) => `Como escolher ${subject.toLowerCase()} sem perder tempo?`, answer: "Apresente critérios objetivos, comparações e uma forma simples de decidir." },
  validacao: { question: (subject) => `Como saber se ${subject.toLowerCase()} é confiável e vale a pena?`, answer: "Reduza o risco com sinais de confiança, limites, custos e pontos de atenção." },
  expansao: { question: (subject) => `Que outros benefícios ${subject.toLowerCase()} pode oferecer?`, answer: "Mostre usos complementares e oportunidades que o leitor talvez ainda não conheça." },
  aplicacao: { question: (subject) => `Como começar com ${subject.toLowerCase()} agora?`, answer: "Entregue um passo a passo executável, com requisitos e próxima ação clara." },
};

function QuestionsMap({ coverage }: { coverage: TrailSubjectCoverage }) {
  const missing = coverage.missingStages.length;
  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-8">
      <div className="mx-auto w-full max-w-3xl">
        {TRAIL_STAGES.map((stage, index) => {
          const item = coverage.stages[stage.value];
          const guide = primaryGuide(item.guides);
          const copy = QUESTION_COPY[stage.value];
          const meta = statusMeta(item.status);
          return (
            <div key={stage.value} className="relative pb-5 last:pb-0">
              {index < TRAIL_STAGES.length - 1 && <div className="absolute left-6 top-12 h-full w-px bg-border" />}
              <article className="relative rounded-[var(--admin-radius)] border border-border/70 bg-background p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={cn("relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", item.status === "missing" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                    {item.status === "published" ? <CheckCircle2 className="h-5 w-5" /> : item.status === "draft" ? <PenLine className="h-5 w-5" /> : <MessageCircleQuestion className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", meta.badge)}>{meta.label}</Badge>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stage.label}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold">{copy.question(coverage.subject)}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.answer}</p>
                    {guide && <p className="mt-3 line-clamp-1 text-[11px] text-muted-foreground">Conteúdo associado: <strong className="text-foreground">{guide.title}</strong></p>}
                  </div>
                  <Button asChild size="sm" variant={item.status === "missing" ? "default" : "outline"} className="shrink-0">
                    <Link href={guide ? `/admin/fluxo-guias?guide=${guide.id}` : creationUrl(coverage, stage.value)}>
                      {item.status === "missing" ? <Plus className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
                      {item.status === "missing" ? "Criar" : "Abrir"}
                    </Link>
                  </Button>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      <aside className="h-fit rounded-[var(--admin-radius)] border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><h3 className="text-sm font-semibold">Orientação editorial</h3></div>
        <p className="mt-4 text-3xl font-bold tabular-nums">{coverage.integrity}%</p>
        <p className="mt-1 text-xs text-muted-foreground">das dúvidas essenciais possuem conteúdo associado.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${coverage.integrity}%` }} /></div>
        {coverage.recommendation ? (
          <div className="mt-5 border-t border-primary/15 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Próxima resposta prioritária</p>
            <p className="mt-2 text-sm font-semibold">{QUESTION_COPY[coverage.recommendation.stage].question(coverage.subject)}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{coverage.recommendation.reason}</p>
            <Button asChild size="sm" className="mt-4 w-full"><Link href={creationUrl(coverage, coverage.recommendation.stage)}>Criar resposta no fluxo<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-600">Todas as etapas estão cobertas. Revise desempenho e atualize os conteúdos com menor resultado.</p>
        )}
        <p className="mt-4 text-[10px] text-muted-foreground">{missing} lacuna(s) identificada(s). Rascunhos são contados como cobertura, mas continuam fora do público.</p>
      </aside>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-4 text-[11px] text-muted-foreground">
      {(["published", "draft", "missing"] as const).map((status) => {
        const meta = statusMeta(status);
        return <span key={status} className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", meta.dot)} />{meta.label}</span>;
      })}
    </div>
  );
}
