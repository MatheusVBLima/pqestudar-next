import {NextRequest,NextResponse} from 'next/server';
import {revalidatePath,revalidateTag} from 'next/cache';
import {contentReviewAdmin} from '@/lib/content-review-server';
import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_ANON_KEY} from '@/lib/runtime-env';

export const maxDuration=300;
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 const auth=await contentReviewAdmin();
 if(auth.status!==200)return json({error:auth.status===401?'Entre na sua conta.':'Recurso exclusivo de administradores.'},auth.status);
 if(request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Origem inválida.'},403);
 const text=await request.text();if(text.length>100000)return json({error:'Requisição muito grande.'},413);
 let body;try{body=JSON.parse(text);}catch{return json({error:'Requisição inválida.'},400);}
 try{
  const result=await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/content-review`,{method:'POST',headers:{Authorization:`Bearer ${auth.token}`,apikey:PUBLIC_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(240000)});
  const data=await result.json();
  if(result.ok&&['apply','undo','save_manual'].includes(body.action)){
   revalidateTag('guides',{expire:0});revalidateTag('tools',{expire:0});revalidateTag('premium',{expire:0});
   if(typeof data.route==='string'&&/^\/(guias|ferramentas|premium\/cursos)(\/|$)/.test(data.route))revalidatePath(data.route);
   revalidatePath('/guias');revalidatePath('/ferramentas');revalidatePath('/premium/cursos');
   if(data.route?.startsWith('/guias/'))revalidateTag(`guide:${data.route.slice(7)}`,{expire:0});
   if(data.route?.startsWith('/ferramentas/'))revalidateTag(`tool:slug:${data.route.slice(13)}`,{expire:0});
  }
  return json(data,result.status);
 }catch{return json({error:'A central não respondeu. Reabra o conteúdo para conferir o estado salvo antes de repetir.'},502);}
}
