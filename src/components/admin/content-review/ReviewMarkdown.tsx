'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type {Root, RootContent, Text} from 'mdast';
import type {Claim} from '@/lib/content-review';
import {verdictLabels} from '@/lib/content-review';
import styles from './content-review.module.css';

export default function ReviewMarkdown({text,claims,selected,onSelect}:{text:string;claims:Claim[];selected:string;onSelect:(id:string)=>void}){
 const ranges=claims.map(claim=>({claim,start:text.indexOf(claim.original),end:text.indexOf(claim.original)+claim.original.length})).filter(r=>r.start>=0);
 function annotations(){return (tree:Root)=>{
  function visit(parent:{children:RootContent[]}){
   parent.children=parent.children.flatMap(node=>{
    if(node.type==='heading'&&!node.children.length)return [];
    if(node.type==='text'){
     const start=node.position?.start.offset,end=node.position?.end.offset;
     if(start===undefined||end===undefined)return [node];
     const matching=ranges.filter(r=>r.start<end&&r.end>start);
     if(!matching.length)return [node];
     // Escaped Markdown can have different source/display lengths; never guess a partial offset.
     if(end-start!==node.value.length){
      const enclosing=matching.find(r=>r.start<=start&&r.end>=end);
      return enclosing?[mark(node.value,enclosing.claim.id)]:[node];
     }
     const pieces:RootContent[]=[];let cursor=start;
     for(const range of matching.sort((a,b)=>a.start-b.start)){
      const from=Math.max(cursor,range.start),to=Math.min(end,range.end);if(to<=from)continue;
      if(from>cursor)pieces.push({type:'text',value:node.value.slice(cursor-start,from-start)});
      pieces.push(mark(node.value.slice(from-start,to-start),range.claim.id));cursor=to;
     }
     if(cursor<end)pieces.push({type:'text',value:node.value.slice(cursor-start)});
     return pieces;
    }
    if('children' in node)visit(node as {children:RootContent[]});
    return [node];
   });
  }
  function mark(value:string,id:string):RootContent{
   return {type:'text',value,data:{hName:'mark',hProperties:{'data-review-claim':id},hChildren:[{type:'text',value}]}} as Text;
  }
  visit(tree);
 };}
 return <div className={styles.rendered}><ReactMarkdown remarkPlugins={[remarkGfm,annotations]} components={{
  mark:({node,children})=>{
   const id=String(node?.properties?.['data-review-claim']||node?.properties?.dataReviewClaim||'');
   const claim=claims.find(c=>c.id===id);if(!claim)return <mark>{children}</mark>;
   const status=claim.status;
   return <mark role="button" tabIndex={0} aria-pressed={selected===id} aria-label={`${verdictLabels[status]}: ${claim.statement}`} title={claim.statement} className={`${styles.inlineMark} ${styles[status]} ${selected===id?styles.selected:''}`} onClick={event=>{event.preventDefault();onSelect(id);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(id);}}}>{children}</mark>;
  },
  a:({children,href})=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
  img:({src,alt})=><img src={src} alt={alt||''} loading="lazy"/>,
 }}>{text}</ReactMarkdown></div>;
}
