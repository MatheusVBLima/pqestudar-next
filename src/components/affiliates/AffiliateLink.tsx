'use client';
import { toast } from 'sonner';
import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SITE_URL } from '@/lib/site';
export function AffiliateLink({code,enabled}:{code:string;enabled:boolean}) {
 const link=`${SITE_URL.replace(/\/$/,'')}/mbo-premium?ref=${encodeURIComponent(code)}`;
 async function copy() {try {await navigator.clipboard.writeText(enabled?link:code);toast.success('Copiado.');}catch{toast.error('Não foi possível copiar.');}}
 return <Card><CardHeader><CardTitle>{enabled?'Meu link de indicação':'Seu código de afiliado'}</CardTitle><CardDescription>{enabled?'Compartilhe o link para indicar o MBO. O registro depende do consentimento do visitante.':'O código identifica seu cadastro. O link de indicação ainda não está ativo.'}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex min-w-0 items-center gap-3 rounded-lg border p-3"><code className="min-w-0 flex-1 break-all text-sm">{enabled?link:code}</code><Button variant="outline" size="icon" aria-label={enabled?'Copiar link de indicação':'Copiar código de afiliado'} onClick={copy}><Copy className="h-4 w-4" /></Button></div>{enabled?<Button variant="outline" onClick={async()=>{try{if(navigator.share)await navigator.share({title:'Conheça o MBO',url:link});else await copy();}catch(error){if(!(error instanceof Error)||error.name!=='AbortError')toast.error('Não foi possível compartilhar.');}}}><Share2 className="mr-2 h-4 w-4" />Compartilhar</Button>:<p className="text-sm text-muted-foreground">Aguarde a ativação do rastreamento antes de divulgar links como afiliado.</p>}</CardContent></Card>;
}
