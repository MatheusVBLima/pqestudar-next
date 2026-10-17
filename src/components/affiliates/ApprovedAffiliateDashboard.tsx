'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Check, Clock3, Copy, FileText, Folder, Grid2X2, ImageIcon, Info, Link, LockKeyhole, MapPin, MousePointer2, Receipt, Share2, ShieldCheck, TrendingUp, Users, Video, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { partnersRequest } from '@/lib/affiliates/client';
import type { AffiliateDashboard, AffiliateLevel } from '@/lib/affiliates/types';
import { SITE_URL } from '@/lib/site';
import s from './approved-affiliate.module.css';
import { AffiliateWallet } from './AffiliateWallet';
import { AffiliateCodeEditor } from './AffiliateCodeEditor';
import { AffiliateOverviewSkeleton } from './AffiliateDashboardSkeleton';

type Sale = { id: string; status: string; rate_bps: number | null; net_cents: number | null; commission_cents: number | null; created_at: string };
type Activity = { total: number; valid_sales: number; pending_sales: number; clicks: number; unreconciled_sales: number; commissions_cents: number; performance?: { day: string; sales: number }[]; items: Sale[] };
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const colors = ['#6fd8a8', '#f5b84b', '#e052e0', '#7aa7ff'];
const tabs = [['overview', 'Visão geral', Grid2X2], ['link', 'Meu link', Link], ['sales', 'Minhas vendas', Receipt], ['growth', 'Minha evolução', TrendingUp], ['wallet', 'Minha carteira', Wallet], ['materials', 'Materiais', Folder]] as const;
const demoBars = [0,0,1,0,0,0,2,0,0,1,0,0,0,0,1,0,2,0,0,0,1,0,0,2,0,0,1,0,0,1];
const example: Activity = { total: 6, valid_sales: 12, pending_sales: 3, clicks: 486, unreconciled_sales: 0, commissions_cents: 31240,
  performance: demoBars.map((sales, i) => ({ day: `Dia ${i + 1}`, sales })),
  items: ['awaiting_payment','in_security','in_security','canceled','awaiting_payment','in_security'].map((status, i) => ({ id: `exemplo-${i}`, status, rate_bps: 3000, net_cents: 5990, commission_cents: status === 'in_security' ? 1797 : null, created_at: `2026-10-${15-i}T12:00:00Z` })) };
