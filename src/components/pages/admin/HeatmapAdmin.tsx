"use client";
import { useState } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, Eye, EyeOff, Info, MousePointer2, Users } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import HeatmapPreview from './HeatmapPreview';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type Report = {
  routes: {path:string; clicks:number; visits:number}[];
  points: {x:number;y:number;count:number}[];
  clicks:number;visits:number;width:number|null;height:number|null;
};

const devices = [
  {value:'desktop',label:'Desktop',icon:Monitor},
  {value:'tablet',label:'Tablet',icon:Tablet},
  {value:'mobile',label:'Celular',icon:Smartphone},
];

const mainPages = [
  {path:'/',label:'Página inicial'},
  {path:'/ferramentas',label:'Ferramentas'},
  {path:'/guias',label:'Guias'},
  {path:'/concursos',label:'Concursos'},
  {path:'/exclusivos',label:'Exclusivos'},
  {path:'/premium/cursos',label:'Cursos'},
];

export default function HeatmapAdmin() {
  const [path,setPath] = useState('/');
  const [device,setDevice] = useState('desktop');
  const [days,setDays] = useState('7');
  const [show,setShow] = useState(true);
  const query = useQuery({
    queryKey:['admin-page-heatmap',path,device,days],
    queryFn:async()=>{
      const {data,error}=await supabase.rpc('admin_page_heatmap',{p_path:path,p_device:device,p_days:Number(days)});
      if(error) throw error;
      return data as unknown as Report;
    },
  });
  const report=query.data;
  const pages = [...mainPages];
  for (const route of report?.routes ?? []) {
    if (!pages.some(page=>page.path===route.path)) pages.push({path:route.path,label:route.path});
  }
  if (!pages.some(page=>page.path===path)) pages.push({path,label:path});
  const selectedPage = pages.find(page=>page.path===path);
  const width=Math.min(2400,Math.max(320,report?.width ?? (device==='mobile'?390:device==='tablet'?820:1440)));
  const safePath = /^\/(?!\/)[^?#]*$/.test(path) && !/^\/(admin|moderador|login|auth|conta|perfil|checkout|resgate)(\/|$)/.test(path);
  return <div className="min-w-0 max-w-full space-y-5">
    <div><h1 className="text-2xl font-semibold">Mapa de calor</h1><p className="mt-1 text-sm text-muted-foreground">Onde os visitantes clicam nas páginas do PqEstudar.</p></div>
    <div className="overflow-hidden rounded-[var(--admin-radius)] border border-border bg-card shadow-sm">
      <div className="grid items-end gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_max-content_max-content_max-content]">
        <div className="min-w-0 space-y-1.5"><label htmlFor="heatmap-page" className="block text-xs font-medium text-muted-foreground">Página</label>
        <Select value={path} onValueChange={setPath}><SelectTrigger id="heatmap-page" className="h-11 w-full" aria-label="Página"><SelectValue>{selectedPage?.label ?? path}</SelectValue></SelectTrigger><SelectContent>
          {pages.map(page=><SelectItem key={page.path} value={page.path}>{page.label}{page.label!==page.path && <span className="ml-2 text-xs text-muted-foreground">{page.path}</span>}</SelectItem>)}
        </SelectContent></Select></div>

        <div className="space-y-1.5"><label htmlFor="heatmap-period" className="block text-xs font-medium text-muted-foreground">Período</label><div className="flex items-center gap-1">
        <Select value={days} onValueChange={setDays}><SelectTrigger id="heatmap-period" className="h-11 w-40" aria-label="Período"><SelectValue /></SelectTrigger><SelectContent>{[1,7,30,90].map(n=><SelectItem key={n} value={String(n)}>{n===1?'Últimas 24h':`Últimos ${n} dias`}</SelectItem>)}</SelectContent></Select>




        </div></div>
        <div className="space-y-1.5 sm:justify-self-end lg:justify-self-auto"><span className="block text-xs font-medium text-muted-foreground">Dispositivo</span>        <div role="group" aria-label="Dispositivo" className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
          {devices.map(({value,label,icon:Icon})=><Tooltip key={value}><TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={label} aria-pressed={device===value} onClick={()=>setDevice(value)} className={`h-9 w-9 rounded-full transition-colors ${device===value?'bg-primary/15 text-primary shadow-sm hover:bg-primary/20':'text-muted-foreground hover:text-foreground'}`}><Icon className="h-4 w-4" /></Button>
          </TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>)}
        </div>
        </div>
        <div className="flex h-11 items-center border-l border-border pl-3 sm:justify-self-end"><Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-muted-foreground" aria-label="Atualizar mapa de calor" onClick={()=>void query.refetch()} disabled={query.isFetching}><RefreshCw className={`h-4 w-4 ${query.isFetching?'animate-spin motion-reduce:animate-none':''}`} /></Button></span></TooltipTrigger><TooltipContent>Atualizar</TooltipContent></Tooltip></div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-2">
        {query.isError?<p role="alert" className="text-sm text-destructive">Não foi possível carregar. Tente atualizar.</p>:<div role="status" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">{query.isPending?'Carregando…':<><span className="inline-flex items-center gap-2"><MousePointer2 className="h-4 w-4" /><strong className="font-semibold text-foreground">{(report?.clicks??0).toLocaleString('pt-BR')}</strong> cliques</span><span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /><strong className="font-semibold text-foreground">{(report?.visits??0).toLocaleString('pt-BR')}</strong> visitas com cliques</span></>}</div>}
        <Popover><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground" aria-label="Como funciona o mapa de calor"><Info className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent align="end" className="max-w-[calc(100vw-2rem)] space-y-2 text-sm"><p className="font-medium">Sobre os dados</p><p className="text-muted-foreground">A coleta depende do consentimento de analytics. Formulários e navegação da equipe não entram na amostra; não há histórico retroativo.</p><p className="text-muted-foreground">O mapa usa o layout atual. Mudanças de conteúdo, banners e elementos fixos podem deslocar os cliques antigos.</p></PopoverContent></Popover>
      </div>
    </div>
    {!query.isPending && !query.isError && !report?.clicks && <div className="rounded-[var(--admin-radius)] border border-dashed p-6 text-sm text-muted-foreground">Ainda não há cliques para esta página, dispositivo e período.</div>}
    {safePath && <div className="rounded-[var(--admin-radius)] border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs text-muted-foreground"><div className="flex items-center gap-2"><span className="font-medium text-foreground">Prévia</span><span>{devices.find(item=>item.value===device)?.label} · {width}px</span></div><div className="flex flex-wrap items-center gap-2" aria-label="Escala de calor: azul indica menos cliques, vermelho indica mais cliques"><span>Menos</span><span className="h-2 w-24 rounded-full bg-gradient-to-r from-sky-500 via-yellow-400 to-red-500" aria-hidden="true" /><span>Mais cliques</span><Tooltip><TooltipTrigger asChild><span className="inline-flex"><Button type="button" size="icon" variant="outline" className={`h-10 w-10 rounded-full transition-colors ${show?'border-primary/30 bg-primary/15 text-primary hover:bg-primary/20':'bg-muted/50 text-muted-foreground'}`} aria-label={show?'Ocultar calor':'Mostrar calor'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?<Eye className="h-4 w-4" />:<EyeOff className="h-4 w-4" />}</Button></span></TooltipTrigger><TooltipContent>{show?'Ocultar calor':'Mostrar calor'}</TooltipContent></Tooltip></div></div>
      <HeatmapPreview key={`${path}-${device}-${width}`} path={path} width={width} points={report?.points ?? []} show={show} />
    </div>}
  </div>;
}
