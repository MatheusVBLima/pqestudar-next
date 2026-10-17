'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AFFILIATE_CODE_PATTERN, normalizeAffiliateCode } from '@/lib/affiliates/code';
import { partnersRequest } from '@/lib/affiliates/client';
import type { AffiliateDashboard } from '@/lib/affiliates/types';
import s from './approved-affiliate.module.css';

export function AffiliateCodeEditor({ userId, code, version }: { userId:string; code:string; version:number }) {
  const [editing,setEditing]=useState(false), [draft,setDraft]=useState(code), [checked,setChecked]=useState('');
  const normalized=normalizeAffiliateCode(draft), valid=AFFILIATE_CODE_PATTERN.test(normalized);
  const cache=useQueryClient();
  useEffect(()=>{ const timer=setTimeout(()=>setChecked(normalized),400); return ()=>clearTimeout(timer); },[normalized]);
  const availability=useQuery({queryKey:['affiliate-code-available',userId,checked],queryFn:()=>partnersRequest<{code:string;available:boolean;current:boolean}>(`/api/affiliates/code?code=${encodeURIComponent(checked)}`),enabled:editing&&valid&&checked===normalized&&normalized!==code,retry:false,staleTime:0});
  const change=useMutation({mutationFn:()=>partnersRequest<{code:string;version:number}>('/api/affiliates/code',{code:normalized,version}),onSuccess:async result=>{
    cache.setQueryData<AffiliateDashboard>(['affiliate-membership',userId],old=>old?.profile?{...old,profile:{...old.profile,...result}}:old);
    setEditing(false); toast.success('Código atualizado. Seus links anteriores continuam funcionando.');
    await cache.invalidateQueries({queryKey:['affiliate-membership',userId]});
    await cache.invalidateQueries({queryKey:['affiliate-code-available',userId]});
  },onError:async()=>{ await cache.invalidateQueries({queryKey:['affiliate-code-available',userId]}); await cache.invalidateQueries({queryKey:['affiliate-membership',userId]}); }});
  if(!editing) return <button className={s.chip} onClick={()=>{setDraft(code);change.reset();setEditing(true);}}><Pencil className="inline-block mr-2"/>Personalizar código</button>;
  const ready=valid&&checked===normalized&&normalized!==code&&!availability.isFetching&&availability.data?.available===true&&!availability.isError;
  return <form className={s.editor} onSubmit={e=>{e.preventDefault();if(ready&&!change.isPending)change.mutate();}}>
    <label htmlFor="affiliate-code">Novo código de afiliado</label>
    <input id="affiliate-code" value={draft} maxLength={32} autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={change.isPending} onChange={e=>{setDraft(e.target.value);change.reset();}} aria-describedby="affiliate-code-help affiliate-code-status"/>
    <p id="affiliate-code-help" className={s.sub}>De 3 a 32 letras, números ou hífens. Sem espaços ou acentos. Letras maiúsculas serão convertidas em minúsculas. Os links anteriores continuam funcionando.</p>
    <p id="affiliate-code-status" role="status">{!valid?'Use de 3 a 32 caracteres, começando e terminando com letra ou número.':normalized===code?'Este é o seu código atual.':checked!==normalized||availability.isFetching?'Verificando disponibilidade…':availability.isError?'Não foi possível verificar. Tente novamente.':availability.data?.available?'Código disponível.':'Este código já está em uso. Escolha outro.'}</p>
    {change.isError&&<p role="alert">{change.error.message}</p>}
    <div className={s.badges}><button className={s.copy} disabled={!ready||change.isPending} type="submit"><Save/>{change.isPending?'Salvando…':'Salvar código'}</button><button className={s.chip} type="button" disabled={change.isPending} onClick={()=>setEditing(false)}>Cancelar</button>{availability.isError&&<button className={s.chip} type="button" onClick={()=>availability.refetch()}>Verificar novamente</button>}</div>
  </form>;
}
