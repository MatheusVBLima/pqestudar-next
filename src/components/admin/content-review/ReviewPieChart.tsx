import {verdictLabels,type ReviewRun,type Verdict} from '@/lib/content-review';
import styles from './content-review.module.css';

const categories:{status:Verdict;color:string}[]=[
 {status:'confirmed',color:'hsl(142 71% 45%)'},
 {status:'contradicted',color:'hsl(0 84% 60%)'},
 {status:'uncertain',color:'hsl(45 93% 47%)'},
 {status:'unverified',color:'hsl(215 16% 57%)'},
 {status:'editorial',color:'hsl(263 70% 65%)'},
];
export default function ReviewPieChart({run}:{run:ReviewRun|null}){
 const total=run?.claims.length||0;
 if(!total)return <p className={styles.chartEmpty}>Nenhuma afirmação disponível para o gráfico. Inicie uma análise ou escolha outra no histórico.</p>;
 const rows=categories.map(category=>({...category,count:run!.claims.filter(c=>c.status===category.status).length}));
 let angle=-Math.PI/2;
 const slices=rows.filter(row=>row.count>0).map(row=>{
  const from=angle;angle+=row.count/total*Math.PI*2;
  const middle=(from+angle)/2;
  return {...row,middle,external:row.count/total<.12,path:`M 120 120 L ${120+100*Math.cos(from)} ${120+100*Math.sin(from)} A 100 100 0 ${row.count/total>.5?1:0} 1 ${120+100*Math.cos(angle)} ${120+100*Math.sin(angle)} Z`};
 });
 const externalPositions=new Map<string,number>();
 for(const side of [-1,1]){
  const group=slices.filter(s=>s.external&&(Math.cos(s.middle)<0?-1:1)===side).map(s=>({status:s.status,y:Math.max(8,Math.min(232,120+115*Math.sin(s.middle)))})).sort((a,b)=>a.y-b.y);
  for(let i=1;i<group.length;i++)group[i].y=Math.max(group[i].y,group[i-1].y+20);
  const overflow=Math.max(0,(group.at(-1)?.y||0)-232);
  for(const item of group)externalPositions.set(item.status,item.y-overflow);
 }
 const percentage=(count:number)=>(count/total).toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1});
 return <div>
  <p className={styles.chartSubtitle}>{total} afirmações selecionadas · análise de {new Date(run!.created_at).toLocaleString('pt-BR')}</p>
  <div className={styles.chartLayout}>
   <svg viewBox={externalPositions.size?'-35 -10 310 260':'0 0 240 240'} role="img" aria-label={`Gráfico de pizza: ${rows.map(row=>`${verdictLabels[row.status]}: ${row.count}, ${percentage(row.count)}`).join('; ')}`} className={styles.pieChart}>
    <title>Distribuição dos status da análise</title>
    {slices.map(slice=>slices.length===1?<circle key={slice.status} cx="120" cy="120" r="100" fill={slice.color}><title>{verdictLabels[slice.status]}: {slice.count} ({percentage(slice.count)})</title></circle>:<path key={slice.status} d={slice.path} fill={slice.color} stroke="hsl(var(--card))" strokeWidth="2"><title>{verdictLabels[slice.status]}: {slice.count} ({percentage(slice.count)})</title></path>)}
    {slices.map(slice=>{
     const left=Math.cos(slice.middle)<0;
     const x=slices.length===1?120:slice.external?(left?-28:268):120+64*Math.cos(slice.middle);
     const y=slices.length===1?120:slice.external?externalPositions.get(slice.status)!:120+64*Math.sin(slice.middle);
     return <g key={'label-'+slice.status} aria-hidden="true">
      {slice.external&&<polyline points={`${120+102*Math.cos(slice.middle)},${120+102*Math.sin(slice.middle)} ${left?20:220},${y} ${left?14:226},${y}`} fill="none" stroke={slice.color} strokeWidth="1.5"/>}
      <text x={x} y={y} textAnchor={slice.external?(left?'start':'end'):'middle'} dominantBaseline="middle" fill={slice.external?'hsl(var(--foreground))':'hsl(0 0% 8%)'} fontSize="14" fontWeight="700">{percentage(slice.count)}</text>
     </g>;
    })}
   </svg>
   <table className={styles.chartLegend} aria-label="Distribuição por status">
    <thead><tr><th>Status</th><th>Qtd.</th><th>%</th></tr></thead>
    <tbody>{rows.map(row=><tr key={row.status}><th scope="row"><span className={styles.chartSwatch} style={{background:row.color}}/>{verdictLabels[row.status]}</th><td>{row.count}</td><td>{percentage(row.count)}</td></tr>)}</tbody>
   </table>
  </div>
  <p className={styles.chartSubtitle}>A pizza representa somente as afirmações selecionadas nesta análise, não a cobertura nem a aprovação do conteúdo inteiro. “Não verificado” inclui afirmações sem evidência suficiente ou ainda não pesquisadas.</p>
 </div>;
}
