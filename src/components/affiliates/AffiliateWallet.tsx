'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { partnersRequest } from '@/lib/affiliates/client';
import { ledgerLabels, parseWalletAmount, payoutLabels, walletMoney as money, type WalletData } from '@/lib/affiliates/wallet';
import s from './approved-affiliate.module.css';

export function AffiliateWallet({ userId, demo = false }: { userId: string; demo?: boolean }) {
  const cache = useQueryClient();
  const [page, setPage] = useState(0), [amount, setAmount] = useState(''), [pix, setPix] = useState(''), [pixType, setPixType] = useState('cpf');
  const [requestId, setRequestId] = useState<string | null>(null), [confirmed, setConfirmed] = useState(false), [sent, setSent] = useState(false);
  const query = useQuery({ queryKey: ['affiliate-wallet', userId, page], queryFn: () => partnersRequest<WalletData>(`/api/affiliates/wallet?page=${page}`), enabled: !demo, retry: false, refetchOnWindowFocus: true });
  const mutation = useMutation({ mutationFn: (id: string) => partnersRequest('/api/affiliates/wallet', { id, amount: parseWalletAmount(amount), pixType, pix }), onSuccess: async () => { setSent(true); setPix(''); setAmount(''); setConfirmed(false); setRequestId(null); await cache.invalidateQueries({ queryKey: ['affiliate-wallet', userId] }); }, onError: () => { void query.refetch(); } });
  if (demo) return <section className={`${s.card} ${s.pad}`}><h3>Minha carteira</h3><p className={s.sub}>O modo demonstração não permite movimentar valores. Desative-o para consultar sua carteira real.</p></section>;
  if (query.isPending) return <p role="status">Carregando sua carteira…</p>;
  if (query.isError) return <section className={`${s.card} ${s.pad}`} role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></section>;
  const data = query.data;
  const cents = parseWalletAmount(amount);
  const pending = data.payouts.some(p => ['requested','reviewing','approved','processing'].includes(p.status));
  const enabled = data.approved && data.configured && !pending && data.available_cents >= data.minimum_cents;
  function changed() { setRequestId(null); setSent(false); mutation.reset(); }
  return <div className="dark space-y-6">
    <div className={s.kpis}>{[['Em segurança',data.pending_cents],['Disponível',Math.max(0,data.available_cents)],['Reservado',data.reserved_cents],['Total recebido',data.paid_cents]].map(([title,value]) => <section className={`${s.card} ${s.kpi}`} key={title}><small>{title}</small><strong>{money(Number(value))}</strong></section>)}</div>
    <section className={`${s.card} ${s.pad}`}><h3>Solicitar saque por Pix</h3><p className={s.sub}>Mínimo de {money(data.minimum_cents)}. O valor fica reservado durante a análise. O pagamento é realizado manualmente pela equipe.</p>
      {data.available_cents < 0 && <p className={s.warn} role="alert">Ajuste a recuperar: {money(-data.available_cents)}. Novas comissões compensarão esse valor; nenhuma cobrança automática será feita.</p>}
      {!data.configured && <p className={s.warn}>A carteira está disponível para consulta. As solicitações aguardam a configuração segura das chaves Pix.</p>}
      {!data.approved && <p className={s.warn}>Seu cadastro não está habilitado para solicitar saques.</p>}
      {pending && <p className={s.note}>Você já tem um saque em andamento. Acompanhe abaixo.</p>}
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const id = requestId || crypto.randomUUID(); setRequestId(id); mutation.mutate(id); }}>
        <div className="space-y-2"><Label htmlFor="wallet-amount">Valor em reais</Label><Input id="wallet-amount" inputMode="decimal" placeholder="50,00" value={amount} disabled={!enabled || mutation.isPending} onChange={e => { changed(); setAmount(e.target.value); }} required /></div>
        <div className="space-y-2"><Label htmlFor="wallet-pix-type">Tipo de chave Pix</Label><Select value={pixType} disabled={!enabled || mutation.isPending} onValueChange={v => { changed(); setPixType(v); setPix(''); }}><SelectTrigger id="wallet-pix-type"><SelectValue /></SelectTrigger><SelectContent>{[['cpf','CPF'],['cnpj','CNPJ'],['email','E-mail'],['phone','Telefone (+55…)'],['random','Aleatória']].map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="wallet-pix">Chave Pix de sua titularidade</Label><Input id="wallet-pix" autoComplete="off" maxLength={254} value={pix} disabled={!enabled || mutation.isPending} onChange={e => { changed(); setPix(e.target.value); }} required /><p className="text-xs text-muted-foreground">A chave será protegida e vinculada a esta solicitação. Confira os dados antes de enviar.</p></div>
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={confirmed} disabled={!enabled || mutation.isPending} onChange={e => setConfirmed(e.target.checked)} required />Confirmo o valor e que sou titular da chave Pix informada.</label>
        {mutation.isError && <p role="alert" className="text-destructive sm:col-span-2">{mutation.error.message}</p>}
        {sent && <p role="status" className="sm:col-span-2">Saque solicitado. O valor foi reservado para análise.</p>}
        <Button type="submit" disabled={!enabled || !confirmed || !pix.trim() || cents === null || cents < data.minimum_cents || cents > data.available_cents || mutation.isPending}>{mutation.isPending ? 'Reservando saldo…' : 'Solicitar saque'}</Button>
      </form>
      <p className={`${s.sub} ${s.note}`}>{data.unreconciled} venda(s) com valor líquido em apuração. A liberação depende da conciliação, do prazo de segurança e da elegibilidade do pagamento. Prazo atual: {data.security_days} dias, aplicado às novas confirmações.</p>
    </section>
    <section className={`${s.card} ${s.pad}`}><h3>Meus saques</h3>{data.payouts.length === 0 ? <p className={s.sub}>Nenhuma solicitação nesta página.</p> : <div className="divide-y">{data.payouts.map(p => <div className="flex flex-wrap justify-between gap-3 py-4" key={p.id}><div><b>{money(p.amount_cents)}</b><p className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleString('pt-BR')} · {p.pix_mask}</p><small className="break-all">{p.id}</small></div><span>{payoutLabels[p.status]}</span></div>)}</div>}</section>
    <section className={`${s.card} ${s.pad}`}><h3>Extrato</h3>{data.entries.length === 0 ? <p className={s.sub}>Nenhuma movimentação nesta página.</p> : <div className="divide-y">{data.entries.map(e => <div className="flex flex-wrap justify-between gap-3 py-4" key={e.id}><div><b>{ledgerLabels[e.kind]}</b><p className="text-sm text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</p></div><div className="text-sm">Disponível: {money(e.available_delta)}<br />Reservado: {money(e.reserved_delta)}<br />Pago: {money(e.paid_delta)}</div></div>)}</div>}<div className="mt-4 flex items-center justify-between"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p-1)}>Anterior</Button><span>Página {page+1}</span><Button variant="outline" disabled={(page+1)*20 >= Math.max(data.total,data.payout_total)} onClick={() => setPage(p => p+1)}>Próxima</Button></div><p className={`${s.sub} ${s.note}`}>Esta carteira registra comissões devidas pelo programa. Não é uma conta de pagamento.</p></section>
  </div>;
}
