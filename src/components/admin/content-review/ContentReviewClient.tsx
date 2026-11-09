'use client';

import {useEffect,useRef,useState} from 'react';
import {Search,ShieldCheck,ArrowUpRight,Loader2,Check,History,RotateCcw,FileSearch,Pause,Bot,Send,ChevronDown,SlidersHorizontal,ClipboardCheck,X,PieChart} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import ReviewMarkdown from './ReviewMarkdown';
import ReviewPieChart from './ReviewPieChart';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {TEXT_MODELS,SEARCH_MODELS,reviewCoverage,verdictLabels,type Claim,type Verdict,type ReviewTarget,type ReviewRun,type ReviewHistory} from '@/lib/content-review';
import styles from './content-review.module.css';

const names:Record<string,string>={description_short:'Resumo',description_full:'Conteúdo do curso',title:'Título',name:'Nome',description:'Descrição',short_description:'Resumo',content_markdown:'Conteúdo',cta_top_text:'CTA inicial',cta_middle_text:'CTA intermediário',cta_final_text:'CTA final'};
const kindNames={guides:'Guia',tools:'Ferramenta',courses:'Curso'};
async function api(body:Record<string,unknown>){
 const res=await fetch('/api/admin/content-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw new Error(data.error||'Não foi possível concluir a operação.');return data;
}
const date=(value:string)=>new Date(value).toLocaleString('pt-BR');

export function ContentReviewClient(){
 const pageRef=useRef<HTMLElement>(null),composerRef=useRef<HTMLFormElement>(null),resultsRef=useRef<HTMLDetailsElement>(null),workspaceRef=useRef<HTMLElement>(null);
 const [resultsOpen,setResultsOpen]=useState(true);
 const [textModel,setTextModel]=useState('gpt-4.1'),[searchModel,setSearchModel]=useState('gpt-4.1-mini');
 const [provider,setProvider]=useState<'openai'|'lovable'>('openai');
 const [query,setQuery]=useState(''),[kind,setKind]=useState(''),[targets,setTargets]=useState<ReviewTarget[]>([]),[searched,setSearched]=useState(false);
 const [target,setTarget]=useState<ReviewTarget|null>(null),[fields,setFields]=useState<Record<string,string|null>>({}),[runs,setRuns]=useState<ReviewRun[]>([]),[run,setRun]=useState<ReviewRun|null>(null),[history,setHistory]=useState<ReviewHistory[]>([]);
 const [selected,setSelected]=useState(''),[edits,setEdits]=useState<Record<string,string>>({}),[accepted,setAccepted]=useState<string[]>([]);
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[sourceHints,setSourceHints]=useState('');
 const [panel,setPanel]=useState<'result'|'history'|'models'|'chart'|null>(null),[historyTab,setHistoryTab]=useState<'runs'|'changes'>('runs');
 const [confirm,setConfirm]=useState<'apply'|'manual'|ReviewHistory|null>(null);const stop=useRef(false);
 const [draft,setDraft]=useState<Record<string,string|null>>({}),[rowHash,setRowHash]=useState(''),[documentMode,setDocumentMode]=useState<'editor'|'evidence'>('editor');
 const changedFields=Object.fromEntries(Object.entries(draft).filter(([key,value])=>value!==fields[key]));
 const dirty=Object.keys(changedFields).length>0;
 useEffect(()=>{
  const viewport=window.visualViewport;
  const update=()=>{
   const height=viewport?.height||window.innerHeight;
   const offset=viewport&&viewport.scale===1?Math.max(0,window.innerHeight-height-viewport.offsetTop):0;
   pageRef.current?.style.setProperty('--review-keyboard-offset',offset+'px');
   pageRef.current?.style.setProperty('--review-viewport-height',height+'px');
   pageRef.current?.style.setProperty('--review-composer-height',(composerRef.current?.getBoundingClientRect().height||64)+'px');
  };
  const observer=new ResizeObserver(update);if(composerRef.current)observer.observe(composerRef.current);
  update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);
  return()=>{observer.disconnect();viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
 },[]);
 useEffect(()=>{if(searched&&matchMedia('(max-width: 800px)').matches)resultsRef.current?.scrollIntoView({block:'start'});},[searched,targets]);
 useEffect(()=>{if(target&&matchMedia('(max-width: 800px)').matches)workspaceRef.current?.scrollIntoView({block:'start'});},[target?.id]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{if((error||notice)&&target)setPanel('result');},[error,notice,target]);
 const checked=run?.claims.filter(c=>c.checked_at).length||0;
 const eligible=run?.claims.filter(c=>c.status!=='editorial').length||0;
 const protect=async(task:()=>Promise<void>)=>{setError('');setNotice('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Falha na operação.');}finally{setBusy('');}};
 function selectRun(next:ReviewRun|null){setRun(next);setSelected('');setAccepted([]);setEdits({});}
 async function refresh(item:ReviewTarget){const data=await api({action:'detail',kind:item.kind,id:item.id});setFields(data.fields);setDraft(data.fields);setRowHash(data.row_hash);setTarget(prev=>prev?.id===item.id&&prev.kind===item.kind?{...prev,title:data.fields.title||data.fields.name||prev.title}:prev);setRuns(data.runs);setHistory(data.history);return data;}
 function search(){setBusy('Buscando conteúdos');void protect(async()=>{const data=await api({action:'search',query,kind});setTargets(data.targets);setSearched(true);setResultsOpen(true);});}
 function open(item:ReviewTarget){if(dirty)return;setBusy('Abrindo conteúdo');void protect(async()=>{const data=await refresh(item);setTarget(item);setResultsOpen(false);selectRun(data.runs[0]||null);setPanel(null);setDocumentMode('editor');});}
 async function verifyAll(initial:ReviewRun){
  if(!initial.claims.length){setError('Nenhuma afirmação válida foi extraída. Nada foi verificado. Inicie uma nova análise.');return;}
  setDocumentMode('evidence');stop.current=false;let latest=initial;
  for(const c of initial.claims.filter(c=>c.status!=='editorial'&&!c.checked_at)){
   if(stop.current)break;
   setBusy(`Pesquisando afirmação ${latest.claims.filter(c=>c.checked_at).length+1} de ${initial.claims.filter(c=>c.status!=='editorial').length}`);
   const data=await api({action:'verify',run_id:initial.id,claim_id:c.id,sources:sourceHints.split('\n').map(s=>s.trim()).filter(Boolean)});
   latest=data.run;setRun(latest);setRuns(prev=>[latest,...prev.filter(r=>r.id!==latest.id)]);
  }
  setNotice(stop.current?'Análise pausada. As verificações concluídas foram salvas.':`Análise encerrada: ${latest.claims.filter(c=>c.status==='confirmed').length} confirmadas, ${latest.claims.filter(c=>c.status==='contradicted').length} contraditas, ${latest.claims.filter(c=>c.status==='uncertain').length} precisam de confirmação e ${latest.claims.filter(c=>c.status==='unverified').length} não verificadas. Confira o diagnóstico de cada trecho.`);
 }
 function start(){if(!target||dirty)return;setPanel(null);setBusy('Identificando afirmações');void protect(async()=>{let data;try{data=await api({action:'start',kind:target.kind,id:target.id,provider,text_model:textModel,search_model:searchModel});}catch(error){try{const latest=await refresh(target);selectRun(latest.runs[0]||null);}catch{}throw error;}selectRun(data.run);setRuns(prev=>[data.run,...prev]);await verifyAll(data.run);});}
 function resume(){if(!run||dirty)return;setBusy('Retomando pesquisa');void protect(()=>verifyAll(run));}
 function save(){if(!confirm||!target||(confirm==='apply'&&!run))return;const request=confirm;setConfirm(null);setBusy(request==='manual'?'Salvando edição':request==='apply'?'Aplicando correções':'Desfazendo correção');void protect(async()=>{
  await api(request==='manual'?{action:'save_manual',kind:target.kind,id:target.id,expected_hash:rowHash,fields:changedFields}:request==='apply'?{action:'apply',run_id:run!.id,changes:accepted.map(id=>({id,text:edits[id]??run!.claims.find(c=>c.id===id)?.replacement}))}:{action:'undo',run_id:request.run_id,event_id:request.id});
  const data=await refresh(target);selectRun(data.runs[0]||null);setNotice(request==='manual'?'Edição salva com histórico. Uma nova análise verificará o texto atualizado.':request==='apply'?'Correções aplicadas ao conteúdo. O histórico preserva a versão anterior.':'Correção desfeita. Inicie uma nova análise para revisar a versão restaurada.');
 });}
 const coverage=run?reviewCoverage(run.snapshot,run.claims):null;
 const legacyConfirmation=run?.claims.some(c=>c.status==='confirmed'&&!c.checks?.length);
 const activeFields=run?.status==='ready'?run.snapshot:fields;
 return <main ref={pageRef} className={`${styles.page} ${searched?styles.hasResults:styles.landing}`}>
  <header className={styles.hero}>
   <div className={styles.agentBadge}><Bot aria-hidden/> Central de revisão</div>
   <h1>O que vamos verificar hoje?</h1>
  </header>
  <form ref={composerRef} className={styles.searchBox} onSubmit={e=>{e.preventDefault();if(matchMedia('(max-width: 800px)').matches)(document.activeElement as HTMLElement)?.blur();search();}}>
   <label htmlFor="review-search" className="sr-only">O que você quer verificar?</label>
   <input id="review-search" type="search" autoComplete="off" className={styles.prompt} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busque um tema ou cole uma rota" maxLength={160} disabled={!!busy}/>
   <div className={styles.composerToolbar}>
    <Select value={kind||'all'} disabled={!!busy} onValueChange={value=>setKind(value==='all'?'':value)}><SelectTrigger aria-label="Tipo de conteúdo" className={styles.scopeTrigger}><Search size={18} aria-hidden/><SelectValue/></SelectTrigger><SelectContent>{[['all','Todos os conteúdos'],['guides','Guias'],['tools','Ferramentas'],['courses','Cursos']].map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
    <span className={styles.adminHint}><ShieldCheck size={18} aria-hidden/><span>Somente admins</span></span>
    <button className={styles.sendButton} disabled={!!busy} type="submit" aria-label="Buscar conteúdo" title="Buscar conteúdo">{busy?<Loader2 className="animate-spin"/>:<Send aria-hidden/>}</button>
   </div>
  </form>
  {!target&&<>{error&&<div role="alert" className={styles.error}>{error}</div>}{notice&&<div role="status" className={styles.notice}>{notice}</div>}
  {busy&&<div role="status" className={styles.progress}><Loader2 className="animate-spin" size={17}/>{busy}… {busy.startsWith('Pesquisando')&&<Button variant="outline" size="sm" onClick={()=>{stop.current=true;setNotice('A pesquisa será pausada ao concluir a afirmação atual.');}}><Pause size={14}/> Pausar</Button>}</div>}</>}
  {searched&&<details ref={resultsRef} aria-label="Resultados" className={styles.results} open={resultsOpen} onToggle={e=>setResultsOpen(e.currentTarget.open)}><summary className={styles.sectionTitle}><strong><ChevronDown aria-hidden className={styles.disclosureArrow}/> Conteúdos encontrados <span className={styles.countBadge}>{targets.length}</span></strong><span>{resultsOpen?'Recolher':'Ver resultados'}</span></summary>{!targets.length?<p>Nenhum conteúdo encontrado. Tente outro título ou rota.</p>:<div className={styles.resultList}>{targets.map(item=><button key={`${item.kind}-${item.id}`} type="button" disabled={!!busy||dirty} onClick={()=>open(item)} aria-pressed={target?.id===item.id&&target?.kind===item.kind}><FileSearch size={20}/><span><strong>{item.title}</strong><small>{item.route}</small></span><span className={styles.resultMeta}>{kindNames[item.kind]}<small>{item.published?'Publicado':'Rascunho / oculto'}</small></span></button>)}</div>}</details>}
  {target&&<section ref={workspaceRef} className={styles.workspace}>
   <div className={styles.workspaceHead}><div><span className={styles.eyebrow}>{kindNames[target.kind]} · {target.published?'PUBLICADO':'RASCUNHO / OCULTO'}</span><h2>{target.title}</h2><a href={target.route} target="_blank" rel="noopener noreferrer">Abrir página <ArrowUpRight size={14}/></a></div><div className={styles.actions}><Button disabled={!!busy||dirty} onClick={start}>{run?'Nova análise':'Analisar informações'}</Button></div></div>
   <div className={styles.reviewDock}>
    <nav className={styles.dockTabs} aria-label="Painéis da revisão">
     <button type="button" aria-expanded={panel==='result'} aria-controls="review-panel" onClick={()=>setPanel(panel==='result'?null:'result')}><ClipboardCheck size={17}/> Resultado <span className={styles.countBadge}>{error?'!':checked+'/'+eligible}</span><ChevronDown className={panel==='result'?styles.rotated:''} size={15}/></button>
     <button type="button" aria-expanded={panel==='chart'} aria-controls="review-panel" onClick={()=>setPanel(panel==='chart'?null:'chart')}><PieChart size={17}/> Gráfico <ChevronDown className={panel==='chart'?styles.rotated:''} size={15}/></button>
     <button type="button" aria-expanded={panel==='history'} aria-controls="review-panel" onClick={()=>setPanel(panel==='history'?null:'history')}><History size={17}/> Histórico <span className={styles.countBadge}>{runs.length+history.length}</span><ChevronDown className={panel==='history'?styles.rotated:''} size={15}/></button>
     <button type="button" aria-expanded={panel==='models'} aria-controls="review-panel" onClick={()=>setPanel(panel==='models'?null:'models')}><SlidersHorizontal size={17}/> Modelos <ChevronDown className={panel==='models'?styles.rotated:''} size={15}/></button>
     <span className={styles.dockContext}>{busy|| (run?checked+' afirmações analisadas':'Configure os modelos e inicie a análise')}</span>
    </nav>
    <div className="sr-only" aria-live="polite">{notice||busy}</div>
    {panel&&<section id="review-panel" aria-label={panel==='chart'?'Gráfico da revisão':panel==='result'?'Resultado da revisão':panel==='history'?'Histórico da revisão':'Modelos da revisão'} className={styles.dockPanel}>
     <div className={styles.panelHeading}><strong>{panel==='chart'?'Distribuição por status · Pizza':panel==='result'?'Resultado e avisos':panel==='history'?'Histórico da revisão':'Modelos para a próxima análise'}</strong><Button size="sm" variant="ghost" aria-label="Recolher painel" onClick={()=>setPanel(null)}><X size={16}/></Button></div>
     {panel==='chart'&&<ReviewPieChart run={run}/>}
     {panel==='result'&&<>
      {error&&<div role="alert" className={styles.error}>{error}</div>}{notice&&<div role="status" className={styles.notice}>{notice}</div>}
  {busy&&<div role="status" className={styles.progress}><Loader2 className="animate-spin" size={17}/>{busy}… {busy.startsWith('Pesquisando')&&<Button variant="outline" size="sm" onClick={()=>{stop.current=true;setNotice('A pesquisa será pausada ao concluir a afirmação atual.');}}><Pause size={14}/> Pausar</Button>}</div>}
      {run?.status==='ready'&&!run.claims.length&&<p role="alert" className={styles.error}>Esta análise está vazia: nenhum fato foi verificado. Inicie uma nova análise para usar a extração corrigida.</p>}
   {run&&<><div className={styles.legend}>{(['confirmed','contradicted','uncertain','unverified','editorial'] as Verdict[]).map(v=><span key={v}><i className={styles[v]}/>{verdictLabels[v]} <b>{run.claims.filter(c=>c.status===v).length}</b></span>)}</div><div className={styles.coverage}><span>{checked} de {eligible} afirmações selecionadas foram analisadas (limite de 30 por análise). Isso não representa a revisão de todo o conteúdo.</span>{run.status==='ready'&&checked<eligible&&<Button size="sm" variant="outline" disabled={!!busy||dirty} onClick={resume}>Continuar pesquisa</Button>}</div>{run.status==='failed'&&<p role="alert">{run.error}</p>}{run.status==='extracting'&&<p>A extração ainda não terminou. Reabra o conteúdo para atualizar. Se a tentativa foi interrompida, inicie uma nova análise.</p>}{run.status==='applied'&&<p className={styles.notice}>Esta análise já foi aplicada. O texto abaixo mostra o conteúdo atual. Consulte os trechos anteriores no histórico ou inicie uma nova análise.</p>}</>}
   {coverage&&<p className={styles.notice}>Cobertura do texto: {coverage.total} blocos — {coverage.complete} totalmente analisados, {coverage.partial} parcialmente analisados e {coverage.untouched} sem análise. “Analisado” não significa “confirmado”. Cabeçalhos Markdown e blocos de imagem ficam fora desta contagem.</p>}
   {legacyConfirmation&&<p className={styles.notice}>Esta análise foi feita antes da verificação de cada ponto do trecho. Inicie uma nova análise para reavaliar as confirmações com o critério mais rigoroso.</p>}
      {!run&&!notice&&!error&&<p>Os resultados e avisos da análise aparecerão aqui.</p>}
     </>}
     {panel==='models'&&<>
      <div className="grid gap-4 my-4 sm:grid-cols-2">
    <div className="space-y-2"><label htmlFor="review-provider">1. Análise textual e diagnóstico</label><Select value={provider} disabled={!!busy} onValueChange={value=>{const next=value as 'openai'|'lovable';setProvider(next);setTextModel(TEXT_MODELS[next][0]);}}><SelectTrigger id="review-provider"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="openai">OpenAI / ChatGPT</SelectItem><SelectItem value="lovable">Lovable / Gemini</SelectItem></SelectContent></Select><Select value={textModel} disabled={!!busy} onValueChange={setTextModel}><SelectTrigger aria-label="Modelo para análise textual"><SelectValue/></SelectTrigger><SelectContent>{TEXT_MODELS[provider].map(model=><SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><label htmlFor="review-search-model">2. Pesquisa de fontes — OpenAI</label><Select value={searchModel} disabled={!!busy} onValueChange={setSearchModel}><SelectTrigger id="review-search-model"><SelectValue/></SelectTrigger><SelectContent>{SEARCH_MODELS.map(model=><SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent></Select><p className="text-sm text-muted-foreground">Pesquisa web independente do modelo textual. As duas etapas usam as respectivas chaves do Fluxo.</p></div>
   </div>
   <details className={styles.sourcesHint}><summary>Orientar a pesquisa com fontes oficiais (opcional)</summary><label htmlFor="review-sources">Até 5 URLs HTTPS, uma por linha. Serão pistas para pesquisa, não confirmações automáticas.</label><Textarea id="review-sources" disabled={!!busy} value={sourceHints} onChange={e=>setSourceHints(e.target.value)} placeholder="https://site-oficial.com/ajuda" maxLength={10000}/></details>
      <Button size="sm" disabled={!!busy} onClick={()=>setPanel(null)}>Usar estes modelos</Button>
     </>}
     {panel==='history'&&<>
      <div className={styles.historyTabs} role="tablist" aria-label="Tipo de histórico"><button role="tab" aria-selected={historyTab==='runs'} onClick={()=>setHistoryTab('runs')}>Análises ({runs.length})</button><button role="tab" aria-selected={historyTab==='changes'} onClick={()=>setHistoryTab('changes')}>Alterações ({history.length})</button></div>
      <div role="tabpanel">
       {historyTab==='runs'?<div className={styles.savedRuns}>{!runs.length&&<p>Nenhuma análise salva.</p>}{runs.map(r=><button key={r.id} disabled={!!busy||dirty} aria-pressed={run?.id===r.id} onClick={()=>{selectRun(r);setPanel(null);setDocumentMode('evidence');}}><span><strong>{date(r.created_at)}</strong><small>{r.text_model||r.provider||'OpenAI'} · {r.search_model||'modelo anterior'}</small></span><span>{r.status==='failed'?'Falhou':r.status==='extracting'?'Em andamento':r.status==='applied'?'Alterações aplicadas':r.claims.filter(c=>c.checked_at).length+' analisadas'}{run?.id===r.id&&<Check size={16}/>}</span></button>)}</div>:<>{<div className={styles.history}><h3>Correções aplicadas</h3>{!history.length&&<p>Nenhuma correção aplicada nesta central.</p>}{history.map(event=><details key={event.id}><summary>{date(event.created_at)} · {event.reverted_at?'Desfeita':'Aplicada'}{event.changes&&!Array.isArray(event.changes)&&event.changes.type==='manual_edit'?' · edição manual':''}</summary>{Object.keys(event.after_fields).filter(k=>k!=='flow_data'&&event.before_fields[k]!==event.after_fields[k]).map(k=><div key={k}><strong>{names[k]||k}</strong><p className={styles.before}>{event.before_fields[k]}</p><p className={styles.after}>{event.after_fields[k]}</p></div>)}{!event.reverted_at&&<Button variant="outline" size="sm" disabled={!!busy||dirty} onClick={()=>setConfirm(event)}><RotateCcw size={14}/> Desfazer esta correção</Button>}</details>)}</div>}</>}
      </div>
     </>}
    </section>}
   </div>
   {dirty&&<div className={styles.editBar}><span>Alterações não salvas. Salve antes de analisar ou abrir outro conteúdo.</span><Button variant="outline" disabled={!!busy} onClick={()=>setDraft(fields)}>Descartar alterações</Button><Button disabled={!!busy} onClick={()=>setConfirm('manual')}>Salvar edição</Button></div>}
   <div className={styles.columns}><article className={styles.document}>
    <div className={styles.sectionTitle}><h3>Texto do conteúdo</h3><div className={styles.documentModes}><Button size="sm" variant={documentMode==='editor'?'secondary':'ghost'} onClick={()=>setDocumentMode('editor')}>Editor</Button><Button size="sm" disabled={dirty} variant={documentMode==='evidence'?'secondary':'ghost'} onClick={()=>setDocumentMode('evidence')}>Trechos analisados</Button></div></div>
    {documentMode==='editor'?<div inert={!!busy||undefined} className={styles.editorFields}>{Object.entries(draft).filter(([field,text])=>text||['title','name','content_markdown','description_full'].includes(field)).map(([field,text])=><section key={`${target.id}-${field}`}><label htmlFor={`edit-${field}`}>{names[field]||field}</label>{['content_markdown','description_full'].includes(field)?<MarkdownEditor visual showWordCount value={text||''} onChange={value=>{setDraft(prev=>({...prev,[field]:value}));setAccepted([]);}}/>:<Input id={`edit-${field}`} value={text||''} onChange={e=>{setDraft(prev=>({...prev,[field]:e.target.value}));setAccepted([]);}}/>}</section>)}</div>:Object.entries(activeFields).filter(([,text])=>text).map(([field,text])=><section key={field}><h4>{names[field]||field}</h4><ReviewMarkdown text={text!} claims={run?.status==='ready'?run.claims.filter(c=>c.field===field):[]} selected={selected} onSelect={id=>{setSelected(id);requestAnimationFrame(()=>{const item=document.getElementById('diagnosis-'+id);const list=item?.closest('aside');if(item&&matchMedia('(max-width: 800px)').matches)item.scrollIntoView({block:'start'});else if(item&&list)list.scrollTop+=item.getBoundingClientRect().top-list.getBoundingClientRect().top-50;});}}/></section>)}
   </article>
    <aside className={styles.inspector}><h3>Diagnóstico e fontes <span className={styles.countBadge}>{run?.claims.length||0}</span></h3>
     {dirty?<p>Salve a edição antes de consultar ou aplicar diagnósticos.</p>:!run?.claims.length?<div className={styles.inspectorEmpty}><Search size={25}/><p>{run?'Nenhuma afirmação foi identificada nesta análise.':'Inicie a análise para identificar afirmações e pesquisar fontes.'}</p></div>:<div className={styles.diagnosisList}>{run.claims.map((claim,index)=><section key={claim.id} id={'diagnosis-'+claim.id} className={styles.diagnosisItem}>
      <button type="button" className={styles.diagnosisTrigger} aria-expanded={selected===claim.id} aria-controls={'diagnosis-body-'+claim.id} onClick={()=>setSelected(selected===claim.id?'':claim.id)}><span className={styles.diagnosisIndex}>{index+1}</span><span><strong>{claim.statement}</strong><small className={styles[claim.status]}>{verdictLabels[claim.status]}</small></span><ChevronDown size={16} className={selected===claim.id?styles.rotated:''}/></button>
      {selected===claim.id&&<div id={'diagnosis-body-'+claim.id} className={styles.diagnosisBody}><><span className={`${styles.verdict} ${styles[claim.status]}`}>{verdictLabels[claim.status]}</span><h4>{claim.statement}</h4><blockquote>{claim.original}</blockquote><p>{claim.reason}</p>{!!claim.checks?.length&&<div><h4>Pontos da afirmação</h4>{claim.checks.map((check,index)=><div key={index} className={styles.source}><strong>{check.aspect}</strong><p>{verdictLabels[check.status]}</p><p>{check.reason}</p>{check.urls.map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname} ↗ </a>)}</div>)}</div>}{claim.checked_at&&<small>Consultado em {date(claim.checked_at)}. As informações podem mudar.</small>}<h4>Fontes da verificação</h4>{!claim.sources.length?<p className={styles.muted}>Nenhuma evidência associada a este trecho.</p>:claim.sources.map((source,i)=><div key={`${source.url}-${i}`} className={styles.source}><a href={source.url} target="_blank" rel="noopener noreferrer">[{i+1}] {source.title} <ArrowUpRight size={13}/></a><small>{new URL(source.url).hostname} · {date(source.checked_at)}</small><p>{source.summary}</p><small>Síntese da evidência; não é uma transcrição literal.</small></div>)}
      {['contradicted','uncertain'].includes(claim.status)&&claim.sources.length>0&&run?.status==='ready'&&<div className={styles.correction}><label htmlFor="replacement">Texto proposto para substituir o trecho</label><Textarea id="replacement" value={edits[claim.id]??claim.replacement} maxLength={3000} rows={6} disabled={!!busy} onChange={e=>{setEdits(prev=>({...prev,[claim.id]:e.target.value}));setAccepted(prev=>prev.filter(id=>id!==claim.id));}}/><small>Confira se o texto proposto é sustentado pelas fontes acima.</small><Button variant={accepted.includes(claim.id)?'secondary':'outline'} disabled={!!busy||!(edits[claim.id]??claim.replacement).trim()} onClick={()=>setAccepted(prev=>prev.includes(claim.id)?prev.filter(id=>id!==claim.id):[...prev,claim.id])}><Check size={15}/>{accepted.includes(claim.id)?'Selecionada · remover':'Selecionar correção'}</Button></div>}
     </></div>}
     </section>)}</div>}
    </aside></div>
   {accepted.length>0&&!dirty&&run?.status==='ready'&&<div className={styles.applyBar}><span>{accepted.length} correção(ões) selecionada(s). Revise a comparação antes de salvar.</span><Button disabled={!!busy} onClick={()=>setConfirm('apply')}>Revisar e aplicar ({accepted.length})</Button></div>}
  </section>}
  <AlertDialog open={!!confirm} onOpenChange={open=>{if(!open)setConfirm(null);}}><AlertDialogContent className={styles.confirmDialog}><AlertDialogHeader><AlertDialogTitle>{confirm==='manual'?'Salvar a edição manual?':confirm==='apply'?'Aplicar as correções selecionadas?':'Desfazer esta correção?'}</AlertDialogTitle><AlertDialogDescription>{target?.published?'A alteração ficará visível na página publicada.':'A alteração será salva no rascunho.'} A operação será bloqueada se o conteúdo tiver mudado desde a revisão.</AlertDialogDescription></AlertDialogHeader>{confirm==='manual'&&Object.entries(changedFields).map(([field,value])=><div key={field}><strong>{names[field]||field}</strong><p className={styles.before}>{fields[field]}</p><p className={styles.after}>{value}</p><small>Edição manual; não representa uma verificação da IA.</small></div>)}{confirm==='apply'&&accepted.map(id=>{const c=run?.claims.find(c=>c.id===id);return c?<div key={id}><strong>{names[c.field]}</strong><p className={styles.before}>{c.original}</p><p className={styles.after}>{edits[id]??c.replacement}</p><p>{c.sources.map((s,i)=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">[{i+1}] {s.title} </a>)}</p></div>:null;})}<AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={save}>{confirm==='manual'?'Confirmar e salvar':confirm==='apply'?'Confirmar e aplicar':'Confirmar desfazer'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </main>;
}
