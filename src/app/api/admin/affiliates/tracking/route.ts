import { z } from 'zod';
import { affiliateFailure, affiliateResponse, affiliateSession, validAffiliateOrigin } from '@/lib/affiliates/server';
const settings = z.object({enabled:z.boolean(),days:z.number().int().min(1).max(90)}).strict();
export async function GET() {
  try {
    const {client,response}=await affiliateSession(); if(response) return response;
    const {data,error}=await client.rpc('affiliate_tracking_settings',{});
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
export async function POST(request:Request) {
  if(!validAffiliateOrigin(request)) return affiliateResponse({error:'Origem inválida.'},403);
  try {
    const {client,response}=await affiliateSession(); if(response) return response;
    const body=settings.safeParse(await request.json().catch(()=>null));
    if(!body.success) return affiliateResponse({error:'Informe uma janela entre 1 e 90 dias.'},400);
    const authorized = await client.rpc('affiliate_tracking_settings',{});
    if(authorized.error) return affiliateFailure(authorized.error);
    if(body.data.enabled && (process.env.AFFILIATE_REFERRAL_SECRET || '').length < 32)
      return affiliateResponse({error:'Configure o segredo de rastreamento no servidor antes de ativar.'},503);
    const {data,error}=await client.rpc('affiliate_tracking_settings',{p_enabled:body.data.enabled,p_days:body.data.days});
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
