import { devDebug } from '@/lib/dev-log';
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Globe,
  Calendar,
  Hash,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ColetaRun {
  id: string;
  executed_at: string;
  tipo_coleta: string;
  sites_env: unknown;
  tema_consulta: string | null;
  ano_alvo: number;
  profundidade: number | null;
  limite_paginas: number | null;
  limite_resultados: number | null;
  filtros_snapshot: unknown;
  total_urls: number;
  total_novas: number;
  total_ignoradas: number;
  total_erros: number;
  status_execucao: string;
}

interface ColetaRunItem {
  id: string;
  url: string;
  dominio: string;
  tipo_pagina: string;
  status: string;
  motivo_descartar: string | null;
  metodo_coleta: string;
  data_coleta: string;
  ano_alvo: number;
}

interface Props {
  runId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplay?: (run: ColetaRun) => void;
}

const MOTIVO_OPTIONS = [
  { value: "extensao bloqueada", label: "Extensão bloqueada" },
  { value: "caminho bloqueado", label: "Caminho bloqueado" },
  { value: "pagina de listagem", label: "Página de listagem" },
  { value: "fora do ano alvo", label: "Fora do ano alvo" },
  { value: "duplicada", label: "Duplicada" },
  { value: "sem texto relevante", label: "Sem texto relevante" },
  { value: "erro tecnico", label: "Erro técnico" },
];

const ITEMS_PER_PAGE = 20;

