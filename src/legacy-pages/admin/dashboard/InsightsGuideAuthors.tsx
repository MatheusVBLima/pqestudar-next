"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownUp, BookOpen, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Eye, FilePenLine, Filter, RotateCcw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { PeriodSelector, type Period } from "@/components/admin/dashboard/PeriodSelector";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { periodToRange } from "@/components/admin/dashboard/periodHelper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type GuideMetric = { id: string; title: string; slug: string; is_published: boolean; views: number; opens: number; cta_clicks: number; internal_link_clicks: number; avg_read_seconds: number; avg_max_scroll: number };
type AuthorMetric = { user_id: string | null; name: string; email: string | null; roles: string[]; published_guides: number; draft_guides: number; views: number; opens: number; cta_clicks: number; guides: GuideMetric[] };
type RankingMetric = "views" | "published_guides" | "cta_clicks";
type GuideFilterMetric = "views" | "opens" | "cta_clicks" | "internal_link_clicks" | "avg_read_seconds" | "avg_max_scroll";
const COLORS = ["hsl(var(--primary))", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];
const LABELS: Record<RankingMetric, string> = { views: "Visualizações", published_guides: "Guias publicados", cta_clicks: "Cliques em CTA" };

export default function InsightsGuideAuthors() {
  const [period, setPeriod] = useState<Period>("month");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [metric, setMetric] = useState<RankingMetric>("views");
  const [openAuthors, setOpenAuthors] = useState<Set<string>>(new Set());
  const range = periodToRange(period);
  const query = useQuery({
    queryKey: ["insights-guide-authors", period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-guide-author-analytics", { body: { start_at: range.start_at, end_at: range.end_at } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return (data?.authors ?? []) as AuthorMetric[];
    },
    staleTime: 300_000,
  });
  const authors = query.data ?? [];
  const ranking = useMemo(() => authors.filter((author) => author.roles?.some((role) => role === "admin" || role === "moderator")).map((author) => ({ name: author.name, value: author[metric] })).sort((a, b) => b.value - a.value), [authors, metric]);
  const totals = authors.reduce((acc, author) => ({ authors: acc.authors + (author.user_id ? 1 : 0), published: acc.published + author.published_guides, drafts: acc.drafts + author.draft_guides, views: acc.views + author.views }), { authors: 0, published: 0, drafts: 0, views: 0 });
  const toggle = (key: string, open: boolean) => setOpenAuthors((current) => { const next = new Set(current); open ? next.add(key) : next.delete(key); return next; });

  return <div className="space-y-6">
    <PageHeader title="Guias — Desempenho por autor" description="Produção e desempenho editorial separados pela conta responsável por cada guia." actions={<PeriodSelector value={period} onChange={setPeriod} />} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard title="Autores vinculados" value={String(totals.authors)} icon={Users} /><StatCard title="Guias publicados" value={String(totals.published)} icon={BookOpen} /><StatCard title="Rascunhos" value={String(totals.drafts)} icon={FilePenLine} /><StatCard title="Visualizações" value={totals.views.toLocaleString("pt-BR")} icon={Eye} /></div>
    {query.isLoading ? <Card className="p-6 text-sm text-muted-foreground">Carregando desempenho dos autores...</Card> : query.isError ? <Card className="border-destructive/30 p-6 text-sm text-destructive">Não foi possível carregar as métricas por autor. {query.error.message}</Card> : <>
      <Card className="rounded-[var(--admin-radius)] p-5 shadow-card">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Ranking de admins e moderadores</h2><p className="text-sm text-muted-foreground">Comparação no período selecionado acima.</p></div><div className="flex flex-wrap gap-2"><Select value={metric} onValueChange={(value) => setMetric(value as RankingMetric)}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><div className="flex rounded-md border p-1"><Button size="sm" variant={chartType === "bar" ? "default" : "ghost"} onClick={() => setChartType("bar")}>Barras</Button><Button size="sm" variant={chartType === "pie" ? "default" : "ghost"} onClick={() => setChartType("pie")}>Pizza</Button></div></div></div>
        {ranking.length === 0 ? <div className="flex h-64 items-center justify-center text-center text-sm text-muted-foreground">Ainda não há guias vinculados a contas admin ou moderador neste período.</div> : <div className="h-80"><ResponsiveContainer>{chartType === "bar" ? <BarChart data={ranking} layout="vertical" margin={{ left: 12, right: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => [Number(value).toLocaleString("pt-BR"), LABELS[metric]]} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} /></BarChart> : <PieChart><Pie data={ranking} dataKey="value" nameKey="name" outerRadius={110} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>{ranking.map((item, index) => <Cell key={`${item.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [Number(value).toLocaleString("pt-BR"), LABELS[metric]]} /></PieChart>}</ResponsiveContainer></div>}
      </Card>
      <div className="space-y-4">{authors.map((author, index) => {
        const key = author.user_id ?? `legacy:${author.name}:${index}`;
        const open = openAuthors.has(key);
        return <Collapsible key={key} open={open} onOpenChange={(next) => toggle(key, next)}><Card className="overflow-hidden rounded-[var(--admin-radius)] shadow-card"><CollapsibleTrigger asChild><button type="button" className="grid w-full gap-4 p-5 text-left md:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(80px,auto))_auto] md:items-center"><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate font-semibold">{author.name}</span>{author.roles?.map((role) => <Badge key={role} variant="secondary">{role}</Badge>)}</span><span className="block truncate text-xs text-muted-foreground">{author.email ?? "Sem conta vinculada"}</span></span><Metric label="Publicados" value={author.published_guides} /><Metric label="Rascunhos" value={author.draft_guides} /><Metric label="Views" value={author.views} /><Metric label="Visitantes" value={author.opens} /><Metric label="CTA" value={author.cta_clicks} /><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button></CollapsibleTrigger><CollapsibleContent><GuideTable guides={author.guides} /></CollapsibleContent></Card></Collapsible>;
      })}{authors.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum guia encontrado. A página está pronta para exibir os autores assim que houver conteúdo vinculado.</Card>}</div>
    </>}
  </div>;
}

function GuideTable({ guides }: { guides: GuideMetric[] }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [filterMetric, setFilterMetric] = useState<GuideFilterMetric>("views");
  const [minimum, setMinimum] = useState("");
  const [direction, setDirection] = useState<"desc" | "asc">("desc");
  const minimumValue = minimum === "" ? null : Number(minimum);
  const filteredGuides = useMemo(() => guides
    .filter((guide) => status === "all" || (status === "published" ? guide.is_published : !guide.is_published))
    .filter((guide) => minimumValue === null || !Number.isFinite(minimumValue) || guide[filterMetric] >= minimumValue)
    .sort((a, b) => direction === "desc" ? b[filterMetric] - a[filterMetric] : a[filterMetric] - b[filterMetric]), [guides, status, minimumValue, filterMetric, direction]);
  const pageCount = Math.max(1, Math.ceil(filteredGuides.length / pageSize));
  useEffect(() => setPage((current) => Math.min(current, pageCount)), [pageCount]);
  const visibleGuides = filteredGuides.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = status !== "all" || minimum !== "";
  const resetFilters = () => { setStatus("all"); setFilterMetric("views"); setMinimum(""); setDirection("desc"); setPage(1); };

  return <div className="border-t">
    <div className="flex items-center gap-2 border-b px-5 py-3">
      <Button type="button" size="icon" variant={filtersOpen || hasFilters ? "secondary" : "ghost"} className="rounded-full" onClick={() => setFiltersOpen((open) => !open)} aria-label="Mostrar filtros"><Filter className="h-4 w-4" /></Button>
      <Button type="button" size="icon" variant="ghost" className="rounded-full" onClick={() => setDirection((value) => value === "desc" ? "asc" : "desc")} aria-label="Alternar ordenação"><ArrowDownUp className="h-4 w-4" /></Button>
      {hasFilters && <><Badge variant="secondary">Filtros ativos</Badge><Button type="button" size="sm" variant="ghost" onClick={resetFilters}><RotateCcw className="mr-1 h-4 w-4" />Limpar</Button></>}
      <span className="ml-auto text-xs text-muted-foreground">{filteredGuides.length} de {guides.length}</span>
    </div>
    {filtersOpen && <div className="grid gap-3 border-b bg-muted/20 px-5 py-4 sm:grid-cols-2 xl:grid-cols-[14rem_14rem_12rem_12rem_auto]">
      <Select value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Status: todos</SelectItem><SelectItem value="published">Publicado</SelectItem><SelectItem value="draft">Rascunho</SelectItem></SelectContent></Select>
      <Select value={filterMetric} onValueChange={(value) => { setFilterMetric(value as GuideFilterMetric); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="views">Views</SelectItem><SelectItem value="opens">Visitantes</SelectItem><SelectItem value="cta_clicks">CTAs</SelectItem><SelectItem value="internal_link_clicks">Links</SelectItem><SelectItem value="avg_read_seconds">Leitura</SelectItem><SelectItem value="avg_max_scroll">Scroll</SelectItem></SelectContent></Select>
      <Input type="number" min="0" step="any" value={minimum} onChange={(event) => { setMinimum(event.target.value); setPage(1); }} placeholder="Valor mínimo" aria-label="Valor mínimo da métrica" />
      <Select value={direction} onValueChange={(value) => { setDirection(value as typeof direction); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="desc">Maior primeiro</SelectItem><SelectItem value="asc">Menor primeiro</SelectItem></SelectContent></Select>
      <Button type="button" variant="outline" onClick={resetFilters}><RotateCcw className="mr-2 h-4 w-4" />Limpar filtros</Button>
    </div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left">Guia</th><th>Status</th><th>Views</th><th>Visitantes</th><th>CTA</th><th>Links</th><th>Leitura</th><th>Scroll</th><th className="px-5 text-right">Abrir</th></tr></thead><tbody className="divide-y">{visibleGuides.map((guide) => <tr key={guide.id}><td className="px-5 py-3"><p className="font-medium">{guide.title}</p><p className="text-xs text-muted-foreground">/guias/{guide.slug}</p></td><td className="px-3"><Badge variant={guide.is_published ? "default" : "secondary"}>{guide.is_published ? "Publicado" : "Rascunho"}</Badge></td><CellValue value={guide.views} /><CellValue value={guide.opens} /><CellValue value={guide.cta_clicks} /><CellValue value={guide.internal_link_clicks} /><CellValue value={`${guide.avg_read_seconds}s`} /><CellValue value={`${guide.avg_max_scroll}%`} /><td className="px-5 py-2 text-right"><Button asChild type="button" size="icon" variant="ghost" className="h-8 w-8"><Link href={`/guias/${guide.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${guide.title}`} title="Abrir guia em nova aba"><ExternalLink className="h-4 w-4" /></Link></Button></td></tr>)}</tbody></table></div>
    {filteredGuides.length === 0 && <div className="border-t px-5 py-8 text-center text-sm text-muted-foreground">Nenhum guia corresponde aos filtros selecionados.</div>}
    {filteredGuides.length > pageSize && <div className="flex flex-col gap-3 border-t px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="text-muted-foreground">Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredGuides.length)} de {filteredGuides.length} guias</span><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><span className="min-w-20 text-center tabular-nums">{page} de {pageCount}</span><Button type="button" variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}
  </div>;
}
function CellValue({ value }: { value: number | string }) { return <td className="px-3 py-3 text-right tabular-nums">{value}</td>; }
function Metric({ label, value }: { label: string; value: number }) { return <span><span className="block text-[10px] uppercase text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</span></span>; }
