import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

const INSIGHTS_CACHE = {
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
  placeholderData: keepPreviousData,
};
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  PenTool, Play, CheckCircle2, XCircle, Clock, ArrowUp, ArrowDown, Minus, ChevronLeft,
} from "lucide-react";

// ─── Types ───

interface AuditRun {
  id: string;
  created_at: string;
  audit_type: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  summary: {
    avg_score?: number;
    urls_count?: number;
    total_findings?: number;
    issues?: { High?: number; Medium?: number; Low?: number };
  } | null;
}

interface Finding {
  id: string;
  run_id: string;
  url: string;
  path: string;
  score: number;
  issues: {
    category: string;
    issue: string;
    impact: string;
    evidence: string;
    fix: string;
    priority: number;
  }[];
  raw: Record<string, unknown>;
}

// ─── Helpers ───

function scoreBadge(score: number) {
  const health = score >= 85 ? "good" : score >= 65 ? "ok" : "poor";
  const v = health === "good" ? "default" : health === "ok" ? "secondary" : "destructive";
  return <Badge variant={v}>{score}</Badge>;
}

function impactBadge(impact: string) {
  const v = impact === "High" ? "destructive" : impact === "Medium" ? "secondary" : "outline";
  return <Badge variant={v}>{impact}</Badge>;
}

function statusIcon(status: string) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground animate-spin" />;
}

function deltaIcon(current: number, previous: number) {
  if (current > previous) return <ArrowUp className="h-3 w-3 text-primary inline" />;
  if (current < previous) return <ArrowDown className="h-3 w-3 text-destructive inline" />;
  return <Minus className="h-3 w-3 text-muted-foreground inline" />;
}

// ─── Component ───

