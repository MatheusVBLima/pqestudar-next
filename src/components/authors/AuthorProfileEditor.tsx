"use client";
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { safeAuthorUrl } from '@/lib/authors';

type Profile = Tables<'author_profiles'>;
const blank = { display_name: '', slug: '', headline: '', bio: '', education: '', photo_url: '', website_url: '', website_label: 'Conheça meu trabalho', instagram_url: '', youtube_url: '', featured_badges: [] as string[], user_id: '' };

export function AuthorProfileForm({ profile, userId, admin, onSaved }: { profile?: Profile; userId: string; admin: boolean; onSaved: (id: string) => void }) {
  const [form, setForm] = useState(profile ? { ...profile, user_id: profile.user_id || '' } : { ...blank, user_id: admin ? '' : userId });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const badges = useQuery({ queryKey: ['author-badges', profile?.id], enabled: !!profile?.id, queryFn: async () => {
    const { data, error } = await supabase.from('author_badges').select('*').eq('author_id', profile!.id).order('earned_at', { ascending: false });
    if (error) throw error;
    return data;
  } });
  const update = (field: keyof typeof blank, value: string) => setForm(previous => ({ ...previous, [field]: value }));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const field of ['photo_url', 'website_url', 'instagram_url', 'youtube_url'] as const) {
      if (form[field] && !safeAuthorUrl(form[field])) { toast.error('Use links HTTPS válidos, sem usuário ou senha.'); return; }
    }
    if (form.instagram_url && !['instagram.com', 'www.instagram.com'].includes(new URL(form.instagram_url).hostname)) { toast.error('Informe um link do Instagram.'); return; }
    if (form.youtube_url && !['youtube.com', 'www.youtube.com', 'youtu.be'].includes(new URL(form.youtube_url).hostname)) { toast.error('Informe um link do YouTube.'); return; }
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.keys(blank).map(key => [key, typeof form[key] === 'string' ? form[key].trim() : form[key]])) as typeof blank;
      const values = { ...payload, user_id: admin ? payload.user_id || null : userId };
      const result = profile
        ? await supabase.from('author_profiles').update(values).eq('id', profile.id).select('id').single()
        : await supabase.from('author_profiles').insert(values).select('id').single();
      if (result.error) throw result.error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['author-editor'] }),
        queryClient.invalidateQueries({ queryKey: ['public-authors'] }),
        queryClient.invalidateQueries({ queryKey: ['guide-author-profiles'] }),
      ]);
      onSaved(result.data.id);
      toast.success('Perfil de autor salvo.');
    } catch (error) {
      const code = (error as { code?: string }).code;
      toast.error(code === '23505' ? 'Este endereço ou esta conta já possui um perfil de autor.' : 'Não foi possível salvar. Confira os campos e sua permissão de edição.');
    } finally { setSaving(false); }
  }
  const fields = [
    ['display_name', 'Nome público', 100], ['slug', 'Endereço do perfil', 100],
    ['headline', 'Sua apresentação em uma frase', 180], ['photo_url', 'Link da foto (HTTPS)', 2000],
    ['website_url', 'Link do seu trabalho ou projeto', 2000], ['website_label', 'Texto do botão', 60],
    ['instagram_url', 'Instagram', 2000], ['youtube_url', 'YouTube', 2000],
  ] as const;
  return <form onSubmit={save} className="space-y-8 rounded-2xl border bg-card p-5 sm:p-8">
    {profile && <Link href={`/autores/${profile.slug}`} target="_blank" className="text-sm font-medium text-primary hover:underline">Ver perfil público ↗</Link>}
    <div className="grid gap-5 sm:grid-cols-2">{fields.map(([field, label, maxLength]) => <div key={field} className={field === 'headline' ? 'sm:col-span-2' : ''}><Label htmlFor={`author-${field}`}>{label}</Label><Input id={`author-${field}`} className="mt-2" value={form[field]} onChange={e => update(field, e.target.value)} maxLength={maxLength} required={['display_name', 'slug', 'website_label'].includes(field)} minLength={field === 'slug' ? 3 : field === 'display_name' ? 2 : undefined} pattern={field === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} disabled={field === 'slug' && !!profile} type={field.endsWith('_url') ? 'url' : 'text'} placeholder={field === 'slug' ? 'seu-nome' : undefined} />{field === 'slug' && <p className="mt-1 text-xs text-muted-foreground">/autores/{form.slug || 'seu-nome'} · O endereço fica fixo após criar.</p>}</div>)}</div>
    <div><Label htmlFor="author-bio">Sobre você</Label><Textarea id="author-bio" value={form.bio} onChange={e => update('bio', e.target.value)} maxLength={2000} rows={6} className="mt-2" placeholder="Conte sua trajetória, o que você compartilha e como pode ajudar quem lê seus guias." /><p className="mt-1 text-xs text-muted-foreground">{form.bio.length}/2000 caracteres</p></div>
    <div><Label htmlFor="author-education">Formação e experiência</Label><Textarea id="author-education" value={form.education} onChange={e => update('education', e.target.value)} maxLength={400} rows={3} className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">Informações apresentadas por você no perfil público.</p></div>
    {admin && <div><Label htmlFor="author-account">Conta responsável (ID do usuário)</Label><Input id="author-account" value={form.user_id} onChange={e => update('user_id', e.target.value)} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">Opcional. Vincule apenas após confirmar a conta. O nome público não comprova identidade.</p></div>}
    <section className="rounded-xl bg-muted/40 p-5"><h2 className="font-semibold">Suas conquistas</h2><p className="mt-2 text-sm text-muted-foreground">Os selos chegam automaticamente ao publicar 1, 10 e 50 guias, alcançar 10 guias em uma categoria ou publicar durante 3 meses seguidos. Escolha até três para destacar.</p>
      {badges.isError && <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível carregar suas conquistas.</p>}
      <div className="mt-4 space-y-3">{badges.data?.map(badge => <label key={badge.code} className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm"><input type="checkbox" className="mt-1" checked={form.featured_badges.includes(badge.code)} disabled={!form.featured_badges.includes(badge.code) && form.featured_badges.length >= 3} onChange={e => setForm(previous => ({ ...previous, featured_badges: e.target.checked ? [...previous.featured_badges, badge.code] : previous.featured_badges.filter(c => c !== badge.code) }))} /><span><strong>{badge.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{badge.description}</span></span></label>)}</div>
    </section>
    <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar perfil público'}</Button>
  </form>;
}

export default function AuthorProfileEditor({ admin = false }: { admin?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const roles = useUserRoles();
  const [selected, setSelected] = useState('');
  const allowed = admin ? roles.canAccessAdmin : roles.canAccessAdmin || roles.isModerator;
  const query = useQuery({ queryKey: ['author-editor', user?.id, admin], enabled: !!user && allowed, queryFn: async () => {
    let query = supabase.from('author_profiles').select('*').order('display_name');
    if (!admin) query = query.eq('user_id', user!.id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } });
  if (authLoading || roles.loading) return <p className="p-8" role="status">Carregando perfil…</p>;
  if (!user) return <div className="p-8"><p>Entre na sua conta para editar seu perfil de autor.</p><Button asChild className="mt-4"><Link href="/login?from=%2Fautores%2Fmeu-perfil">Entrar</Link></Button></div>;
  if (!allowed) return <p className="p-8">O perfil de autor está disponível para quem tem acesso à publicação de guias. Solicite esse acesso à equipe PqEstudar.</p>;
  if (query.isPending) return <p className="p-8" role="status">Carregando perfil…</p>;
  if (query.isError) return <div className="p-8"><p role="alert">Não foi possível carregar o perfil.</p><Button className="mt-4" onClick={() => query.refetch()}>Tentar novamente</Button></div>;
  const profile = admin ? query.data.find(a => a.id === selected) : query.data[0];
  return <div className="mx-auto max-w-3xl px-4 py-10"><h1 className="text-3xl font-bold">{admin ? 'Autores dos guias' : 'Meu perfil de autor'}</h1><p className="mb-8 mt-3 text-muted-foreground">Apresente seu trabalho e reúna suas contribuições no PqEstudar.</p>
    {admin && <div className="mb-6"><Label htmlFor="select-author">Editar autor</Label><select id="select-author" value={selected} onChange={e => setSelected(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"><option value="">Criar novo autor</option>{query.data.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}</select></div>}
    <AuthorProfileForm key={profile?.id || 'new'} profile={profile} userId={user.id} admin={admin} onSaved={id => setSelected(id)} />
  </div>;
}
