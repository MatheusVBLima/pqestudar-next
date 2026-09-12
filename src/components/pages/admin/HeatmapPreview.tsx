"use client";
import { useEffect, useRef, useState } from 'react';

export type HeatPoint = {x:number;y:number;count:number};

export default function HeatmapPreview({path,width,points,show}:{path:string;width:number;points:HeatPoint[];show:boolean}) {
  const viewportHeight = 700;
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const dispose = useRef<() => void>(()=>{});
  const [available,setAvailable] = useState(width);
  const [height,setHeight] = useState(viewportHeight);
  const [error,setError] = useState(false);
  const scale = Math.min(1,available/width);
  const maximum = Math.max(1,...points.map(point=>point.count));

  useEffect(()=>{
    const element=host.current;
    if(!element)return;
    const resize=()=>setAvailable(element.clientWidth);
    resize();
    const observer=new ResizeObserver(resize);
    observer.observe(element);
    return ()=>{observer.disconnect();dispose.current();};
  },[]);

  useEffect(()=>{
    const element=host.current;
    if(!element)return;
    const syncScroll=()=>{
      const y=element.scrollTop/scale;
      frame.current?.contentWindow?.scrollTo(0,y);
    };
    element.addEventListener('scroll',syncScroll,{passive:true});
    syncScroll();
    return ()=>element.removeEventListener('scroll',syncScroll);
  },[scale]);

  function loaded() {
    dispose.current();
    try {
      const doc=frame.current?.contentDocument;
      if(!doc?.body)throw new Error('Missing document');
      if(doc.location.pathname!==path)throw new Error('Preview redirected');
      setError(false);
      const style=doc.createElement('style');
      style.textContent='html { scrollbar-width: none !important; scroll-behavior: auto !important; } ::-webkit-scrollbar { display: none !important; }';
      doc.head.appendChild(style);
      const measure=()=>setHeight(Math.max(viewportHeight,doc.documentElement.scrollHeight,doc.body.scrollHeight));
      const observer=new ResizeObserver(measure);
      observer.observe(doc.body);
      measure();
      doc.defaultView?.dispatchEvent(new Event('scroll'));
      dispose.current=()=>{observer.disconnect();style.remove();};
    } catch {setError(true);}
  }
  return <div>
    {error&&<p role="alert" className="p-4 text-sm text-destructive">A prévia não está disponível. A página pode exigir outro acesso ou ter sido redirecionada.</p>}
    <div className="bg-muted/20" style={{padding:width<1024?16:0,position:'relative'}}>
    <div ref={host} className="min-w-0 overflow-x-hidden overflow-y-auto bg-background border border-border shadow-sm" style={{width:'100%',maxWidth:width,marginInline:'auto',borderRadius:width<1024?16:0,height:viewportHeight*scale,maxHeight:700,boxSizing:'border-box'}} tabIndex={0} aria-label="Prévia rolável do mapa de calor"
      >
      <div style={{height:height*scale,position:'relative',width:'100%'}}>
        <div style={{position:'sticky',top:0,width:'100%',height:viewportHeight*scale,overflow:'hidden'}}>
          <div style={{width,height:viewportHeight,transform:`scale(${scale})`,transformOrigin:'top left',position:'relative'}}>
            <iframe ref={frame} src={path} title={`Prévia de ${path}`} onLoad={loaded} tabIndex={-1} style={{display:'block',width,height:viewportHeight,pointerEvents:'none',border:0}} />
          </div>
        </div>
        {/* Heat belongs to the scrollable document, not the sticky iframe viewport.
            Native scrolling moves it immediately, including touch/momentum scroll. */}
        {show&&<svg className="absolute left-0 top-0 pointer-events-none" width={width*scale} height={height*scale} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Distribuição dos cliques na área visível">
          <defs><radialGradient id="heat-point"><stop offset="0" stopColor="#ff2200" stopOpacity=".9"/><stop offset=".3" stopColor="#ffcc00" stopOpacity=".7"/><stop offset=".65" stopColor="#00caff" stopOpacity=".45"/><stop offset="1" stopColor="#0088ff" stopOpacity="0"/></radialGradient></defs>
          {points.map((point,i)=><circle key={i} cx={Math.min(1,point.x/10000)*width} cy={Math.min(1,point.y/10000)*height} r={18+25*Math.sqrt(point.count/maximum)} fill="url(#heat-point)" opacity={.3+.7*point.count/maximum} />)}
        </svg>}
      </div>
    </div>
    </div>
  </div>;
}
