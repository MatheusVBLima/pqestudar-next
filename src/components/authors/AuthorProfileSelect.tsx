"use client";
import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';

export function AuthorProfileSelect({ value, onChange }: { value?: string | null; onChange: (id: string | null, name?: string) => void }) {
  const id = useId();
  const { user } = useAuth();
  const { canAccessAdmin, loading } = useUserRoles();
  const query = useQuery({ queryKey: ['guide-author-profiles', user?.id, canAccessAdmin], enabled: !!user && !loading, queryFn: async () => {
    let request = supabase.from('author_profiles').select('id,slug,display_name').order('display_name');
    if (!canAccessAdmin) request = request.eq('user_id', user!.id);
    const { data, error } = await request;
    if (error) throw error;
    return data;
  } });
  return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium">Perfil público do autor</label>
    <select id={id} value={value || ''} disabled={loading || query.isPending || query.isError} onChange={e => {
      const author = query.data?.find(a => a.id === e.target.value);
      onChange(author?.id || null, author?.display_name);
    }} className="w-full rounded-md border bg-background p-2 text-sm">
      <option value="">{canAccessAdmin ? 'Sem perfil selecionado' : 'Usar meu perfil de autor'}</option>
      {value && !query.data?.some(a => a.id === value) && <option value={value}>Perfil vinculado ao guia</option>}
      {query.data?.map(a => <option key={a.id} value={a.id}>{a.display_name} (/{a.slug})</option>)}
    </select>
    {query.isError ? <p role="alert" className="text-xs text-destructive">Não foi possível carregar os perfis. Tente abrir o editor novamente.</p> : <p className="text-xs text-muted-foreground">Vincule o perfil para exibir a apresentação e contabilizar conquistas. <a href={canAccessAdmin ? '/admin/autores' : '/autores/meu-perfil'} target="_blank" rel="noopener noreferrer" className="text-primary underline">Gerenciar perfil ↗</a></p>}
  </div>;
}
