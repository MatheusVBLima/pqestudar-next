"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ColetaRunDrillDownSheet from "@/components/admin/ColetaRunDrillDownSheet";

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
  filtros_snapshot: Record<string, unknown>;
  total_urls: number;
  total_novas: number;
  total_ignoradas: number;
  total_erros: number;
  status_execucao: string;
}

const getStatusBadge = (s: string) => {
  switch (s) {
    case "ok":
      return <Badge variant="default" className="bg-emerald-600">OK</Badge>;
    case "parcial":
      return <Badge variant="secondary">Parcial</Badge>;
    case "erro":
      return <Badge variant="destructive">Erro</Badge>;
    default:
      return <Badge variant="outline">{s}</Badge>;
  }
};

const HISTORY_PAGE_SIZE = 20;

export default function AdminConcursosHistorico() {
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: historyRuns = [], isLoading, refetch } = useQuery({
    queryKey: ["coleta-runs-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coleta_runs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as ColetaRun[];
    },
  });

  const deleteRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase
        .from("coleta_runs")
        .delete()
        .eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Execução excluída");
      refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    },
  });

  const openDrillDown = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setDrillDownOpen(true);
  }, []);

  const paginatedRuns = historyRuns.slice(
    (page - 1) * HISTORY_PAGE_SIZE,
    page * HISTORY_PAGE_SIZE
  );
  const totalPages = Math.ceil(historyRuns.length / HISTORY_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de Execuções"
        description="Todas as execuções de coleta com totais e possibilidade de drill-down."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : historyRuns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhuma execução registrada ainda.
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Novas</TableHead>
                  <TableHead>Ignoradas</TableHead>
                  <TableHead>Erros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(run.executed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {run.tipo_coleta}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.ano_alvo}</TableCell>
                    <TableCell className="font-medium">{run.total_urls}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">{run.total_novas}</TableCell>
                    <TableCell className="text-amber-600">{run.total_ignoradas}</TableCell>
                    <TableCell className="text-destructive">{run.total_erros}</TableCell>
                    <TableCell>{getStatusBadge(run.status_execucao)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDrillDown(run.id)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Excluir esta execução?")) {
                              deleteRunMutation.mutate(run.id);
                            }
                          }}
                          disabled={deleteRunMutation.isPending}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {(page - 1) * HISTORY_PAGE_SIZE + 1}–
                {Math.min(page * HISTORY_PAGE_SIZE, historyRuns.length)} de {historyRuns.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ColetaRunDrillDownSheet
        runId={selectedRunId}
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
      />
    </div>
  );
}
