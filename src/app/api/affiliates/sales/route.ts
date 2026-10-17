import { affiliateFailure, affiliateResponse, affiliateSession } from '@/lib/affiliates/server';
export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get('page') || 0);
  if (!Number.isInteger(page) || page < 0 || page > 100000) return affiliateResponse({error:'Página inválida.'},400);
  try {
    const {client,response} = await affiliateSession();
    if (response) return response;
    const {data,error} = await client.rpc('affiliate_sales',{p_page:page});
    return error ? affiliateFailure(error) : affiliateResponse(data);
  } catch { return affiliateFailure({}); }
}