export default function CopywritingAuditSection() {
  const qc = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [compareRunId, setCompareRunId] = useState<string | null>(null);
  const [drilldownFinding, setDrilldownFinding] = useState<Finding | null>(null);
  const [view, setView] = useState<"urls" | "issues">("urls");

  // ─── Queries ───

  const runsQuery = useQuery({
    queryKey: ["insights_audit_runs", "copywriting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights_audit_runs")
        .select("*")
        .eq("audit_type", "copywriting")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AuditRun[];
    },
    ...INSIGHTS_CACHE,
  });

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data]);
  const latestRun = runs[0] || null;
  const activeRunId = selectedRunId || latestRun?.id || null;

  const findingsQuery = useQuery({
    queryKey: ["insights_audit_findings", "copywriting", activeRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights_audit_findings")
        .select("*")
        .eq("run_id", activeRunId!)
        .eq("audit_type", "copywriting")
        .order("score", { ascending: true });
      if (error) throw error;
      return data as unknown as Finding[];
    },
    enabled: !!activeRunId,
    ...INSIGHTS_CACHE,
  });

  // Compare
  const compareFindingsQuery = useQuery({
    queryKey: ["insights_audit_findings", "copywriting", compareRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights_audit_findings")
        .select("*")
        .eq("run_id", compareRunId!)
        .eq("audit_type", "copywriting")
        .order("score", { ascending: true });
      if (error) throw error;
      return data as unknown as Finding[];
    },
    enabled: !!compareRunId,
    ...INSIGHTS_CACHE,
  });

  // All issues flattened
  const allIssues = useMemo(() => {
    if (!findingsQuery.data) return [];
    return findingsQuery.data.flatMap(f =>
      f.issues.map((iss, i) => ({ ...iss, path: f.path, findingId: f.id, key: `${f.id}-${i}` }))
    ).sort((a, b) => {
      const impactOrder = { High: 0, Medium: 1, Low: 2 };
      const ai = impactOrder[a.impact as keyof typeof impactOrder] ?? 2;
      const bi = impactOrder[b.impact as keyof typeof impactOrder] ?? 2;
      if (ai !== bi) return ai - bi;
      return a.priority - b.priority;
    });
  }, [findingsQuery.data]);

  // ─── Mutation ───

  const runAudit = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke("insights-copywriting-audit", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (resp.error) throw new Error(resp.error.message || "Falha ao rodar auditoria");
      return resp.data;
    },
    onSuccess: () => {
      toast.success("Auditoria de Copywriting concluída!");
      qc.invalidateQueries({ queryKey: ["insights_audit_runs", "copywriting"] });
      setSelectedRunId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ─── Comparison ───

  const compareData = useMemo(() => {
    if (!compareRunId || !compareFindingsQuery.data) return null;
    const currentRun = runs.find(r => r.id === activeRunId);
    const prevRun = runs.find(r => r.id === compareRunId);
    if (!currentRun || !prevRun) return null;

    const cs = currentRun.summary;
    const ps = prevRun.summary;
    return {
      currentScore: cs?.avg_score ?? 0,
      prevScore: ps?.avg_score ?? 0,
      currentIssues: cs?.issues ?? { High: 0, Medium: 0, Low: 0 },
      prevIssues: ps?.issues ?? { High: 0, Medium: 0, Low: 0 },
    };
  }, [compareRunId, compareFindingsQuery.data, activeRunId, runs]);

  // ─── Render ───

  if (runsQuery.isLoading && !runsQuery.data) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <PenTool className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Copywriting Audit</h2>
      </div>

      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {latestRun ? (
                  <span className="flex items-center gap-2">
                    {statusIcon(latestRun.status)}
                    Última auditoria: {new Date(latestRun.created_at).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(latestRun.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : (
                  "Nenhuma auditoria realizada"
                )}
              </CardTitle>
              {latestRun?.summary && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Score médio: <strong>{latestRun.summary.avg_score ?? "—"}</strong></span>
                  <span>{latestRun.summary.urls_count ?? 0} URLs</span>
                  <span>{latestRun.summary.total_findings ?? 0} issues</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => runAudit.mutate()}
              disabled={runAudit.isPending}
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              {runAudit.isPending ? "Rodando…" : "Rodar auditoria agora"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3">
            {runs.length > 1 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Execução:</span>
                  <Select value={activeRunId ?? ""} onValueChange={(v) => setSelectedRunId(v)}>
                    <SelectTrigger className="w-[220px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {runs.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {new Date(r.created_at).toLocaleDateString("pt-BR")} —{" "}
                          {r.status === "completed" ? `Score ${r.summary?.avg_score ?? "?"}` : r.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Comparar com:</span>
                  <Select value={compareRunId ?? "none"} onValueChange={(v) => setCompareRunId(v === "none" ? null : v)}>
                    <SelectTrigger className="w-[220px] h-8 text-xs">
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {runs.filter(r => r.id !== activeRunId).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {new Date(r.created_at).toLocaleDateString("pt-BR")} —{" "}
                          {r.status === "completed" ? `Score ${r.summary?.avg_score ?? "?"}` : r.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Button variant={view === "urls" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setView("urls")}>URLs</Button>
              <Button variant={view === "issues" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setView("issues")}>Issues</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      {compareData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comparação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Score médio</p>
                <p className="text-lg font-bold">
                  {compareData.currentScore} {deltaIcon(compareData.currentScore, compareData.prevScore)}
                  <span className="text-xs text-muted-foreground ml-1">(era {compareData.prevScore})</span>
                </p>
              </div>
              {(["High", "Medium", "Low"] as const).map((level) => (
                <div key={level}>
                  <p className="text-muted-foreground text-xs">{level}</p>
                  <p className="font-semibold">
                    {compareData.currentIssues[level] ?? 0}{" "}
                    {deltaIcon(compareData.prevIssues[level] ?? 0, compareData.currentIssues[level] ?? 0)}
                    <span className="text-xs text-muted-foreground ml-1">(era {compareData.prevIssues[level] ?? 0})</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* URLs view */}
      {view === "urls" && (
        <Card>
          <CardContent className="p-0">
            {findingsQuery.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !findingsQuery.data?.length ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhum dado disponível.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-right">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findingsQuery.data.map((f) => {
                    const counts = { High: 0, Medium: 0, Low: 0 };
                    f.issues.forEach(iss => {
                      if (iss.impact in counts) counts[iss.impact as keyof typeof counts]++;
                    });
                    return (
                      <TableRow
                        key={f.id}
                        className="cursor-pointer hover:bg-muted/60"
                        onClick={() => setDrilldownFinding(f)}
                      >
                        <TableCell className="font-medium text-xs max-w-[200px] truncate">{f.path}</TableCell>
                        <TableCell className="text-center">{scoreBadge(f.score)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {counts.High > 0 && <span className="text-destructive font-bold mr-1">{counts.High}H</span>}
                          {counts.Medium > 0 && <span className="text-muted-foreground mr-1">{counts.Medium}M</span>}
                          {counts.Low > 0 && <span className="text-muted-foreground">{counts.Low}L</span>}
                          {counts.High === 0 && counts.Medium === 0 && counts.Low === 0 && <span className="text-muted-foreground">✅</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Issues view */}
      {view === "issues" && (
        <Card>
          <CardContent className="p-0">
            {findingsQuery.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : allIssues.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhum issue encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Impact</TableHead>
                    <TableHead className="text-center">Priority</TableHead>
                    <TableHead>URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allIssues.map((iss) => (
                    <TableRow key={iss.key}>
                      <TableCell className="font-medium text-xs max-w-[250px]">{iss.issue}</TableCell>
                      <TableCell className="text-xs capitalize">{iss.category}</TableCell>
                      <TableCell className="text-center">{impactBadge(iss.impact)}</TableCell>
                      <TableCell className="text-center text-xs">{iss.priority}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{iss.path}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drilldown Sheet */}
      <Sheet open={!!drilldownFinding} onOpenChange={(open) => !open && setDrilldownFinding(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {drilldownFinding && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-sm">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDrilldownFinding(null)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {drilldownFinding.path}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Score</p>
                    <p className="text-2xl font-bold">{drilldownFinding.score} {scoreBadge(drilldownFinding.score)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Issues</p>
                    <p className="font-semibold">{drilldownFinding.issues.length}</p>
                  </div>
                </div>

                {/* Raw data */}
                <div className="space-y-2 text-xs">
                  {drilldownFinding.raw.h1 && (
                    <div>
                      <span className="text-muted-foreground">H1:</span>{" "}
                      <span className="font-medium">{String(drilldownFinding.raw.h1)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Palavras:</span>{" "}
                    <span className="font-medium">{String(drilldownFinding.raw.word_count ?? "—")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Média sentença:</span>{" "}
                    <span className="font-medium">{String(drilldownFinding.raw.avg_sentence_length ?? "—")} palavras</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Headings:</span>{" "}
                    <span className="font-medium">{String(drilldownFinding.raw.headings_total ?? "—")} (H2: {String(drilldownFinding.raw.h2_count ?? "—")})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Listas:</span>{" "}
                    <Badge variant={drilldownFinding.raw.has_lists ? "default" : "destructive"} className="text-[10px]">
                      {drilldownFinding.raw.has_lists ? "Sim" : "Não"}
                    </Badge>
                  </div>
                  {Array.isArray(drilldownFinding.raw.cta_buttons) && (drilldownFinding.raw.cta_buttons as string[]).length > 0 && (
                    <div>
                      <span className="text-muted-foreground">CTAs detectados:</span>{" "}
                      <span className="font-medium">{(drilldownFinding.raw.cta_buttons as string[]).slice(0, 5).join(" | ")}</span>
                    </div>
                  )}
                  {Array.isArray(drilldownFinding.raw.buzzwords_found) && (drilldownFinding.raw.buzzwords_found as string[]).length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Buzzwords:</span>{" "}
                      <span className="font-medium">{(drilldownFinding.raw.buzzwords_found as string[]).join(", ")}</span>
                    </div>
                  )}
                  {Array.isArray(drilldownFinding.raw.social_proof_signals) && (drilldownFinding.raw.social_proof_signals as string[]).length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Prova social:</span>{" "}
                      <span className="font-medium">{(drilldownFinding.raw.social_proof_signals as string[]).join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Findings */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Findings ({drilldownFinding.issues.length})</h3>
                  {drilldownFinding.issues.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum issue encontrado — tudo certo! ✅</p>
                  ) : (
                    <div className="space-y-3">
                      {drilldownFinding.issues.map((iss, i) => (
                        <div key={i} className="rounded-md border p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{iss.issue}</span>
                            <div className="flex gap-1">
                              {impactBadge(iss.impact)}
                              <Badge variant="outline" className="text-[10px]">P{iss.priority}</Badge>
                            </div>
                          </div>
                          <p><span className="text-muted-foreground">Evidence:</span> {iss.evidence}</p>
                          <p><span className="text-muted-foreground">Fix:</span> {iss.fix}</p>
                          <p className="text-muted-foreground capitalize">Category: {iss.category}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Penalties breakdown */}
                {Array.isArray(drilldownFinding.raw.penalties) && (drilldownFinding.raw.penalties as { issue: string; points: number }[]).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Penalidades aplicadas</h3>
                    <div className="space-y-1 text-xs">
                      {(drilldownFinding.raw.penalties as { issue: string; points: number }[]).map((p, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{p.issue}</span>
                          <span className="text-destructive font-medium">-{p.points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
