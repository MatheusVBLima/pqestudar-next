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
  Search, Play, CheckCircle2, XCircle, Clock, ArrowUp, ArrowDown, Minus, ChevronLeft,
} from "lucide-react";

// ─── Types ───

interface AuditRun {
  id: string;
  created_at: string;
  status: string;
  scheduled: boolean;
  started_at: string | null;
  finished_at: string | null;
  urls_count: number;
  summary: {
    avg_score?: number;
    health?: string;
    issues?: { High?: number; Medium?: number; Low?: number };
    total_findings?: number;
  } | null;
}

interface AuditUrl {
  id: string;
  run_id: string;
  url: string;
  path: string;
  status_code: number | null;
  ttfb_ms: number | null;
  title: string | null;
  meta_description: string | null;
  canonical: string | null;
  robots_meta: string | null;
  h1: string | null;
  h1_count: number;
  h2_count: number;
  og_present: boolean;
  schema_types: string[];
  score: number;
  health: string;
}

interface AuditFinding {
  id: string;
  run_id: string;
  url_id: string;
  category: string;
  issue: string;
  impact: string;
  evidence: string | null;
  fix: string | null;
  priority: number;
  meta: Record<string, unknown> | null;
}

// ─── Helpers ───

function healthBadge(health: string) {
  const v = health === "good" ? "default" : health === "ok" ? "secondary" : "destructive";
  return <Badge variant={v}>{health.toUpperCase()}</Badge>;
}

function impactBadge(impact: string) {
  const v = impact === "High" ? "destructive" : impact === "Medium" ? "secondary" : "outline";
  return <Badge variant={v}>{impact}</Badge>;
}

function statusIcon(status: string) {
  if (status === "success") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground animate-spin" />;
}

function deltaIcon(current: number, previous: number) {
  if (current > previous) return <ArrowUp className="h-3 w-3 text-primary inline" />;
  if (current < previous) return <ArrowDown className="h-3 w-3 text-destructive inline" />;
  return <Minus className="h-3 w-3 text-muted-foreground inline" />;
}

// ─── Component ───

