import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export interface LibraryAsset {
  storage_path: string; description: string; tags: string[]; purpose: string;
  source: string; license: string; approved: boolean;
}
// The migration is versioned alongside this client; regenerate Database after deployment.
export const imageLibraryClient = supabase as SupabaseClient;
export function ImageLibraryMetadata({ storagePath }: { storagePath: string }) {
  const [asset, setAsset] = useState<LibraryAsset>({storage_path:storagePath,description:'',tags:[],purpose:'cover',source:'',license:'',approved:false});
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    imageLibraryClient.from('guide_image_library').select('*').eq('storage_path', storagePath).maybeSingle().then(({data,error}) => {
      if (!alive) return;
      if (error) setError('Biblioteca indisponível. Verifique se a atualização do banco foi aplicada e se você tem acesso.');
      if (data) { setAsset(data as LibraryAsset); setTags(data.tags.join(', ')); }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [storagePath]);
  const save = async () => {
    const terms = [...new Set(tags.split(',').map(t=>t.trim()).filter(Boolean))];
    if (terms.length < 2 || terms.length > 20 || asset.description.trim().length < 10 || !asset.source.trim() || !asset.license.trim()) {
      toast({title:'Complete o cadastro',description:'Informe uma descrição, de 2 a 20 termos específicos, a fonte e a autorização de uso.',variant:'destructive'}); return;
    }
    setLoading(true);
    const {error} = await imageLibraryClient.from('guide_image_library').upsert({...asset,tags:terms,updated_at:new Date().toISOString()});
    setLoading(false);
    toast({title:error ? 'Não foi possível salvar' : 'Cadastro salvo',description:error ? 'Somente administradores e desenvolvedores podem aprovar imagens. Confira também a atualização do banco.' : 'A seleção automática usará apenas imagens aprovadas.',variant:error?'destructive':'default'});
  };
  return <div className="space-y-3 border-t pt-3">
    <p className="text-sm font-semibold">Reutilização automática</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Label>O que aparece na imagem<Input maxLength={500} value={asset.description} onChange={e=>setAsset({...asset,description:e.target.value})} placeholder="Ex.: certificado ilustrativo com nome e carga horária destacados" /></Label>
    <Label>Termos específicos, separados por vírgula<Input value={tags} onChange={e=>setTags(e.target.value)} placeholder="certificado, carga horária" /></Label>
    <Label>Função<select className="block w-full rounded border bg-background p-2" value={asset.purpose} onChange={e=>setAsset({...asset,purpose:e.target.value})}>
      <option value="cover">Capa</option><option value="explanation">Explicação</option><option value="steps">Passo a passo</option><option value="comparison">Comparação</option>
    </select></Label>
    <Label>Fonte ou autoria<Input value={asset.source} onChange={e=>setAsset({...asset,source:e.target.value})} /></Label>
    <Label>Licença ou autorização de reutilização<Input value={asset.license} onChange={e=>setAsset({...asset,license:e.target.value})} placeholder="Ex.: produção própria com direitos de reutilização" /></Label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={asset.approved} onChange={e=>setAsset({...asset,approved:e.target.checked})} />Revisei a imagem e tenho autorização para reutilizá-la sem crédito obrigatório na página.</label>
    <Button onClick={save} disabled={loading || !!error}>Salvar cadastro</Button>
  </div>;
}
