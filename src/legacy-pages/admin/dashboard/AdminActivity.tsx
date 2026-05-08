"use client";

import { useState, useMemo } from 'react';
import { Activity, Users, Layers, FileClock } from 'lucide-react';
import { PageHeader } from '@/components/admin/dashboard/PageHeader';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { ChartCard } from '@/components/admin/dashboard/ChartCard';
import { DataTable } from '@/components/admin/dashboard/DataTable';
import { PeriodSelector, type Period } from '@/components/admin/dashboard/PeriodSelector';
import { periodToRange } from '@/components/admin/dashboard/periodHelper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminActionRow {
  created_at: string;
  admin_email: string | null;
  area: string;
  action: string;
  entity_id: string | null;
}

export default function AdminActivity() {
  const [period, setPeriod] = useState<Period>('month');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [adminFilter, setAdminFilter] = useState<string>('all');

  const { startAt, endAt } = useMemo(() => {
    const r = periodToRange(period);
    return {
      startAt: r.start_at ?? new Date(2020, 0, 1).toISOString(),
      endAt: r.end_at ?? new Date().toISOString(),
    };
  }, [period]);

  const { data: overview } = useQuery({
    queryKey: ['admin-activity-overview', startAt, endAt],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activity_overview', {
        start_at: startAt,
        end_at: endAt,
      });
      if (error) throw error;
      return data as {
        admin_pageviews: number;
        admin_actions: number;
        unique_admins: number;
        unique_areas: number;
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: byArea } = useQuery({
    queryKey: ['admin-activity-by-area', startAt, endAt],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activity_by_area', {
        start_at: startAt,
        end_at: endAt,
      });
      if (error) throw error;
      return data as { area: string; total_actions: number; unique_admins: number; last_activity: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: byAdmin } = useQuery({
    queryKey: ['admin-activity-by-admin', startAt, endAt],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activity_by_admin', {
        start_at: startAt,
        end_at: endAt,
      });
      if (error) throw error;
      return data as {
        admin_user_id: string;
        admin_email: string;
        total_actions: number;
        unique_areas: number;
        last_activity: string;
      }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: timeline } = useQuery({
    queryKey: ['admin-activity-timeline', startAt, endAt],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activity_timeline', {
        start_at: startAt,
        end_at: endAt,
      });
      if (error) throw error;
      return (data as { day: string; total_actions: number; total_pageviews: number }[]).map((d) => ({
        day: format(new Date(d.day), 'dd/MM', { locale: ptBR }),
        actions: Number(d.total_actions),
        pageviews: Number(d.total_pageviews),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: actions } = useQuery({
    queryKey: ['admin-activity-actions', startAt, endAt, areaFilter, adminFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activity_actions_list', {
        start_at: startAt,
        end_at: endAt,
        p_area: areaFilter === 'all' ? null : areaFilter,
        p_admin_user_id: adminFilter === 'all' ? null : adminFilter,
        p_action: null,
        p_limit: 100,
      });
      if (error) throw error;
      return (data as AdminActionRow[]).map((row) => ({
        when: format(new Date(row.created_at), 'dd/MM HH:mm', { locale: ptBR }),
        admin: row.admin_email || '(sem email)',
        area: row.area,
        action: row.action,
        entity: row.entity_id || '—',
      }));
    },
    staleTime: 60 * 1000,
  });

  const formatValue = (v: number | null | undefined) => (v != null ? String(v) : '—');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atividade Admin"
        description="Métricas internas do painel — separadas das métricas públicas"
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Acessos admin" value={formatValue(overview?.admin_pageviews)} icon={FileClock} description="Pageviews no painel" />
        <StatCard title="Ações registradas" value={formatValue(overview?.admin_actions)} icon={Activity} description="CRUD, publish, IA, sync" />
        <StatCard title="Admins ativos" value={formatValue(overview?.unique_admins)} icon={Users} description="Contas com atividade" />
        <StatCard title="Áreas usadas" value={formatValue(overview?.unique_areas)} icon={Layers} description="Módulos do painel" />
      </div>

      <ChartCard title="Linha do tempo" description="Pageviews internos × ações administrativas">
        {timeline && timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="pageviews" stroke="hsl(var(--muted-foreground))" fill="url(#colorPv)" strokeWidth={2} />
              <Area type="monotone" dataKey="actions" stroke="hsl(var(--primary))" fill="url(#colorActions)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          title="Por área do painel"
          columns={[
            { key: 'area', label: 'Área' },
            { key: 'total_actions', label: 'Ações' },
            { key: 'unique_admins', label: 'Admins' },
          ]}
          rows={byArea?.map((r) => ({
            area: r.area,
            total_actions: r.total_actions,
            unique_admins: r.unique_admins,
          }))}
        />
        <DataTable
          title="Por conta admin"
          columns={[
            { key: 'admin_email', label: 'Admin' },
            { key: 'total_actions', label: 'Ações' },
            { key: 'unique_areas', label: 'Áreas' },
          ]}
          rows={byAdmin?.map((r) => ({
            admin_email: r.admin_email,
            total_actions: r.total_actions,
            unique_areas: r.unique_areas,
          }))}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {byArea?.map((r) => (
                <SelectItem key={r.area} value={r.area}>{r.area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={adminFilter} onValueChange={setAdminFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Filtrar por admin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os admins</SelectItem>
              {byAdmin?.map((r) => (
                <SelectItem key={r.admin_user_id} value={r.admin_user_id}>{r.admin_email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable
          title="Ações detalhadas"
          columns={[
            { key: 'when', label: 'Quando' },
            { key: 'admin', label: 'Admin' },
            { key: 'area', label: 'Área' },
            { key: 'action', label: 'Ação' },
            { key: 'entity', label: 'Entidade' },
          ]}
          rows={actions}
        />
      </div>
    </div>
  );
}