const labels: Record<string, string> = { awaiting_payment: 'Aguardando pagamento', pending_calculation: 'Pendente de apuração', in_security: 'Em segurança', released: 'Liberada para a carteira', canceled: 'Cancelada' };
const vars = (values: Record<string, string | number>) => values as CSSProperties;
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`${s.card} ${className}`} onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX-r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY-r.top}px`); }}>{children}</section>;
}
function Tip({ children }: { children: string }) { return <span className={s.tip} tabIndex={0} aria-label={children}><Info /><span role="tooltip">{children}</span></span>; }
function Count({ value, currency = false }: { value: number; currency?: boolean }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    const start = performance.now(); let frame = 0;
    const tick = (now: number) => { const p = Math.min(1, (now-start)/800); setShown(value*(1-Math.pow(1-p,3))); if (p<1) frame=requestAnimationFrame(tick); };
    frame=requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [value]);
  return <strong>{currency ? money(shown) : Math.round(shown).toLocaleString('pt-BR')}</strong>;
}
function Evolution({ levels, sales }: { levels: AffiliateLevel[]; sales: number }) {
  const [sim, setSim] = useState<number | null>(null);
  const path = useRef<SVGPathElement>(null);
  const [geometry, setGeometry] = useState<{length:number;points:{x:number;y:number}[];x:number;y:number} | null>(null);
  const n = sim ?? sales;
  const index = Math.max(0, levels.findLastIndex(l => n >= l.minimum_sales));
  const level = levels[index], next = levels[index+1];
  const fraction = levels.length < 2 ? 1 : (index + (next ? Math.min(1, Math.max(0,(n-level.minimum_sales)/(next.minimum_sales-level.minimum_sales))) : 0))/(levels.length-1);
  useEffect(() => { const p=path.current; if (!p) return; const length=p.getTotalLength(), q=p.getPointAtLength(length*fraction); setGeometry({ length, x:q.x, y:q.y, points:levels.map((_,i) => { const point=p.getPointAtLength(length*i/Math.max(1,levels.length-1)); return {x:point.x,y:point.y}; }) }); }, [fraction, levels]);
  if (!level) return null;
  return <Card className={s.pad}><h3>Sua rota de evolução</h3><p className={s.sub}>As metas consideram vendas válidas acumuladas. Arraste para simular.</p>
    <svg className={s.route} viewBox="0 0 800 190" aria-hidden="true"><path ref={path} className={s.base} d="M50 140 C170 20 270 190 410 100 S650 20 750 80" /><path className={s.done} d="M50 140 C170 20 270 190 410 100 S650 20 750 80" style={{strokeDasharray:geometry?.length ?? 1000,strokeDashoffset:(geometry?.length ?? 1000)*(1-fraction)}} />{geometry?.points.map((q,i)=><g key={levels[i].id}><circle cx={q.x} cy={q.y} r="16" fill="#2a2031" stroke="#e052e0" strokeWidth="3"/><text x={q.x} y={q.y+5} textAnchor="middle" fill="white" fontSize="14" fontWeight="800">{levels[i].commission_bps/100}</text><text x={q.x} y={q.y+(i%2?-28:40)} textAnchor="middle" fill="#d9cfde" fontSize="15">{levels[i].name}</text></g>)}{geometry && <circle cx={geometry.x} cy={geometry.y} r="11" fill="white" />}</svg>
    <input className={s.range} type="range" min={0} max={Math.max(70, sales, (levels.at(-1)?.minimum_sales ?? 60)+10)} value={n} onChange={e=>setSim(Number(e.target.value))} aria-label="Vendas válidas acumuladas (simulação)" />
    <p className={s.sub} aria-live="polite">Simulação: com <b>{n}</b> vendas válidas, nível <b>{level.name}</b> ({level.commission_bps/100}%). {next ? `Faltam ${next.minimum_sales-n} para ${next.name}.` : 'Nível máximo.'} Seu cadastro não é alterado.</p>
    <div className={s.levels}>{levels.map((l,i)=><div key={l.id} className={`${s.level} ${i===index?s.selected:''}`}><small>{l.name}</small><b>{l.commission_bps/100}%</b><small>A partir de {l.minimum_sales} vendas válidas</small></div>)}</div>
    <p className={`${s.sub} ${s.note}`}><Tip>O novo percentual vale para confirmações futuras.</Tip>Seu nível conquistado é preservado após reembolsos. Vendas canceladas não contam para as metas.</p>
  </Card>;
}

export function ApprovedAffiliateDashboard({ userId, dashboard }: { userId: string; dashboard: AffiliateDashboard }) {
  const [demoRequested, setDemo] = useState(false), [page, setPage] = useState(0), [filter, setFilter] = useState('Todas');
  const demo = dashboard.can_demo === true && demoRequested;
  const query = useQuery({ queryKey: ['affiliate-sales', userId, page], queryFn: () => partnersRequest<Activity>(`/api/affiliates/sales?page=${page}`), retry: false, staleTime: 0, refetchOnWindowFocus: true });
  const data = demo ? example : query.isError ? undefined : query.data;
  const levels = [...dashboard.levels].sort((a,b)=>a.minimum_sales-b.minimum_sales);
  const actual = levels.findIndex(l=>l.id===dashboard.profile?.level_id);
  const index = demo ? Math.max(0,levels.findLastIndex(l=>example.valid_sales>=l.minimum_sales)) : Math.max(0,actual);
  const level = levels[index], next = levels[index+1];
  const tracking = demo || dashboard.tracking_enabled;
  const sales = data?.valid_sales;
  const progress = sales === undefined ? 0 : next ? Math.max(0,Math.min(1,(sales-(level?.minimum_sales ?? 0))/(next.minimum_sales-(level?.minimum_sales ?? 0)))) : 1;
  const code = demo ? 'AFILIADO-EXEMPLO' : dashboard.profile?.code ?? '';
  const referral = demo ? 'https://mbo.exemplo/r/afiliado-demo' : `${SITE_URL.replace(/\/$/,'')}/mbo-premium?ref=${encodeURIComponent(code)}`;
  async function copy(text:string) { try { await navigator.clipboard.writeText(text); toast.success('Copiado!'); } catch { toast.error('Selecione e copie manualmente.'); } }
  async function share() {
    try { if (navigator.share) await navigator.share({ title: 'Conheça o MBO', url: referral }); else await copy(referral); }
    catch (error) { if (!(error instanceof Error) || error.name !== 'AbortError') toast.error('Não foi possível compartilhar.'); }
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const performance = demo ? example.performance : Array.from({length:30}, (_, i) => { const day = new Date(Date.parse(today+'T12:00:00Z')-(29-i)*86400000).toISOString().slice(0,10); return { day, sales: data?.performance?.find(p=>p.day===day)?.sales ?? 0 }; });
  const feedback = !demo && query.isError ? <div className={s.warn} role="alert">{query.error.message}<button className={s.copy} onClick={()=>query.refetch()}>Tentar novamente</button></div> : !data ? <p role="status" className={s.note}>Carregando suas indicações…</p> : null;
  const milestones = [ ['Cadastro aprovado','Concluído',true,Check], ['Rastreamento',tracking?'Ativo':'Aguardando ativação',tracking,Clock3], ['1ª indicação',data ? data.clicks>0?'Registrada':'A caminho':'Carregando…',!!data?.clicks,MapPin], ['1ª venda válida',sales===undefined?'Carregando…':sales>0?'Confirmada':'A caminho',!!sales,Award] ] as const;
  return <main className={s.page}><div className={`${s.blob} ${s.blobOne}`} aria-hidden="true"/><div className={`${s.blob} ${s.blobTwo}`} aria-hidden="true"/><div className={s.wrap}>
    <header className={s.top}><div><p className={s.eyebrow}><Users/>MBO Partners</p><h1>Meu painel de afiliado</h1></div><div className={s.badges}><span className={s.pill}><i/>Aprovado</span><span className={s.pill}><i style={vars({'--c':tracking?colors[0]:colors[1]})}/>Rastreamento {tracking?'ativo':'aguardando'}</span>{dashboard.can_demo === true && <button className={s.switch} role="switch" aria-checked={demo} onClick={()=>{setDemo(!demo);setPage(0);setFilter('Todas');}}><b/>Ver com dados de exemplo</button>}</div></header>
    {demo && <div className={s.demo} role="status"><b>Modo demonstração.</b> Números fictícios, só para visualizar o painel preenchido. Nada aqui é real.</div>}
    <Card className={s.hero}><div className={s.lv}><div className={s.ring}><svg viewBox="0 0 100 100" aria-hidden="true"><circle className={s.track} cx="50" cy="50" r="46"/><circle className={s.fill} cx="50" cy="50" r="46" style={{strokeDashoffset:289*(1-progress)}}/></svg><div><span>{sales===undefined?'—':next?sales:'Máx.'}{next && <small>de {next.minimum_sales}</small>}</span></div></div><div><small className={s.sub}>Seu nível</small><h2>{level?.name ?? 'Em atualização'}</h2><span className={s.commission}><Award/>{(level?.commission_bps ?? 0)/100}% de comissão</span><p className={s.next}>{sales===undefined?'Carregando evolução…':next?<>Faltam <b>{Math.max(0,next.minimum_sales-sales)} vendas</b> para {next.name} ({next.commission_bps/100}%)</>:'Você está no nível máximo.'}</p></div></div>
      <div className={s.steps}>{milestones.map(([title,label,done,Icon],i)=><div key={title} className={`${s.step} ${done?s.ok:i===1?s.current:''}`}><div className={s.dot}>{done?<Check/>:<Icon/>}</div><b>{title}</b><span>{label}</span></div>)}</div><div className={s.message}>{tracking?<Check/>:<Clock3/>}{tracking?'Rastreamento habilitado. Indicações são registradas após o consentimento do visitante.':'Cadastro aprovado. Aguarde a ativação das indicações.'}</div>
    </Card>
    {feedback}
    <Tabs defaultValue="overview"><TabsList className={s.tabs} aria-label="Seções do painel">{tabs.map(([value,label,Icon])=><TabsTrigger className={s.tab} value={value} key={value}><Icon/>{label}</TabsTrigger>)}</TabsList>
      <TabsContent className={s.panel} value="overview">{!demo && query.isPending && <AffiliateOverviewSkeleton />}{data && <><h2 className="sr-only">Suas indicações</h2><div className={s.kpis}>{[['Vendas válidas',Check,data.valid_sales],['Aguardando pagamento',Clock3,data.pending_sales],['Comissões em segurança',ShieldCheck,data.commissions_cents],['Cliques registrados',MousePointer2,data.clicks]].map(([label,Icon,value],i)=>{ const KIcon=Icon as typeof Check; return <Card key={String(label)} className={s.kpi}><div className={s.ico} style={vars({'--c':colors[i]})}><KIcon/></div><small>{String(label)}{i===3 && <Tip>Cliques refletem indicações consentidas registradas, não visitantes únicos.</Tip>}</small><Count value={Number(value)} currency={i===2}/></Card>; })}</div>
        <div className={s.gridTwo}><Card className={s.pad}><h3>Indicações e vendas</h3><p className={s.sub}>Totais acumulados{demo?' (exemplo)':''}. Cliques são indicações consentidas, não visitantes únicos. Vendas válidas são pagamentos confirmados, mesmo com comissão em apuração.</p><div className={s.funnel}>{[['Cliques',data.clicks,colors[3]],['Aguardando',data.pending_sales,colors[1]],['Válidas',data.valid_sales,colors[0]]].map(([label,n,c])=><div className={s.funnelRow} key={label}><span>{label}</span><div><i style={vars({'--c':c,'--w':`${Math.min(100,Number(n)/Math.max(1,data.clicks,data.valid_sales,data.pending_sales)*100)}%`})}/></div><b>{n}</b></div>)}</div><p className={s.empty}><Info/><span>{data.unreconciled_sales} venda(s) com líquido em apuração. Esses valores ainda não integram as comissões calculadas. Consulte os saldos e saques na carteira.</span></p></Card>
        <Card className={s.pad}><h3>Vendas válidas nos últimos 30 dias</h3><div className={s.bars} role="img" aria-label={`${data.performance?.reduce((sum,p)=>sum+p.sales,0) ?? 0} vendas válidas nos últimos 30 dias${demo?' (exemplo)':''}`}>{performance.map((p,i)=><i key={p.day} title={`${p.day}: ${p.sales} vendas`} style={vars({'--h':`${Math.max(3,p.sales/Math.max(1,...(data.performance??[]).map(x=>x.sales))*110)}px`,animationDelay:`${i*25}ms`,opacity:p.sales?0.9:0.2})}/>)}</div><p className={s.sub}>{data.performance?.some(p=>p.sales>0)?`${data.performance.reduce((sum,p)=>sum+p.sales,0)} vendas válidas no período${demo?' (exemplo)':''}.`:'Nenhuma venda válida neste período.'}</p></Card></div></>}</TabsContent>
      <TabsContent className={s.panel} value="link"><Card className={s.pad}><h3>Seu código de afiliado</h3><p className={s.sub}>O código identifica seu cadastro.{!tracking && ' O link de indicação ainda não está ativo.'}</p><div className={s.code}><code>{code || 'Código indisponível'}</code><button className={s.copy} disabled={!code} aria-label="Copiar código de afiliado" onClick={()=>copy(code)}><Copy/>Copiar</button></div>{!demo && <AffiliateCodeEditor userId={userId} code={code} version={dashboard.profile.version}/>}<h3 className={s.smallHeading}>Link de indicação {!tracking && <LockKeyhole/>}</h3><div className={s.code}><code>{tracking?referral:'Disponível após a ativação do rastreamento'}</code><button className={s.copy} disabled={!tracking || !code} aria-label="Copiar link de indicação" onClick={()=>copy(referral)}>{tracking?<Copy/>:<LockKeyhole/>}{tracking?'Copiar link':'Bloqueado'}</button></div>{!tracking && <p className={s.warn}><LockKeyhole/>Aguarde a ativação do rastreamento antes de divulgar links como afiliado.</p>}<p className={s.sub}>{demo?'Link fictício para demonstração.':'O registro da indicação depende do consentimento do visitante.'}</p>{tracking && code && <button className={`${s.chip} ${s.note}`} onClick={share}><Share2 className="inline-block mr-2"/>Compartilhar</button>}<div className={s.how}><div><Check/><b>1. Cadastro</b>Aprovado</div><div><Link/><b>2. Link ativo</b>{tracking?'Liberado':'Em breve'}</div><div><Users/><b>3. Divulgue</b>Com responsabilidade</div></div></Card></TabsContent>
      <TabsContent className={s.panel} value="sales"><Card className={s.pad}><h3>Minhas vendas</h3><div className={s.chips}>{['Todas','Aguardando pagamento','Válida','Pendente de apuração','Em segurança','Cancelada'].map(f=><button key={f} className={s.chip} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}</div>{!demo && (data?.total??0)>20 && <p className={s.sub}>Os filtros se aplicam à página atual.</p>}{data && <>{data.items.filter(r=>filter==='Todas'||(filter==='Válida' ? ['pending_calculation','in_security','released'].includes(r.status) : labels[r.status]===filter)).length?data.items.filter(r=>filter==='Todas'||(filter==='Válida' ? ['pending_calculation','in_security','released'].includes(r.status) : labels[r.status]===filter)).map(r=><div className={s.sale} key={r.id}><span>{demo?`Exemplo ${Number(r.id.split('-')[1])+1}`:new Date(r.created_at).toLocaleDateString('pt-BR')}</span><div>Venda atribuída ao seu cadastro<small>Líquido: {r.net_cents===null?'Em apuração':money(r.net_cents)} · {r.rate_bps===null?'Taxa a definir':`${r.rate_bps/100}%`}</small></div><span className={s.tag} style={vars({'--c':r.status==='canceled'?'#ff7a8a':r.status==='in_security'?colors[0]:colors[1]})}>{labels[r.status]??r.status}</span><b className={r.status==='canceled'?s.canceled:''}>{r.commission_cents===null?'Em apuração':money(r.commission_cents)}</b></div>):<p className={`${s.empty} ${s.salesEmpty}`}><Receipt/>{filter==='Todas'?'Nenhuma venda atribuída ao seu cadastro ainda.':'Nenhuma venda neste filtro.'}</p>}<div className={s.pagination}><button disabled={demo||page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {demo?1:page+1}</span><button disabled={demo||(page+1)*20>=data.total} onClick={()=>setPage(p=>p+1)}>Próxima</button></div></>}<p className={`${s.sub} ${s.note}`}><Tip>Valores de vendas canceladas são históricos e não compõem comissões elegíveis.</Tip>Vendas canceladas não geram comissão.</p></Card></TabsContent>
      <TabsContent className={s.panel} value="growth">{data && <Evolution key={String(demo)} levels={levels} sales={data.valid_sales}/>}</TabsContent>
      <TabsContent className={s.panel} value="wallet"><AffiliateWallet userId={userId} demo={demo}/></TabsContent>
      <TabsContent className={s.panel} value="materials"><div className={s.materials}>{[[Video,'Vídeos'],[ImageIcon,'Posts para redes'],[FileText,'Roteiros'],[ShieldCheck,'Guia de boas práticas']].map(([Icon,title])=>{const MIcon=Icon as typeof Check;return <Card key={String(title)} className={s.material}><span className={s.soon}>Em breve</span><MIcon/><h3>{String(title)}</h3><p className={s.sub}>Disponível aqui quando for publicado.</p></Card>;})}</div><Card className={`${s.pad} ${s.note}`}><h3>Boas práticas desde já</h3><div className={s.checklist}>{['Diga que o MBO organiza informações e não garante aprovação de benefícios.','Lembre que a compra do MBO não é necessária para solicitar benefícios públicos.','Divulgue só depois da ativação do rastreamento.'].map(t=><div key={t}><Check/>{t}</div>)}</div></Card></TabsContent>
    </Tabs>
  </div></main>;
}
