'use client';

import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { statusLabels, type AffiliateDashboard } from '@/lib/affiliates/types';
import { ApprovedAffiliateDashboard } from './ApprovedAffiliateDashboard';
import { partnersRequest } from '@/lib/affiliates/client';
export default function AffiliateDashboardClient({ userId }: { userId: string }) {
  const queryKey = ['affiliate-membership', userId];
  const cache = useQueryClient();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('');
  const query = useQuery({ queryKey, queryFn: () => partnersRequest<AffiliateDashboard>('/api/affiliates'), retry: false, staleTime: 0, refetchOnWindowFocus: true });
  const apply = useMutation({ mutationFn: () => partnersRequest('/api/affiliates', { name, channel }),
    onSuccess: async () => { await cache.invalidateQueries({ queryKey }); toast.success('Solicitação enviada para análise.'); } });
  function submit(event: FormEvent) { event.preventDefault(); apply.mutate(); }
  const data = query.data;
  const profile = data?.profile;
  if (data && profile?.status === 'approved' && !query.isError) return <ApprovedAffiliateDashboard key={userId} userId={userId} dashboard={data} />;
  return <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8 sm:py-14">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Users className="h-4 w-4" /> MBO Partners</p>
        <h1 className="text-3xl font-bold tracking-tight">{profile?.status === 'approved' ? 'Meu painel de afiliado' : 'Programa de afiliados'}</h1></div>
      {profile && <Badge variant="secondary">{statusLabels[profile.status]}</Badge>}
    </header>
    {query.isPending && <p role="status" className="flex items-center gap-2 py-12"><Loader2 className="h-5 w-5 animate-spin" /> Carregando seu cadastro…</p>}
    {query.isError && <Card><CardContent className="space-y-4 pt-6"><p role="alert">{query.error.message}</p><Button onClick={() => query.refetch()}>Tentar novamente</Button></CardContent></Card>}
    {data && !profile && <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-6"><h2 className="text-2xl font-semibold">Compartilhe o MBO. Cresça com suas indicações.</h2>
        <p className="leading-relaxed text-muted-foreground">Participe do programa do p.q.estudar para divulgar o Mapa dos Benefícios Ocultos e acompanhar sua evolução em um só lugar.</p>
        <div className="space-y-5">{[
          ['Comissão por venda elegível', 'Percentuais de acordo com seu nível, calculados sobre o valor líquido confirmado.'],
          ['Evolução por resultados', 'Quatro níveis para acompanhar seu crescimento no programa.'],
          ['Acompanhamento transparente', 'O painel reunirá suas indicações, comissões e solicitações de saque.'],
        ].map(([title, description]) => <div className="flex gap-3" key={title}><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" /><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>)}</div>
        <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">{data.tracking_enabled ? 'Solicite sua participação. Após a aprovação, seu link estará disponível no painel.' : 'As inscrições estão abertas para análise. As indicações ainda não foram ativadas.'}</p>
      </section>
      <Card><CardHeader><CardTitle>Quero ser afiliado</CardTitle><CardDescription>Conte como pretende divulgar o MBO. A participação depende de aprovação.</CardDescription></CardHeader>
        <CardContent><form onSubmit={submit} className="space-y-5">
          <div className="space-y-2"><Label htmlFor="partner-name">Seu nome</Label><Input id="partner-name" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="partner-channel">Como você pretende divulgar?</Label><Textarea id="partner-channel" minLength={5} maxLength={500} required rows={5} placeholder="Conte sobre seus canais e seu público." value={channel} onChange={e => setChannel(e.target.value)} /><p className="text-xs text-muted-foreground">Não envie documentos, senhas ou dados bancários.</p></div>
          {apply.isError && <p role="alert" className="text-sm text-destructive">{apply.error.message}</p>}
          <Button type="submit" disabled={apply.isPending} className="w-full">{apply.isPending ? 'Enviando…' : 'Quero ser afiliado'}</Button>
        </form></CardContent></Card>
    </div>}
    {profile && profile.status !== 'approved' && <Card className="max-w-2xl"><CardHeader><Clock3 className="mb-3 h-8 w-8 text-primary" /><CardTitle>{profile.status === 'pending' ? 'Sua solicitação está em análise' : profile.status === 'suspended' ? 'Sua participação está suspensa' : 'Sua solicitação não foi aprovada'}</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-muted-foreground"><p>{profile.status === 'pending' ? 'Recebemos seu cadastro. Você poderá acompanhar a decisão por esta página.' : profile.status === 'suspended' ? 'Durante a suspensão, novas comissões e solicitações de saque não são permitidas. Entre em contato com o suporte para esclarecer sua situação.' : 'Neste momento, seu cadastro não foi aprovado para o programa.'}</p>
        {data?.application?.decision_reason && profile.status === 'rejected' && <p className="rounded-lg bg-muted p-4">{data.application.decision_reason}</p>}
        <Button variant="outline" asChild><a href="https://wa.me/5585989613799" target="_blank" rel="noopener noreferrer">Falar com o suporte</a></Button>
      </CardContent></Card>}
  </main>;
}
