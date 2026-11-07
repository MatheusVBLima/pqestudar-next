'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOwnAuthor } from '@/hooks/useOwnAuthor';
import { useGuidePublicCategories } from '@/hooks/useGuidePublicCategories';
import { supabase } from '@/integrations/supabase/client';
import { editorial, draftLabels, emptyDraft, uploadAuthorImage, type AuthorDraft, type DraftContent } from '@/lib/author-editorial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { AuthorBadgeDisplay } from './AuthorBadgeDisplay';
import { AuthorPrivateProgress } from './AuthorPrivateProgress';
import { revalidateGuidesAction } from '@/app/actions/revalidate';
import { toast } from 'sonner';

const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Não foi possível concluir. Tente novamente.';
type Selection = { draft?: AuthorDraft; sourceId?: string; content: DraftContent };

export function AuthorEditorialPanel({ reviewer = false, view = 'guides' }: { reviewer?: boolean; view?: 'guides' | 'overview' | 'badges' }) {
  const { user } = useAuth();
  const own = useOwnAuthor();
  const cache = useQueryClient();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(reviewer ? 'in_review' : 'all');
  const drafts = useQuery({ queryKey: ['author-drafts', user?.id, reviewer, own.data?.id], enabled: !!user && (reviewer || !!own.data?.id), queryFn: async () => {
    let query = editorial.from('author_guide_drafts').select('*').order('updated_at', { ascending: false });
    if (!reviewer) query = query.eq('author_id', own.data!.id);
    const { data, error } = await query; if (error) throw error; return data;
  } });
  const published = useQuery({ queryKey: ['author-published-editorial', user?.id, own.data?.id], enabled: !reviewer && !!own.data?.id, queryFn: async () => {
    const { data, error } = await supabase.from('guides').select('*').eq('author_id', own.data!.id).eq('is_published', true).order('created_at', { ascending: false }); if (error) throw error; return data;
  } });
  const badges = useQuery({ queryKey: ['author-workspace-badges', user?.id, own.data?.id], enabled: view === 'badges' && !!own.data?.id, queryFn: async () => {
    const { data, error } = await supabase.from('author_badges').select('*').eq('author_id', own.data!.id).order('earned_at'); if (error) throw error; return data;
  } });
  const refresh = async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['author-drafts'] }), cache.invalidateQueries({ queryKey: ['author-published-editorial'] }), cache.invalidateQueries({ queryKey: ['guides'] })]); };
  if (!reviewer && own.isPending) return <p role="status">Carregando seu perfil…</p>;
  if (!reviewer && own.isError) return <p role="alert">Não foi possível carregar seu perfil. Atualize a página.</p>;
  if (!reviewer && !own.data) return <div><h1 className="text-2xl font-bold">Vincule seu perfil de autor</h1><p className="mt-3 text-muted-foreground">A administração precisa vincular sua conta a um perfil antes de você criar guias.</p><Button asChild variant="link"><Link href="/autores/meu-perfil">Ver meu perfil</Link></Button></div>;
  if (selection) return <DraftEditor key={selection.draft?.id || selection.sourceId || 'new'} selection={selection} reviewer={reviewer} onBack={() => setSelection(null)} onRefresh={refresh} />;
  if (drafts.isError || published.isError || badges.isError) return <div role="alert"><p>Não foi possível carregar os dados.</p><Button onClick={() => { void drafts.refetch(); void published.refetch(); void badges.refetch(); }}>Tentar novamente</Button></div>;
  if (view === 'badges') return <><h1 className="text-2xl font-bold">Minhas conquistas</h1><p className="mt-2 text-muted-foreground">Reconhecimentos por guias publicados e constância. Passe sobre um badge para conhecer o critério.</p><div className="my-6 flex flex-wrap gap-3">{badges.data?.map(b => <AuthorBadgeDisplay key={b.code} badge={b} />)}{!badges.isPending && !badges.data?.length && <p>Sua primeira conquista começa com um guia aprovado.</p>}</div><AuthorPrivateProgress authorId={own.data!.id} /><p className="mt-4 text-sm text-muted-foreground">Próximas metas: 1, 10 e 50 guias publicados; 3 e 6 meses consecutivos; 10 guias em uma categoria; 2 guias em cada uma de 3 categorias.</p></>;
  if (view === 'overview') return <><h1 className="text-2xl font-bold">Seu espaço de criação</h1><p className="mt-2 text-muted-foreground">Escreva, envie para revisão e acompanhe suas publicações.</p><div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{(['draft','in_review','changes_requested','published'] as const).map(s => <div key={s} className="rounded-xl border p-4"><strong className="text-2xl">{s === 'published' ? published.data?.length ?? 0 : drafts.data?.filter(d => d.status === s).length ?? 0}</strong><p className="text-sm text-muted-foreground">{draftLabels[s]}</p></div>)}</div><Button asChild><Link href="/autor/guias">Criar ou continuar um guia</Link></Button><div className="mt-6"><AuthorPrivateProgress authorId={own.data!.id} /></div></>;
  const visible = (drafts.data || []).filter(d => (status === 'all' || d.status === status) && `${d.content.title} ${d.content.short_description}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const legacy = (published.data || []).filter(g => !drafts.data?.some(d => d.guide_id === g.id) && (status === 'all' || status === 'published') && g.title.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">{reviewer ? 'Revisão de guias' : 'Meus guias'}</h1><p className="mt-2 text-sm text-muted-foreground">{reviewer ? 'Confira o conteúdo e aprove ou solicite ajustes ao autor.' : 'A versão publicada permanece no ar enquanto suas alterações são revisadas.'}</p></div>{!reviewer && <Button onClick={() => setSelection({ content: { ...emptyDraft } })}>Novo guia</Button>}</div>
    <div className="my-6 flex flex-wrap gap-3"><Input className="min-w-0 flex-1" aria-label="Pesquisar guias" placeholder="Pesquisar guias" value={search} onChange={e => setSearch(e.target.value)} /><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48" aria-label="Situação dos guias"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as situações</SelectItem>{Object.entries(draftLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    {drafts.isPending ? <p role="status">Carregando guias…</p> : <div className="space-y-3">{visible.map(d => <article key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div className="min-w-0"><span className="text-xs font-medium text-primary">{draftLabels[d.status]}</span><h2 className="break-words font-semibold">{d.content.title || 'Guia sem título'}</h2><p className="text-xs text-muted-foreground">Atualizado em {new Date(d.updated_at).toLocaleDateString('pt-BR')}</p></div><Button variant="outline" onClick={() => setSelection({ draft: d, content: d.content })}>{reviewer ? 'Revisar' : d.status === 'in_review' ? 'Acompanhar' : 'Abrir guia'}</Button></article>)}{legacy.map(g => <article key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><span className="text-xs text-primary">Publicado</span><h2 className="font-semibold">{g.title}</h2></div><Button variant="outline" onClick={() => setSelection({ sourceId: g.id, content: { ...emptyDraft, title:g.title,slug:g.slug,short_description:g.short_description,content_markdown:g.content_markdown,category:g.category,public_category:g.public_category,cover_image_url:g.cover_image_url || '',seo_title:g.seo_title || '',seo_description:g.seo_description || '' } })}>Criar revisão</Button></article>)}{!visible.length && !legacy.length && <p className="rounded-xl border border-dashed p-6 text-muted-foreground">Nenhum guia nesta situação.</p>}</div>}
  </>;
}

function DraftEditor({ selection, reviewer, onBack, onRefresh }: { selection: Selection; reviewer: boolean; onBack: () => void; onRefresh: () => Promise<void> }) {
  const { user } = useAuth();
  const categories = useGuidePublicCategories();
  const [draft, setDraft] = useState(selection.draft);
  const [content, setContent] = useState({ ...emptyDraft, ...selection.content });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const readOnly = reviewer || draft?.status === 'in_review';
  const history = useQuery({ queryKey: ['author-draft-history', user?.id, draft?.id, draft?.revision], enabled: !!draft, queryFn: async () => { const {data,error}=await editorial.from('author_guide_history').select('*').eq('draft_id',draft!.id).order('created_at',{ascending:false}); if(error)throw error; return data; } });
  const change = (key: keyof DraftContent, value: string) => { setContent(c => ({ ...c, [key]: value })); setDirty(true); };
  async function save(submit: boolean) {
    setBusy(true); setMessage('');
    try {
      const {data,error}=await editorial.rpc('save_author_draft',{target:draft?.id || null,payload:content,expected_revision:draft?.revision || null,source_guide:selection.sourceId || null}); if(error)throw error;
      setDraft(data); setDirty(false);
      if(submit){const {error}=await editorial.rpc('submit_author_draft',{target:data.id,expected_revision:data.revision});if(error)throw error;await onRefresh();onBack();toast.success('Guia enviado para revisão.');}
      else {await onRefresh();setMessage('Rascunho salvo.');}
    } catch(error){setMessage(errorMessage(error));} finally {setBusy(false);}
  }
  async function review(decision: string) {
    setBusy(true);setMessage('');try {const {error}=await editorial.rpc('review_author_draft',{target:draft!.id,expected_revision:draft!.revision,decision,note});if(error)throw error;await revalidateGuidesAction(content.slug);await onRefresh();onBack();toast.success(decision==='approve'?'Guia publicado.':'Ajustes enviados ao autor.');}catch(error){setMessage(errorMessage(error));}finally{setBusy(false);}
  }
  return <div className="space-y-5">
    <Button variant="ghost" disabled={busy} onClick={() => { if (!dirty || window.confirm('Sair sem salvar as alterações?')) onBack(); }}>← Voltar aos guias</Button>
    <h1 className="text-2xl font-bold">{reviewer ? 'Revisar guia' : 'Editar guia'}</h1>
    {draft?.feedback && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><h2 className="font-semibold">Retorno da revisão</h2><p className="mt-2 whitespace-pre-wrap text-sm">{draft.feedback}</p></div>}
    {readOnly ? <><h2 className="text-xl font-bold">{content.title}</h2><p className="text-sm text-muted-foreground">{content.public_category} · {content.short_description}</p>{content.cover_image_url && <img src={content.cover_image_url} alt="Capa do guia" className="max-h-64 rounded-xl object-contain" />}<MarkdownContent>{content.content_markdown}</MarkdownContent></> : <fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">{([['title','Título'],['slug','Endereço do guia'],['seo_title','Título para buscas']] as const).map(([key,label]) => <div key={key}><Label htmlFor={`draft-${key}`}>{label}</Label><Input id={`draft-${key}`} className="mt-2" value={content[key]} disabled={key==='slug' && !!(draft?.guide_id || selection.sourceId)} onChange={e => change(key,e.target.value)} /></div>)}<div><Label htmlFor="draft-category">Categoria</Label><Select value={content.public_category} onValueChange={value => { change('public_category',value); if (!content.category) change('category',value); }}><SelectTrigger id="draft-category" className="mt-2"><SelectValue placeholder="Escolha uma categoria" /></SelectTrigger><SelectContent>{categories.data?.map(category => <SelectItem key={category.name} value={category.name}>{category.name}</SelectItem>)}</SelectContent></Select></div></div>
      <Label htmlFor="draft-summary">Resumo</Label><Textarea id="draft-summary" value={content.short_description} onChange={e => change('short_description',e.target.value)} maxLength={500} />
      <Label htmlFor="draft-cover">Imagem de capa</Label><Input id="draft-cover" type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => {const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);try{const uploaded=await uploadAuthorImage(file);change('cover_image_url',uploaded.publicUrl);}catch(error){setMessage(errorMessage(error));}finally{setBusy(false);}}} />{content.cover_image_url && <img src={content.cover_image_url} alt="Capa do guia" className="max-h-40 rounded-xl" />}
      <MarkdownEditor value={content.content_markdown} onChange={value => change('content_markdown',value)} visual uploadImage={uploadAuthorImage} />
      <Label htmlFor="draft-seo">Descrição para buscas</Label><Textarea id="draft-seo" value={content.seo_description} onChange={e=>change('seo_description',e.target.value)} maxLength={300} />
    </fieldset>}
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
    {!readOnly && <div className="flex flex-wrap gap-3"><Button disabled={busy} variant="outline" onClick={()=>save(false)}>Salvar rascunho</Button><Button disabled={busy} onClick={()=>save(true)}>Enviar para revisão</Button></div>}
    {reviewer && draft?.status==='in_review' && <div className="space-y-3 rounded-xl border p-4"><Label htmlFor="review-note">Orientações para o autor</Label><Textarea id="review-note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Explique os ajustes necessários ou deixe uma mensagem de aprovação." /><div className="flex flex-wrap gap-3"><Button disabled={busy} variant="outline" onClick={()=>review('request_changes')}>Solicitar ajustes</Button><Button disabled={busy} onClick={()=>review('approve')}>Aprovar e publicar</Button></div><p className="text-xs text-muted-foreground">O autor não pode aprovar o próprio guia.</p></div>}
    {draft?.status==='in_review' && !reviewer && <p className="text-sm text-muted-foreground">Enviado para revisão. Você poderá editar novamente se forem solicitados ajustes.</p>}
    {!!history.data?.length && <details className="border-t pt-4"><summary className="cursor-pointer font-medium">Histórico de revisão</summary><ul className="mt-3 space-y-3">{history.data.map(h=><li key={h.id} className="text-sm"><strong>{h.action==='submitted'?'Enviado para revisão':h.action==='approve'?'Aprovado':'Ajustes solicitados'}</strong><span className="ml-2 text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR')}</span>{h.feedback&&<p className="whitespace-pre-wrap">{h.feedback}</p>}</li>)}</ul></details>}
  </div>;
}