export default function ColetaRunDrillDownSheet({ runId, open, onOpenChange, onReplay }: Props) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    tipo?: string;
    status?: string;
    motivo?: string;
  }>({});

  // Reset page when filters change or run changes
  useEffect(() => {
    setPage(1);
  }, [filters, runId]);

  // Reset filters when modal opens with new run
  useEffect(() => {
    if (open && runId) {
      setFilters({});
      setPage(1);
    }
  }, [open, runId]);

  // Fetch run header data
  const {
    data: run,
    isLoading: loadingRun,
    error: runError,
    refetch: refetchRun,
  } = useQuery({
    queryKey: ["coleta-run-detail", runId],
    queryFn: async () => {
      if (!runId) return null;
      
      devDebug("[Coletas] Fetching run details:", runId);
      
      const { data, error } = await supabase
        .from("coleta_runs")
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      
      if (error) {
        console.error("[Coletas] Error fetching run:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error("Execução não encontrada");
      }
      
      devDebug("[Coletas] Run loaded:", {
        runId,
        status: data.status_execucao,
        totals: {
          total: data.total_urls,
          novas: data.total_novas,
          ignoradas: data.total_ignoradas,
          erros: data.total_erros,
        },
      });
      
      return data as unknown as ColetaRun;
    },
    enabled: !!runId && open,
    retry: 1,
  });

  // Fetch items with pagination and filters
  const {
    data: itemsData,
    isLoading: loadingItems,
    error: itemsError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["coleta-run-items", runId, page, filters],
    queryFn: async () => {
      if (!runId) return { items: [], total: 0 };
      
      let query = supabase
        .from("coleta_run_items")
        .select("*", { count: "exact" })
        .eq("run_id", runId)
        .order("data_coleta", { ascending: false });
      
      if (filters.tipo) {
        query = query.eq("tipo_pagina", filters.tipo);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.motivo) {
        query = query.eq("motivo_descartar", filters.motivo);
      }
      
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error("[Coletas] Error fetching items:", error);
        throw error;
      }
      
      return {
        items: (data || []) as unknown as ColetaRunItem[],
        total: count || 0,
      };
    },
    enabled: !!runId && open,
    retry: 1,
  });

  const items = itemsData?.items ?? [];
  const totalItems = itemsData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const handleReplay = () => {
    if (run && onReplay) {
      onReplay(run);
      onOpenChange(false);
    }
  };

  const handleRetry = () => {
    refetchRun();
    refetchItems();
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "novo":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "ignorado":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "erro":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (t: string | null | undefined) => {
    switch (t) {
      case "listagem":
        return <Badge variant="outline" className="text-xs">Listagem</Badge>;
      case "detalhe":
        return <Badge className="text-xs">Detalhe</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{t ?? "—"}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getSitesEnv = (sites: unknown): string[] => {
    if (Array.isArray(sites)) return sites as string[];
    if (typeof sites === "object" && sites !== null) {
      return Object.values(sites as Record<string, unknown>).filter(
        (v): v is string => typeof v === "string"
      );
    }
    return [];
  };

  const isError = !!runError || !!itemsError;
  const errorMessage =
    runError instanceof Error
      ? runError.message
      : itemsError instanceof Error
      ? itemsError.message
      : "Erro ao carregar dados";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
        aria-describedby="drill-down-description"
      >
        {/* Header */}
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2 text-lg">
            {loadingRun ? (
              <Skeleton className="h-6 w-64" />
            ) : run ? (
              <>
                Execução de Coleta — {formatDate(run.executed_at)} • {run.tipo_coleta}
              </>
            ) : (
              "Detalhes da Execução"
            )}
          </SheetTitle>
          <SheetDescription id="drill-down-description">
            URLs processadas nesta rodada com status e motivos de descarte
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Error state */}
          {isError && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-base text-destructive">
                    Erro ao carregar
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
                <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading skeleton for header */}
          {loadingRun && !isError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </div>
            </div>
          )}

          {/* Run summary */}
          {run && !loadingRun && !isError && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{run.total_urls ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total URLs</div>
                </div>
                <div className="p-3 rounded-md bg-emerald-500/10 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {run.total_novas ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Novas</div>
                </div>
                <div className="p-3 rounded-md bg-amber-500/10 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {run.total_ignoradas ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Ignoradas</div>
                </div>
                <div className="p-3 rounded-md bg-destructive/10 text-center">
                  <div className="text-2xl font-bold text-destructive">
                    {run.total_erros ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </div>

              {/* Snapshot info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Configuração da Execução</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Sites:</span>
                    <span className="flex flex-wrap gap-1">
                      {getSitesEnv(run.sites_env).length > 0 ? (
                        getSitesEnv(run.sites_env).map((site, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {site}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ano alvo:</span>
                    <span>{run.ano_alvo ?? "—"}</span>
                  </div>
                  {run.tema_consulta && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tema:</span>
                      <span>{run.tema_consulta}</span>
                    </div>
                  )}
                  {run.profundidade && (
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Profundidade:</span>
                      <span>{run.profundidade}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleReplay} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reexecutar com mesmas configs
                </Button>
              </div>

              <Separator />
            </>
          )}

          {/* Items section */}
          {!isError && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={filters.tipo ?? "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, tipo: v === "all" ? undefined : v }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="listagem">Listagem</SelectItem>
                    <SelectItem value="detalhe">Detalhe</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status ?? "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="ignorado">Ignorado</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.motivo ?? "all"}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, motivo: v === "all" ? undefined : v }))
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os motivos</SelectItem>
                    {MOTIVO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filters.tipo || filters.status || filters.motivo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({})}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* Items loading */}
              {loadingItems && (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loadingItems && items.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum item encontrado com esses filtros.
                  </p>
                </div>
              )}

              {/* Items table */}
              {!loadingItems && items.length > 0 && (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Status</TableHead>
                          <TableHead className="w-20">Tipo</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead className="hidden md:table-cell w-40">Motivo</TableHead>
                          <TableHead className="hidden lg:table-cell w-32">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{getStatusIcon(item.status)}</TableCell>
                            <TableCell>{getTypeBadge(item.tipo_pagina)}</TableCell>
                            <TableCell className="max-w-[200px]">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-primary flex items-center gap-1 truncate"
                                aria-label={`Abrir URL ${item.url} em nova aba`}
                              >
                                <span className="truncate">{item.url}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {item.motivo_descartar ?? "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {formatDate(item.data_coleta)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div
                      className="flex items-center justify-between"
                      role="navigation"
                      aria-label="Paginação"
                    >
                      <span className="text-sm text-muted-foreground">
                        Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–
                        {Math.min(page * ITEMS_PER_PAGE, totalItems)} de {totalItems}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          aria-current={page === totalPages ? "page" : undefined}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
