'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { editorial } from '@/lib/author-editorial';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthorAccessControl({ authorId, accountId }: { authorId: string; accountId: string | null }) {
  const [email,setEmail]=useState(''); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const cache=useQueryClient();
  const role=useQuery({queryKey:['author-access',authorId,accountId],enabled:!!accountId,queryFn:async()=>{const {data,error}=await supabase.rpc('has_role',{_user_id:accountId!,_role:'author'});if(error)throw error;return data;}});
  async function change(enabled:boolean){setBusy(true);setMessage('');try{const {error}=await editorial.rpc('set_author_access',{target:authorId,account_email:email,enabled});if(error)throw error;await Promise.all([cache.invalidateQueries({queryKey:['author-access']}),cache.invalidateQueries({queryKey:['author-editor']}),cache.invalidateQueries({queryKey:['check-admin']}),cache.invalidateQueries({queryKey:['my-author-profile']})]);setMessage(enabled?'Conta vinculada e painel liberado.':'Acesso ao painel removido. As publicações foram preservadas.');}catch(error){setMessage(error && typeof error==='object' && 'message' in error?String(error.message):'Não foi possível alterar o acesso.');}finally{setBusy(false);}}
  return <div className="mt-5 space-y-3 border-t pt-4"><h3 className="font-semibold">Acesso ao Painel do autor</h3><p className="text-xs text-muted-foreground">{role.data?'Acesso de autor ativo.':'Informe o e-mail de uma conta já cadastrada para vincular este perfil e conceder a role de autor.'}</p><Label htmlFor="author-access-email">E-mail da conta</Label><Input id="author-access-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="autor@exemplo.com" /><div className="flex flex-wrap gap-2"><Button type="button" disabled={busy||!email.includes('@')} onClick={()=>change(true)}>Vincular e liberar painel</Button>{role.data&&<Button type="button" variant="outline" disabled={busy} onClick={()=>change(false)}>Remover acesso de autor</Button>}</div><p role="status" className="text-sm">{message}</p></div>;
}
