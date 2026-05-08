"use client";

import { useState, ReactNode } from 'react';
import { PageHeader } from '@/components/admin/dashboard/PageHeader';
import { PeriodSelector, Period } from '@/components/admin/dashboard/PeriodSelector';
import { ChartCard } from '@/components/admin/dashboard/ChartCard';
import { DataTable } from '@/components/admin/dashboard/DataTable';
import { AuditOptimizationDrawer } from '@/components/admin/dashboard/AuditOptimizationDrawer';
import { AuditSummaryCard } from '@/components/admin/dashboard/AuditSummaryCard';
import { periodToRange } from '@/components/admin/dashboard/periodHelper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Play, Pencil, History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { buildAuditUrls, runIframeAudit } from '@/lib/iframe-audit-engine';
import { analyzeCopy } from '@/lib/copy-audit-analyzer';
import { isUrlSupported } from '@/lib/audit-url-resolver';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const AUDIT_TYPE = 'copywriting';

interface Finding {
  url: string;
  path: string;
  score: number;
  issue_count: number;
  run_date: string;
  issues: Array<{ issue: string; category: string; impact: string; evidence: string; fix: string; priority: number }>;
  raw: Record<string, unknown>;
}

export default function InsightsCopyAudit() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>('all');
  const [drawerIdx, setDrawerIdx] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<'diagnostico' | 'editor' | 'historico'>('diagnostico');
  const [auditProgress, setAuditProgress] = useState<{ current: number; total: number; path: string } | null>(null);
  const range = periodToRange(period);

  const { data: history } = useQuery({
    queryKey: ['insights-audit-history', AUDIT_TYPE, period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('insights_audit_history', {
        p_audit_type: AUDIT_TYPE,
        start_at: range.start_at,
        end_at: range.end_at,
      });
      if (error) throw error;
      return (data as { run_id: string; run_date: string; avg_score: number; total_findings: number; status: string }[])?.map(r => ({
        ...r,
        label: format(new Date(r.run_date), 'dd/MM HH:mm', { locale: ptBR }),
      })) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: issuesByCategory } = useQuery({
    queryKey: ['insights-audit-categories', AUDIT_TYPE],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('insights_audit_issues_by_category', {
        p_audit_type: AUDIT_TYPE,
      });
      if (error) throw error;
      return (data as { category: string; issue_count: number }[]) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: findings } = useQuery({
    queryKey: ['insights-audit-findings', AUDIT_TYPE],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('insights_audit_latest_findings', {
        p_audit_type: AUDIT_TYPE,
      });
      if (error) throw error;
      return (data as Finding[]) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const latestRun = history?.find(h => h.status === 'completed') ?? null;
  const scoreChart = history?.filter(h => h.status === 'completed').reverse() ?? [];

  // Build table rows with action buttons
  const tableRows = findings?.map((f, idx) => {
    const supported = isUrlSupported(f.path);
    return {
      url: f.path as ReactNode,
      score: String(f.score) as ReactNode,
      issues: String(f.issue_count) as ReactNode,
      date: format(new Date(f.run_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) as ReactNode,
      actions: (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <UITooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!supported}
                onClick={() => { setDrawerIdx(idx); setDrawerTab('editor'); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{supported ? 'Melhorar página' : 'Edição não suportada'}</TooltipContent>
          </UITooltip>
          <UITooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { setDrawerIdx(idx); setDrawerTab('historico'); }}
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Histórico</TooltipContent>
          </UITooltip>
        </div>
      ) as ReactNode,
    };
  });

  const selectedFinding = drawerIdx != null && findings?.[drawerIdx]
    ? {
        ...findings[drawerIdx],
        issues: Array.isArray(findings[drawerIdx].issues) ? findings[drawerIdx].issues : [],
        raw: (findings[drawerIdx].raw as Record<string, unknown>) ?? {},
        audit_type: 'copywriting' as const,
      }
    : null;

  const runAudit = useMutation({
    mutationFn: async () => {
      const urls = await buildAuditUrls();
      setAuditProgress({ current: 0, total: urls.length, path: 'Preparando…' });

      const results = await runIframeAudit(urls, analyzeCopy, (current, total, path) => {
        setAuditProgress({ current, total, path });
      });

      setAuditProgress({ current: urls.length, total: urls.length, path: 'Salvando resultados…' });

      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke('insights-copywriting-audit', {
        body: { findings: results },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (resp.error) throw new Error(resp.error.message || 'Falha ao salvar auditoria');
      return resp.data;
    },
    onSuccess: () => {
      setAuditProgress(null);
      toast.success('Auditoria de Copywriting concluída!');
      qc.invalidateQueries({ queryKey: ['insights-audit-history', AUDIT_TYPE] });
      qc.invalidateQueries({ queryKey: ['insights-audit-categories', AUDIT_TYPE] });
      qc.invalidateQueries({ queryKey: ['insights-audit-findings', AUDIT_TYPE] });
    },
    onError: (err: Error) => {
      setAuditProgress(null);
      toast.error(err.message);
    },
  });

  const handleReauditComplete = () => {
    qc.invalidateQueries({ queryKey: ['insights-audit-findings', AUDIT_TYPE] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Copy Audit — Central de Otimização"
        description="Diagnóstico, edição, versionamento e reauditoria de copywriting por URL"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending} size="sm">
              <Play className="h-4 w-4 mr-1" />
              {runAudit.isPending ? 'Auditando…' : 'Rodar auditoria agora'}
            </Button>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        }
      />

      {auditProgress && (
        <div className="rounded-lg border p-4 space-y-2 bg-card">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Auditando {auditProgress.current}/{auditProgress.total}</span>
            <span className="text-muted-foreground text-xs truncate max-w-[300px]">{auditProgress.path}</span>
          </div>
          <Progress value={auditProgress.total > 0 ? (auditProgress.current / auditProgress.total) * 100 : 0} className="h-2" />
        </div>
      )}

      <AuditSummaryCard run={latestRun} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Score médio por execução" description="Histórico de auditorias">
          {scoreChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={scoreChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Line type="monotone" dataKey="avg_score" name="Score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
        <ChartCard title="Issues por categoria" description="clarity, persuasion, tone, structure">
          {issuesByCategory && issuesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={issuesByCategory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Bar dataKey="issue_count" name="Issues" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
      </div>

      <DataTable
        title="Última auditoria — Findings por URL"
        columns={[
          { key: 'url', label: 'URL' },
          { key: 'score', label: 'Score' },
          { key: 'issues', label: 'Issues' },
          { key: 'date', label: 'Data' },
          { key: 'actions', label: 'Ações' },
        ]}
        rows={tableRows}
        onRowClick={(i) => { setDrawerIdx(i); setDrawerTab('diagnostico'); }}
      />

      <AuditOptimizationDrawer
        open={drawerIdx != null}
        onOpenChange={(open) => { if (!open) setDrawerIdx(null); }}
        finding={selectedFinding}
        onReauditComplete={handleReauditComplete}
      />
    </div>
  );
}
