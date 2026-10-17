'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnersRequest } from '@/lib/affiliates/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
type Settings={tracking_enabled:boolean;attribution_days:number};
export function AffiliateTrackingSettings({userId}:{userId:string}) {
 const cache=useQueryClient();
 const key=['affiliate-tracking-settings',userId];
 const query=useQuery({queryKey:key,queryFn:()=>partnersRequest<Settings>('/api/admin/affiliates/tracking'),retry:false});
 const mutation=useMutation({mutationFn:(body:{enabled:boolean;days:number})=>partnersRequest('/api/admin/affiliates/tracking',body),onSuccess:async()=>{await cache.invalidateQueries({queryKey:key});await cache.invalidateQueries({queryKey:['affiliate-membership']});toast.success('Configuração registrada.');}});
 return <Card><CardHeader><CardTitle>Rastreamento de indicações</CardTitle></CardHeader><CardContent>{query.isPending?<p role="status">Carregando configuração…</p>:query.isError?<p role="alert">{query.error.message}</p>:<form key={JSON.stringify(query.data)} className="space-y-4" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);mutation.mutate({enabled:data.has('enabled'),days:Number(data.get('days'))});}}><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="enabled" className="h-4 w-4 accent-primary" defaultChecked={query.data?.tracking_enabled} />Aceitar novas indicações</label><div className="max-w-xs space-y-2"><Label htmlFor="attribution-days">Janela de atribuição (dias)</Label><Input id="attribution-days" name="days" type="number" min={1} max={90} required defaultValue={query.data?.attribution_days} /></div><p className="text-xs text-muted-foreground">Último clique válido. A alteração de prazo vale para novas indicações. Desativar não altera pedidos já atribuídos.</p>{mutation.isError&&<p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}<Button disabled={mutation.isPending}>{mutation.isPending?'Salvando…':'Salvar configuração'}</Button></form>}</CardContent></Card>;
}
