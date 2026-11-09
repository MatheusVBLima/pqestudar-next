export type ContentKind = 'guides' | 'tools' | 'courses';
export type Verdict = 'confirmed' | 'contradicted' | 'uncertain' | 'unverified' | 'editorial';
export interface Evidence { url: string; title: string; summary: string; checked_at: string }
export interface Claim {
  id: string; field: string; original: string; statement: string; status: Verdict;
  reason: string; replacement: string; sources: Evidence[]; checked_at?: string;
  aspects?: string[];
  checks?: {aspect:string;status:Verdict;reason:string;urls:string[]}[];
}
export const FIELDS: Record<ContentKind, string[]> = {
  guides: ['title','short_description','content_markdown','cta_top_text','cta_middle_text','cta_final_text'],
  tools: ['name','description','content_markdown','cta_top_text','cta_middle_text','cta_final_text'],
  courses: ['title','description_short','description_full'],
};
export const kindIsValid = (kind: unknown): kind is ContentKind => typeof kind === 'string' && Object.hasOwn(FIELDS,kind);
export const uuidIsValid = (id: unknown): id is string => typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
export function snapshot(kind: ContentKind, row: Record<string, unknown>) {
  return Object.fromEntries(FIELDS[kind].map(key=>[key,typeof row[key]==='string'?row[key]:null]));
}
export function publicUrl(value: unknown): string | null {
  if(typeof value!=='string' || value.length>2000)return null;
  try { const u=new URL(value); if(u.protocol!=='https:' || u.username || u.password || u.port || !u.hostname.includes('.') || /^\[|^[\d.]+$/.test(u.hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname))return null;u.hash='';return u.href; } catch{return null;}
}
export function parseJson(text: string) {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
}
export const TEXT_MODELS = {lovable:['google/gemini-3-flash-preview','google/gemini-2.5-flash'],openai:['gpt-4.1','gpt-4.1-mini','gpt-4o']};
export const SEARCH_MODELS = ['gpt-4.1','gpt-4.1-mini','gpt-5.4'];
// The model selects immutable IDs instead of copying Markdown and losing its anchors.
export function reviewSegments(fields:Record<string,string|null>) {
 const segments:{id:string;field:string;original:string}[]=[];
 for(const [field,text] of Object.entries(fields)){
  if(!text)continue;
  for(const paragraph of text.split(/\n\s*\n/)){
   if(/^\s*(?:#{1,6}(?:\s|$)|!\[|```|~~~)/.test(paragraph))continue;
   for(const sentence of new Intl.Segmenter('pt-BR',{granularity:'sentence'}).segment(paragraph)){
   const original=sentence.segment.trim();
   if(original.length<15||original.length>1800||/^!\[/.test(original)||text.split(original).length!==2)continue;
   segments.push({id:'segment-'+(segments.length+1),field,original});
   }
  }
 }
 return segments;
}
export function claimsFromSegments(value:unknown,segments:ReturnType<typeof reviewSegments>,fields:Record<string,string|null>) {
 if(!Array.isArray(value))throw new Error('Resposta de análise inválida.');
 return normalizeClaims(value.flatMap(raw=>{
  const segment=segments.find(s=>s.id===raw?.segment_id);
  return segment?[{...raw,field:segment.field,original:segment.original}]:[];
 }),fields);
}
export function normalizeClaims(value: unknown, fields: Record<string,string|null>): Claim[] {
  if(!Array.isArray(value))throw new Error('Resposta de análise inválida.');
  const result: Claim[]=[];
  for(const raw of value.slice(0,30)) {
    if(!raw || typeof raw.field!=='string' || typeof raw.original!=='string' || typeof raw.statement!=='string')continue;
    const original=raw.original;
    const text=fields[raw.field];
    if(!text || original.length<4 || original.length>1800 || text.split(original).length!==2)continue;
    const start=text.indexOf(original),end=start+original.length;
    if(result.some(c=>c.field===raw.field && start<text.indexOf(c.original)+c.original.length && end>text.indexOf(c.original)))continue;
    const aspects=Array.isArray(raw.aspects)?[...new Set<string>(raw.aspects.filter((x:unknown)=>typeof x==='string'&&x.trim().length>0).map((x:string)=>x.trim().slice(0,500)))].slice(0,20):[];
    result.push({id:`claim-${result.length+1}`,field:raw.field,original,statement:raw.statement.slice(0,1500),status:raw.editorial===true?'editorial':'unverified',reason:raw.editorial===true?'Exemplo ou avaliação editorial; não tratado como fato.':'Ainda não pesquisado.',replacement:'',sources:[],...(aspects.length?{aspects}:{})});
  }
  return result;
}
export function normalizeVerdict(raw: Record<string,unknown>, claim: Claim, available: Evidence[], checked: string): Claim {
  const evidence=Array.isArray(raw.sources)?raw.sources.flatMap((entry: {url?:unknown;summary?:unknown})=>{
    const url=publicUrl(entry?.url);const known=available.find(s=>s.url===url);
    return known && typeof entry.summary==='string' ? [{...known,summary:entry.summary.slice(0,1600),checked_at:checked}] : [];
  }):[];
  let status: Verdict = ['confirmed','contradicted','uncertain','unverified'].includes(String(raw.status))?raw.status as Verdict:'unverified';
  if(!evidence.length)status='unverified';
  const checks=(claim.aspects||[]).map(aspect=>{
    const item=Array.isArray(raw.checks)?raw.checks.find(c=>c?.aspect===aspect):null;
    const urls=Array.isArray(item?.urls)?item.urls.map(publicUrl).filter((url:string|null)=>url&&evidence.some(s=>s.url===url)):[];
    const verdict:Verdict=urls.length&&['confirmed','contradicted','uncertain'].includes(item?.status)?item.status:'unverified';
    return {aspect,status:verdict,reason:typeof item?.reason==='string'?item.reason.slice(0,1200):'Este ponto não recebeu evidência suficiente.',urls};
  });
  if(status==='confirmed'&&(!checks.length||checks.some(c=>c.status!=='confirmed')))status=evidence.length?'uncertain':'unverified';
  const incomplete=raw.status==='confirmed'&&status!=='confirmed';
  const replacement=['contradicted','uncertain'].includes(status) && typeof raw.replacement==='string' ? raw.replacement.trim().slice(0,3000) : '';
  return {...claim,status,checks,reason:incomplete?'Confirmação parcial: nem todos os pontos do trecho têm evidências. '+(typeof raw.reason==='string'?raw.reason.slice(0,2000):''):typeof raw.reason==='string'?raw.reason.slice(0,2400):'Sem justificativa suficiente.',replacement:incomplete?'':replacement,sources:evidence,checked_at:checked};
}
export function reviewCoverage(fields:Record<string,string|null>,claims:Claim[]) {
 let total=0,complete=0,partial=0;
 for(const [field,text] of Object.entries(fields)){
  if(!text)continue;
  let cursor=0;
  for(const raw of text.split(/\n\s*\n/)){
   const block=raw.trim(),start=text.indexOf(block,cursor);cursor=start+block.length;
   if(!block||/^\s*(?:#{1,6}(?:\s|$)|!\[|```|~~~)/.test(block))continue;
   total++;
   const mask=new Set<number>();
   for(const claim of claims.filter(c=>c.field===field&&c.checked_at&&c.status!=='editorial')){
    const offset=text.indexOf(claim.original);if(offset<0)continue;
    for(let i=Math.max(start,offset);i<Math.min(start+block.length,offset+claim.original.length);i++)if(!/\s/.test(text[i]))mask.add(i);
   }
   const length=block.replace(/\s/g,'').length;
   if(mask.size>=length)complete++;else if(mask.size)partial++;
  }
 }
 return {total,complete,partial,untouched:total-complete-partial};
}
export function proposedFields(fields: Record<string,string|null>, claims: Claim[], changes: {id:string;text:string}[]) {
  if(!changes.length || changes.length>30 || new Set(changes.map(c=>c.id)).size!==changes.length)throw new Error('Seleção inválida.');
  const next={...fields};
  for(const change of changes){
    const claim=claims.find(c=>c.id===change.id);
    if(!claim || !['contradicted','uncertain'].includes(claim.status) || !claim.sources.length || !change.text?.trim() || change.text.length>3000)throw new Error('Correção sem evidência ou inválida.');
    const text=next[claim.field];
    if(typeof text!=='string' || text.split(claim.original).length!==2)throw new Error('O trecho mudou. Analise novamente.');
    next[claim.field]=text.replace(claim.original,()=>change.text.trim());
  }
  return next;
}
