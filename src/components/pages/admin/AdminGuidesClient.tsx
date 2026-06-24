"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CircleDashed,
  ExternalLink,
  FileText,
  Layers3,
  PenLine,
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
  getGuideTrailStage,
  getGuideTrailSubject,
  TRAIL_STAGES,
  type TrailStage,
  type TrailSubjectCoverage,
} from "@/lib/guide-trail-planner";
import { cn } from "@/lib/utils";

const ALL_SUBJECTS = "all";
const UNCATEGORIZED = "Sem tema";

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
                  {selectedSubject === ALL_SUBJECTS ? "Todos os guias por jornada" : selectedSubject}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cards agrupados pela etapa editorial reconhecida no fluxo.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {filteredGuides.length} guia(s)
              </Badge>
            </div>

            <div className="overflow-x-auto">
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
            </div>

            {uncategorizedGuides.length > 0 && (
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
