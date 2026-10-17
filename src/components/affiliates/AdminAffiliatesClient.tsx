'use client';

import { AffiliateTrackingSettings } from './AffiliateTrackingSettings';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { partnersRequest } from '@/lib/affiliates/client';
import { statusLabels, type AffiliateAdminList } from '@/lib/affiliates/types';

const actions = { approve: 'Aprovar', reject: 'Rejeitar', suspend: 'Suspender', reactivate: 'Reativar' };
type Decision = { row: AffiliateAdminList['items'][number]; action: keyof typeof actions };
export default function AdminAffiliatesClient({ userId }: { userId: string }) {
  const cache = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const query = useQuery({ queryKey: ['admin-affiliates', userId, status, page], queryFn: () => partnersRequest<AffiliateAdminList>(`/api/admin/affiliates?status=${status}&page=${page}`), retry: false });
  const review = useMutation({ mutationFn: (value: Decision) => partnersRequest('/api/admin/affiliates', { profile: value.row.id, action: value.action, version: value.row.version, reason }),
    onSuccess: async () => { setDecision(null); toast.success('Decisão registrada.'); await cache.invalidateQueries({ queryKey: ['admin-affiliates'] }); },
    onError: () => { void cache.invalidateQueries({ queryKey: ['admin-affiliates'] }); } });
  function choose(row: Decision['row'], action: Decision['action']) { review.reset(); setReason(''); setDecision({ row, action }); }
  return <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
    <header><h1 className="text-2xl font-bold">Gestão de Afiliados</h1><p className="mt-2 text-sm text-muted-foreground">Solicitações e participação no MBO Partners.</p></header>
    <AffiliateTrackingSettings userId={userId} />
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="space-y-2"><Label htmlFor="affiliate-filter">Situação do cadastro</Label><Select value={status} onValueChange={value => { setStatus(value); setPage(0); }}><SelectTrigger id="affiliate-filter" className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(statusLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>Atualizar</Button></div>
    {query.isPending && <p role="status">Carregando solicitações…</p>}
    {query.isError && <p role="alert" className="text-destructive">{query.error.message}</p>}
    {query.data && <>
      <p className="text-sm text-muted-foreground">{query.data.total} cadastro(s)</p>
      {query.data.items.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum cadastro neste filtro.</CardContent></Card>}
      <div className="space-y-4">{query.data.items.map(row => <Card key={row.id}><CardContent className="space-y-4 pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{row.display_name}</h2><p className="mt-1 text-xs text-muted-foreground">Solicitado em {new Date(row.created_at).toLocaleDateString('pt-BR')}</p></div><Badge variant="secondary">{statusLabels[row.status]}</Badge></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plano de divulgação</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{row.channel}</p></div>
        <p className="break-all text-xs text-muted-foreground">Cadastro: {row.id}</p>
        {row.decision_reason && <p className="text-sm text-muted-foreground">Decisão inicial: {row.decision_reason}</p>}
        <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Histórico recente</summary><ol className="mt-3 space-y-3">{row.history?.map(event => <li key={event.id} className="border-t pt-3"><p>{statusLabels[event.next_status]} · {new Date(event.created_at).toLocaleString('pt-BR')}</p>{event.reason && <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{event.reason}</p>}<p className="mt-1 break-all text-xs text-muted-foreground">Responsável: {event.actor_id}</p></li>)}</ol><p className="mt-3 text-xs text-muted-foreground">Até 10 eventos mais recentes. O histórico completo é preservado na auditoria.</p></details>
        <div className="flex flex-wrap gap-2">{row.status === 'pending' && <><Button onClick={() => choose(row,'approve')}>Aprovar</Button><Button variant="outline" onClick={() => choose(row,'reject')}>Rejeitar</Button></>}{row.status === 'approved' && <Button variant="outline" onClick={() => choose(row,'suspend')}>Suspender</Button>}{row.status === 'suspended' && <Button variant="outline" onClick={() => choose(row,'reactivate')}>Reativar</Button>}</div>
      </CardContent></Card>)}</div>
      <div className="flex items-center justify-between gap-4"><Button variant="outline" disabled={page===0 || query.isFetching} onClick={() => setPage(value => value-1)}>Anterior</Button><span className="text-sm">Página {page+1}</span><Button variant="outline" disabled={(page+1)*25>=query.data.total || query.isFetching} onClick={() => setPage(value => value+1)}>Próxima</Button></div>
    </>}
    <Dialog open={!!decision} onOpenChange={open => { if (!open && !review.isPending) setDecision(null); }}><DialogContent><DialogHeader><DialogTitle>{decision && actions[decision.action]} participação</DialogTitle><DialogDescription>{decision?.row.display_name}. A operação será registrada no histórico administrativo.</DialogDescription></DialogHeader>
      <form onSubmit={event => { event.preventDefault(); if (decision) review.mutate(decision); }} className="space-y-4"><Label htmlFor="affiliate-reason">Motivo da decisão</Label><Textarea id="affiliate-reason" required minLength={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /><p className="text-xs text-muted-foreground">O motivo de rejeição será exibido ao solicitante. Não inclua informações internas ou dados sensíveis.</p>{review.isError && <p role="alert" className="text-sm text-destructive">{review.error.message}</p>}<Button type="submit" disabled={review.isPending}>{review.isPending ? 'Salvando…' : 'Confirmar decisão'}</Button></form>
    </DialogContent></Dialog>
  </div>;
}