export default function SeoAuditSection() {
  const qc = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [compareRunId, setCompareRunId] = useState<string | null>(null);
  const [drilldownUrl, setDrilldownUrl] = useState<AuditUrl | null>(null);
  const [view, setView] = useState<"urls" | "issues">("urls");

  // ─── Queries ───

  const runsQuery = useQuery({
    queryKey: ["seo_audit_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_runs")
        .select("*")
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

  const urlsQuery = useQuery({
    queryKey: ["seo_audit_urls", activeRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_urls")
        .select("*")
        .eq("run_id", activeRunId!)
        .order("score", { ascending: true });
      if (error) throw error;
      return data as AuditUrl[];
    },
    enabled: !!activeRunId,
    ...INSIGHTS_CACHE,
  });

  const findingsQuery = useQuery({
    queryKey: ["seo_audit_findings", activeRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_findings")
        .select("*")
        .eq("run_id", activeRunId!)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as AuditFinding[];
    },
    enabled: !!activeRunId,
    ...INSIGHTS_CACHE,
  });

  // Compare run data
  const compareUrlsQuery = useQuery({
    queryKey: ["seo_audit_urls", compareRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_urls")
        .select("*")
        .eq("run_id", compareRunId!)
        .order("score", { ascending: true });
      if (error) throw error;
      return data as AuditUrl[];
    },
    enabled: !!compareRunId,
    ...INSIGHTS_CACHE,
  });

  const compareFindingsQuery = useQuery({
    queryKey: ["seo_audit_findings", compareRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_findings")
        .select("*")
        .eq("run_id", compareRunId!)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as AuditFinding[];
    },
    enabled: !!compareRunId,
    ...INSIGHTS_CACHE,
  });

  // Drilldown findings
  const drilldownFindings = useMemo(() => {
    if (!drilldownUrl || !findingsQuery.data) return [];
    return findingsQuery.data.filter(f => f.url_id === drilldownUrl.id);
  }, [drilldownUrl, findingsQuery.data]);

  // ─── Mutation: run audit ───

  const runAudit = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke("seo-audit-run", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (resp.error) throw new Error(resp.error.message || "Falha ao rodar auditoria");
      return resp.data;
    },
    onSuccess: () => {
      toast.success("Auditoria SEO concluída!");
      qc.invalidateQueries({ queryKey: ["seo_audit_runs"] });
      setSelectedRunId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ─── Comparison helpers ───

  const compareData = useMemo(() => {
    if (!compareRunId || !compareUrlsQuery.data || !compareFindingsQuery.data) return null;
    const currentRun = runs.find(r => r.id === activeRunId);
    const prevRun = runs.find(r => r.id === compareRunId);
    if (!currentRun || !prevRun) return null;

    const currentScore = (currentRun.summary as AuditRun["summary"])?.avg_score ?? 0;
    const prevScore = (prevRun.summary as AuditRun["summary"])?.avg_score ?? 0;
    const currentIssues = (currentRun.summary as AuditRun["summary"])?.issues ?? { High: 0, Medium: 0, Low: 0 };
    const prevIssues = (prevRun.summary as AuditRun["summary"])?.issues ?? { High: 0, Medium: 0, Low: 0 };

    return { currentScore, prevScore, currentIssues, prevIssues };
  }, [compareRunId, compareUrlsQuery.data, compareFindingsQuery.data, activeRunId, runs]);

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
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">SEO Audit</h2>
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
                  <span>Score médio: <strong>{(latestRun.summary as AuditRun["summary"])?.avg_score ?? "—"}</strong></span>
                  <span>{latestRun.urls_count} URLs</span>
                  {healthBadge((latestRun.summary as AuditRun["summary"])?.health ?? "poor")}
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
            {/* Run selector */}
            {runs.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Execução:</span>
                <Select
                  value={activeRunId ?? ""}
                  onValueChange={(v) => setSelectedRunId(v)}
                >
                  <SelectTrigger className="w-[220px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {new Date(r.created_at).toLocaleDateString("pt-BR")} —{" "}
                        {r.status === "success" ? `Score ${(r.summary as AuditRun["summary"])?.avg_score ?? "?"}` : r.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Compare selector */}
            {runs.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Comparar com:</span>
                <Select
                  value={compareRunId ?? "none"}
                  onValueChange={(v) => setCompareRunId(v === "none" ? null : v)}
                >
                  <SelectTrigger className="w-[220px] h-8 text-xs">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {runs.filter(r => r.id !== activeRunId).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {new Date(r.created_at).toLocaleDateString("pt-BR")} —{" "}
                        {r.status === "success" ? `Score ${(r.summary as AuditRun["summary"])?.avg_score ?? "?"}` : r.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* View toggle */}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant={view === "urls" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setView("urls")}
              >
                URLs
              </Button>
              <Button
                variant={view === "issues" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setView("issues")}
              >
                Issues
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison card */}
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
                  {compareData.currentScore}
                  {" "}
                  {deltaIcon(compareData.currentScore, compareData.prevScore)}
                  <span className="text-xs text-muted-foreground ml-1">
                    (era {compareData.prevScore})
                  </span>
                </p>
              </div>
              {(["High", "Medium", "Low"] as const).map((level) => (
                <div key={level}>
                  <p className="text-muted-foreground text-xs">{level}</p>
                  <p className="font-semibold">
                    {compareData.currentIssues[level] ?? 0}
                    {" "}
                    {deltaIcon(
                      compareData.prevIssues[level] ?? 0,
                      compareData.currentIssues[level] ?? 0
                    )}
                    <span className="text-xs text-muted-foreground ml-1">
                      (era {compareData.prevIssues[level] ?? 0})
                    </span>
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
            {urlsQuery.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !urlsQuery.data?.length ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhum dado disponível.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Health</TableHead>
                    <TableHead className="text-right">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urlsQuery.data.map((u) => {
                    const urlFindings = findingsQuery.data?.filter(f => f.url_id === u.id) || [];
                    const issuesByImpact = { High: 0, Medium: 0, Low: 0 };
                    urlFindings.forEach(f => {
                      if (f.impact in issuesByImpact) issuesByImpact[f.impact as keyof typeof issuesByImpact]++;
                    });

                    return (
                      <TableRow
                        key={u.id}
                        className="cursor-pointer hover:bg-muted/60"
                        onClick={() => setDrilldownUrl(u)}
                      >
                        <TableCell className="font-medium text-xs max-w-[200px] truncate">{u.path}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.status_code === 200 ? "outline" : "destructive"} className="text-xs">
                            {u.status_code ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{u.score}</TableCell>
                        <TableCell className="text-center">{healthBadge(u.health)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {issuesByImpact.High > 0 && <span className="text-destructive font-bold mr-1">{issuesByImpact.High}H</span>}
                          {issuesByImpact.Medium > 0 && <span className="text-muted-foreground mr-1">{issuesByImpact.Medium}M</span>}
                          {issuesByImpact.Low > 0 && <span className="text-muted-foreground">{issuesByImpact.Low}L</span>}
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
            ) : !findingsQuery.data?.length ? (
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
                  {findingsQuery.data.map((f) => {
                    const urlData = urlsQuery.data?.find(u => u.id === f.url_id);
                    return (
                      <TableRow
                        key={f.id}
                        className="cursor-pointer hover:bg-muted/60"
                        onClick={() => urlData && setDrilldownUrl(urlData)}
                      >
                        <TableCell className="font-medium text-xs max-w-[250px]">{f.issue}</TableCell>
                        <TableCell className="text-xs capitalize">{f.category}</TableCell>
                        <TableCell className="text-center">{impactBadge(f.impact)}</TableCell>
                        <TableCell className="text-center text-xs">{f.priority}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{urlData?.path ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drilldown Sheet */}
      <Sheet open={!!drilldownUrl} onOpenChange={(open) => !open && setDrilldownUrl(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {drilldownUrl && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-sm">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDrilldownUrl(null)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {drilldownUrl.path}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Score</p>
                    <p className="text-2xl font-bold">{drilldownUrl.score} {healthBadge(drilldownUrl.health)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status Code</p>
                    <p className="font-semibold">{drilldownUrl.status_code ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">TTFB</p>
                    <p className="font-semibold">{drilldownUrl.ttfb_ms ?? "—"}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">H1 / H2</p>
                    <p className="font-semibold">{drilldownUrl.h1_count} / {drilldownUrl.h2_count}</p>
                  </div>
                </div>

                {/* Meta info */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Title:</span>{" "}
                    <span className="font-medium">{drilldownUrl.title || "—"}</span>
                    {drilldownUrl.title && (
                      <span className="text-muted-foreground ml-1">({drilldownUrl.title.length} chars)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Meta desc:</span>{" "}
                    <span className="font-medium">{drilldownUrl.meta_description?.slice(0, 80) || "—"}</span>
                    {drilldownUrl.meta_description && (
                      <span className="text-muted-foreground ml-1">({drilldownUrl.meta_description.length} chars)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Canonical:</span>{" "}
                    <span className="font-medium">{drilldownUrl.canonical || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Robots:</span>{" "}
                    <span className="font-medium">{drilldownUrl.robots_meta || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">H1:</span>{" "}
                    <span className="font-medium">{drilldownUrl.h1 || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">OG Tags:</span>{" "}
                    <Badge variant={drilldownUrl.og_present ? "default" : "destructive"} className="text-[10px]">
                      {drilldownUrl.og_present ? "Present" : "Missing"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Schema:</span>{" "}
                    {drilldownUrl.schema_types.length > 0
                      ? drilldownUrl.schema_types.map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] mr-1">{t}</Badge>
                        ))
                      : <span className="text-muted-foreground">None</span>}
                  </div>
                </div>

                {/* Findings */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Findings ({drilldownFindings.length})</h3>
                  {drilldownFindings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum issue encontrado — tudo certo! ✅</p>
                  ) : (
                    <div className="space-y-3">
                      {drilldownFindings.map((f) => (
                        <div key={f.id} className="rounded-md border p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{f.issue}</span>
                            <div className="flex gap-1">
                              {impactBadge(f.impact)}
                              <Badge variant="outline" className="text-[10px]">P{f.priority}</Badge>
                            </div>
                          </div>
                          {f.evidence && (
                            <p><span className="text-muted-foreground">Evidence:</span> {f.evidence}</p>
                          )}
                          {f.fix && (
                            <p><span className="text-muted-foreground">Fix:</span> {f.fix}</p>
                          )}
                          <p className="text-muted-foreground capitalize">Category: {f.category}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
