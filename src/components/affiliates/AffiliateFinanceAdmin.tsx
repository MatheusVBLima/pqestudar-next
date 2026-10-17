'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { partnersRequest } from '@/lib/affiliates/client';
import { payoutLabels, parseWalletAmount, walletMoney as money, type FinanceData, type Payout } from '@/lib/affiliates/wallet';
type Detail = Payout & { pix: string; attempts: { id: string; next_status: string; reason: string; created_at: string; transfer_reference: string | null; has_proof: boolean }[] };
const nextActions: Record<string, string[]> = { requested: ['reviewing','rejected'], reviewing: ['approved','rejected'], approved: ['processing','rejected'], processing: ['paid','failed','rejected'] };

export function AffiliateFinanceAdmin({ userId }: { userId: string }) {
  const cache = useQueryClient();
  const [page, setPage] = useState(0), [minimum, setMinimum] = useState(''), [days, setDays] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null), [target, setTarget] = useState(''), [reason, setReason] = useState(''), [reference, setReference] = useState(''), [verified, setVerified] = useState(false), [file, setFile] = useState<File | null>(null);
  const query = useQuery({ queryKey: ['affiliate-finance', userId, page], queryFn: () => partnersRequest<FinanceData>(`/api/admin/affiliates/finance?page=${page}`), retry: false });
  const mutation = useMutation({ mutationFn: (body: unknown) => partnersRequest('/api/admin/affiliates/finance', body), onSuccess: async () => { setDetail(null); setTarget(''); await cache.invalidateQueries({ queryKey: ['affiliate-finance'] }); }, onError: () => { void query.refetch(); } });
  const inspect = useMutation({ mutationFn: (id: string) => partnersRequest<Detail>('/api/admin/affiliates/finance', { action: 'detail', id }), onSuccess: data => { setDetail(data); setReason(''); setReference(''); setVerified(false); setFile(null); setTarget(''); mutation.reset(); } });
  async function submit() {
    if (!detail) return;
    let proof: string | undefined;
    if (target === 'paid') {
      if (!file || file.size > 2097152 || !verified) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
      proof = btoa(binary);
    }
    mutation.mutate({ action: 'review', id: detail.id, version: detail.version, status: target, reason, ...(target === 'paid' ? { reference, proof, proofType: file?.type, verified } : {}) });
  }
  return <Card><CardContent className="space-y-5 pt-6"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-semibold">Carteira e saques</h2><p className="text-sm text-muted-foreground">Pagamentos manuais por Pix, com reserva de saldo e histórico.</p></div><Button variant="outline" onClick={() => query.refetch()}>Atualizar financeiro</Button></div>
    {query.isPending && <p role="status">Carregando financeiro…</p>}{query.isError && <p role="alert" className="text-destructive">{query.error.message}</p>}
    {query.data && <>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); mutation.mutate({ action: 'settings', minimum: minimum ? parseWalletAmount(minimum) : query.data.minimum_cents, days: days ? Number(days) : query.data.security_days }); }}><div className="space-y-2"><Label htmlFor="finance-minimum">Saque mínimo (R$)</Label><Input id="finance-minimum" inputMode="decimal" placeholder={(query.data.minimum_cents/100).toFixed(2)} value={minimum} onChange={e => setMinimum(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="finance-days">Segurança (dias)</Label><Input id="finance-days" type="number" min={1} max={365} placeholder={String(query.data.security_days)} value={days} onChange={e => setDays(e.target.value)} /></div><Button disabled={mutation.isPending}>Salvar regras</Button></form><p className="text-xs text-muted-foreground">Alterar o prazo não modifica datas de liberação de vendas já confirmadas.</p>
      {query.data.recoveries.length > 0 && <div role="alert" className="rounded-lg border border-destructive p-4"><h3 className="font-semibold">Ajustes a recuperar</h3>{query.data.recoveries.map(r => <p key={r.profile_id}>{r.display_name}: {money(-r.debt_cents)}</p>)}<p className="text-sm">Revise os estornos. Nenhuma cobrança ou transferência será feita automaticamente.</p></div>}
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Comissões com prazo cumprido ({query.data.eligible.length} nesta consulta)</summary><p className="my-3 text-sm text-muted-foreground">A liberação consulta o Mercado Pago novamente e exige líquido conciliado. São exibidas até 20 por vez.</p>{query.data.eligible.map(c => <div key={c.id} className="flex flex-wrap justify-between gap-3 border-t py-3"><span className="break-all text-sm">{c.id} · {money(c.commission_cents)}</span><Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'release', id: c.id })}>Conferir e liberar</Button></div>)}{!query.data.eligible.length && <p className="text-sm">Nenhuma comissão pronta para conferência.</p>}</details>
      <h3 className="font-semibold">Solicitações de saque</h3>{!query.data.items.length && <p className="text-muted-foreground">Nenhum saque solicitado.</p>}{query.data.items.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><b>{p.display_name} · {money(p.amount_cents)}</b><p className="text-sm text-muted-foreground">{payoutLabels[p.status]} · {p.pix_mask} · {new Date(p.created_at).toLocaleDateString('pt-BR')}</p></div><Button variant="outline" disabled={inspect.isPending} onClick={() => inspect.mutate(p.id)}>Analisar</Button></div>)}
      <div className="flex justify-between"><Button variant="outline" disabled={page===0} onClick={() => setPage(p=>p-1)}>Anterior</Button><span>Página {page+1}</span><Button variant="outline" disabled={(page+1)*20>=query.data.total} onClick={() => setPage(p=>p+1)}>Próxima</Button></div>
    </>}
    {(mutation.isError || inspect.isError) && <p role="alert" className="text-destructive">{mutation.error?.message || inspect.error?.message}</p>}
    <Dialog open={!!detail} onOpenChange={open => { if (!open && !mutation.isPending) setDetail(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Analisar saque</DialogTitle><DialogDescription>A transferência é feita por você no banco. Registrar uma decisão não envia dinheiro.</DialogDescription></DialogHeader>{detail && <div className="space-y-4"><p><b>{money(detail.amount_cents)}</b> · {payoutLabels[detail.status]}</p><p className="break-all rounded-lg border p-3">Chave Pix: {detail.pix}</p><p className="text-xs text-muted-foreground">Confira a titularidade no banco antes de transferir. O acesso à chave foi registrado na auditoria.</p>
      <div className="flex flex-wrap gap-2">{(nextActions[detail.status] || []).map(action => <Button key={action} variant={target===action?'default':'outline'} disabled={mutation.isPending} onClick={() => setTarget(action)}>{payoutLabels[action]}</Button>)}</div>
      {target && <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit(); }}><Label htmlFor="payout-reason">Motivo / observação da operação</Label><Textarea id="payout-reason" value={reason} required minLength={3} maxLength={1000} onChange={e => setReason(e.target.value)} />{target==='paid' && <><Label htmlFor="payout-reference">Identificador único da transferência Pix</Label><Input id="payout-reference" required minLength={6} maxLength={150} value={reference} onChange={e => setReference(e.target.value)} /><Label htmlFor="payout-proof">Comprovante (PDF, PNG ou JPEG, até 2 MB)</Label><Input id="payout-proof" type="file" required accept="application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} />{file && file.size>2097152 && <p role="alert" className="text-destructive">O arquivo ultrapassa 2 MB.</p>}<label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={verified} onChange={e => setVerified(e.target.checked)} />Conferi a transferência concluída, o destinatário e o valor no banco. O comprovante corresponde a este saque.</label></>}{mutation.isError && <p role="alert" className="text-destructive">{mutation.error.message}</p>}<Button disabled={mutation.isPending || (target==='paid' && (!verified || !file || file.size>2097152))}>{mutation.isPending?'Registrando…':'Registrar decisão'}</Button></form>}
      <h3 className="font-semibold">Histórico</h3>{detail.attempts.map(a => <div className="border-t pt-3 text-sm" key={a.id}><b>{payoutLabels[a.next_status]}</b> · {new Date(a.created_at).toLocaleString('pt-BR')}<p className="whitespace-pre-wrap break-words">{a.reason}</p>{a.transfer_reference && <p className="break-all">Referência: {a.transfer_reference}</p>}{a.has_proof && <a className="underline" href={`/api/admin/affiliates/finance?proof=${a.id}`}>Baixar comprovante</a>}</div>)}</div>}</DialogContent></Dialog>
  </CardContent></Card>;
}
