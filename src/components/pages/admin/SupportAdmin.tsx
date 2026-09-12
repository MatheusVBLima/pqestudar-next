"use client";
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type Message = { id: string; created_at: string; email: string; subject: string; description: string };
const date = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export default function SupportAdmin() {
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Message | null>(null);
  const query = useQuery({
    queryKey: ['admin-support', page, search],
    queryFn: async (): Promise<{ messages: Message[]; total: number }> => {
      const response = await fetch(`/api/admin/support?${new URLSearchParams({ page: String(page), search })}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível carregar as mensagens.');
      return result;
    },
  });
  const total = query.data?.total ?? 0;
  function submit(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(input.trim()); }
  return <div className="min-w-0 space-y-5">
    <div><h1 className="text-2xl font-semibold">Suporte</h1><p className="mt-1 text-sm text-muted-foreground">Mensagens enviadas pelo formulário do site.</p></div>
    <div className="overflow-hidden rounded-[var(--admin-radius)] border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b p-4">
        <form onSubmit={submit} className="relative flex-1"><Input aria-label="Pesquisar assunto" placeholder="Pesquisar assunto" value={input} onChange={event => setInput(event.target.value)} className="h-11 pr-12" /><Button type="submit" variant="ghost" size="icon" className="absolute right-1 top-1 h-9 w-9" aria-label="Pesquisar"><Search className="h-4 w-4" /></Button></form>
        <Button variant="ghost" size="icon" aria-label="Atualizar mensagens" title="Atualizar mensagens" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} /></Button>
      </div>
      {query.isError ? <div role="alert" className="p-6 text-sm text-destructive">{query.error.message}<Button variant="outline" className="ml-3" onClick={() => void query.refetch()}>Tentar novamente</Button></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] table-fixed text-left text-sm">
          <colgroup><col className="w-40" /><col /><col className="w-[30%]" /><col className="w-20" /></colgroup>
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr>{['Enviada em', 'Assunto', 'E-mail', 'Ações'].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{query.isPending ? <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Carregando mensagens…</td></tr> : !query.data?.messages.length ? <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">{search ? 'Nenhuma mensagem encontrada.' : 'Nenhuma mensagem recebida ainda.'}</td></tr> : query.data.messages.map(message => <tr key={message.id} className="hover:bg-muted/30">
            <td className="px-4 py-3 text-muted-foreground">{date(message.created_at)}</td>
            <td className="px-4 py-3"><button className="block max-w-full truncate text-left font-medium hover:text-primary" onClick={() => setSelected(message)}>{message.subject}</button></td>
            <td className="px-4 py-3"><span className="block truncate" title={message.email}>{message.email}</span></td>
            <td className="px-4 py-3"><Button variant="ghost" size="icon" aria-label={`Ler mensagem: ${message.subject}`} title="Ler mensagem" onClick={() => setSelected(message)}><Eye className="h-4 w-4" /></Button></td>
          </tr>)}</tbody>
        </table></div>}
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground"><span>{total} mensagens</span><div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Página anterior" disabled={page === 1 || query.isFetching} onClick={() => setPage(value => value-1)}><ChevronLeft className="h-4 w-4" /></Button><span>{page} / {Math.max(1, Math.ceil(total/20))}</span><Button variant="ghost" size="icon" aria-label="Próxima página" disabled={page*20 >= total || query.isFetching} onClick={() => setPage(value => value+1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
    </div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto rounded-[var(--admin-radius)] sm:max-w-2xl">
      <DialogHeader><DialogTitle className="break-words">{selected?.subject}</DialogTitle><DialogDescription className="break-all">{selected?.email} · {selected && date(selected.created_at)}</DialogDescription></DialogHeader>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected?.description}</p>
      <div className="flex justify-end"><Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button></div>
    </DialogContent></Dialog>
  </div>;
}
