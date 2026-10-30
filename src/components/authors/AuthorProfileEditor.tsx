"use client";
import { AuthorBadgeDisplay } from './AuthorBadgeDisplay';
import { useRef, useState, type FormEvent } from 'react';
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
import { GUIDE_IMAGES_BUCKET } from '@/lib/guide-assets';
import { AuthorAdminDirectory, AuthorAdminCard } from './AuthorAdminDirectory';
import { ArrowLeft, ExternalLink, Feather, Link2, Award, UserRound, ShieldCheck } from 'lucide-react';
import styles from './author-admin.module.css';

type Profile = Tables<'author_profiles'>;
const blank = { display_name: '', slug: '', headline: '', bio: '', education: '', photo_url: '', website_url: '', website_label: 'Conheça meu trabalho', instagram_url: '', youtube_url: '', featured_badges: [] as string[], user_id: '' };

export function AuthorProfileForm({ profile, userId, admin, onSaved }: { profile?: Profile; userId: string; admin: boolean; onSaved: (id: string) => void }) {
  const [form, setForm] = useState(profile ? { ...profile, user_id: profile.user_id || '' } : { ...blank, user_id: admin ? '' : userId });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  async function uploadPhoto(file: File) {
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    setPhotoError('');
    if (!extensions[file.type] || !file.size || file.size > 5 * 1024 * 1024) {
      setPhotoError('Selecione uma imagem JPG, PNG ou WebP de até 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const bucket = supabase.storage.from(GUIDE_IMAGES_BUCKET);
      const path = `authors/${crypto.randomUUID()}.${extensions[file.type]}`;
      const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
      if (error) throw error;
      setForm(previous => ({ ...previous, photo_url: bucket.getPublicUrl(path).data.publicUrl }));
      toast.success('Foto enviada. Salve o perfil para aplicar a alteração.');
    } catch {
      setPhotoError('Não foi possível enviar a foto. Confira a imagem e tente novamente.');
    } finally { setUploading(false); }
  }
  const queryClient = useQueryClient();
  const badges = useQuery({ queryKey: ['author-badges', profile?.id], enabled: !!profile?.id, queryFn: async () => {
    const { data, error } = await supabase.from('author_badges').select('*').eq('author_id', profile!.id).order('earned_at', { ascending: false });
    if (error) throw error;
    return data;
  } });
  const update = (field: keyof typeof blank, value: string) => setForm(previous => ({ ...previous, [field]: value }));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || saving) return;
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
  function renderFields(names: string[]) {
    return <div className={styles.fields}>{fields.filter(([field]) => names.includes(field)).map(([field, label, maxLength]) => <div key={field} className={['headline', 'photo_url'].includes(field) ? styles.wide : ''}><Label htmlFor={`author-${field}`}>{label}</Label><Input id={`author-${field}`} className="mt-2" value={form[field]} onChange={e => update(field, e.target.value)} maxLength={maxLength} required={['display_name', 'slug', 'website_label'].includes(field)} minLength={field === 'slug' ? 3 : field === 'display_name' ? 2 : undefined} pattern={field === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} disabled={field === 'slug' && !!profile} type={field.endsWith('_url') ? 'url' : 'text'} placeholder={field === 'slug' ? 'seu-nome' : field.endsWith('_url') ? 'https://' : undefined} />{field === 'slug' && <p className="mt-2 break-all text-[11px] text-muted-foreground">/autores/{form.slug || 'seu-nome'} · Endereço fixo após criar.</p>}</div>)}</div>;
  }
  const preview = { ...form, id: profile?.id || 'preview', created_at: profile?.created_at || '' };
  return <form onSubmit={save} className={styles.form}>
    <div className={styles.formLayout}>
      <div className={styles.formSections}>
        <section className={`${styles.panel} ${styles.formSection}`}>
          <div className={styles.sectionHeading}><span><UserRound size={20} /></span><div><h2>Identidade do autor</h2><p>Como os leitores vão conhecer você.</p></div></div>
          {renderFields(['display_name', 'slug', 'headline'])}
          <div className="mt-4 space-y-2">
            <Label htmlFor="author-photo-upload">Foto do autor</Label>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-primary/20 bg-primary/5 p-3">
              <input ref={photoInput} id="author-photo-upload" aria-describedby="author-photo-help" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading || saving} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadPhoto(file); }} />
              <Button type="button" variant="outline" disabled={uploading || saving} onClick={() => photoInput.current?.click()}>{uploading ? 'Enviando foto…' : form.photo_url ? 'Trocar foto' : 'Enviar foto'}</Button>
              {form.photo_url && <Button type="button" variant="ghost" disabled={uploading || saving} onClick={() => { update('photo_url', ''); setPhotoError(''); }}>Remover foto</Button>}
              <p id="author-photo-help" className="text-xs text-muted-foreground">JPG, PNG ou WebP · Até 5 MB. Prefira uma foto quadrada.</p>
            </div>
            <p role="status" className="text-xs text-muted-foreground">{uploading ? 'Enviando imagem… Aguarde para salvar o perfil.' : 'A foto aparece na prévia. Salve o perfil para publicar a alteração.'}</p>
            {photoError && <p role="alert" className="text-sm text-destructive">{photoError}</p>}
          </div>
        </section>
        <section className={`${styles.panel} ${styles.formSection}`}>
          <div className={styles.sectionHeading}><span><Feather size={20} /></span><div><h2>Uma trajetória para compartilhar</h2><p>Conte sua história e o que você traz para os guias.</p></div></div>
          <div className={styles.storyFields}><div><Label htmlFor="author-bio">Sobre você</Label><Textarea id="author-bio" value={form.bio} onChange={e => update('bio', e.target.value)} maxLength={2000} rows={4} className="mt-2" placeholder="Sua trajetória, seus interesses e como você ajuda os leitores." /><p className="mt-2 text-right text-[11px] text-muted-foreground">{form.bio.length}/2000 caracteres</p></div>
          <div><Label htmlFor="author-education">Formação e experiência</Label><Textarea id="author-education" value={form.education} onChange={e => update('education', e.target.value)} maxLength={400} rows={2} className="mt-2" placeholder="Formação, projetos e experiências relevantes." /></div></div>
        </section>
        <section className={`${styles.panel} ${styles.formSection}`}>
          <div className={styles.sectionHeading}><span><Link2 size={20} /></span><div><h2>Além dos guias</h2><p>Conecte os leitores ao seu trabalho e às suas redes.</p></div></div>
          {renderFields(['website_url', 'website_label', 'instagram_url', 'youtube_url'])}
        </section>
        <section className={`${styles.panel} ${styles.formSection}`}>
          <div className={styles.sectionHeading}><span><Award size={20} /></span><div><h2>Conquistas do autor</h2><p>Todas as conquistas aparecem automaticamente no perfil.</p></div></div>
          {badges.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar suas conquistas.</p> : badges.isFetching ? <p role="status" className="text-sm text-muted-foreground">Carregando conquistas…</p> : badges.data?.length ? <div className={styles.badgeChoices}>{badges.data.map(badge => <AuthorBadgeDisplay key={badge.code} badge={badge} />)}</div> : <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center"><Award size={28} strokeWidth={1.3} className="mx-auto mb-3 text-primary/60" /><p className="text-sm font-medium">Cada contribuição conta</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">O primeiro guia publicado libera a primeira conquista. Novos selos chegam com volume, categorias e constância.</p></div>}
        </section>
        {admin && <section className={`${styles.panel} ${styles.formSection}`}><div className={styles.sectionHeading}><span><ShieldCheck size={20} /></span><div><h2>Responsável pelo perfil</h2><p>Defina quem pode gerenciar esta apresentação.</p></div></div><Label htmlFor="author-account">Conta responsável (ID do usuário)</Label><Input id="author-account" value={form.user_id} onChange={e => update('user_id', e.target.value)} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" className="mt-2" /><p className="mt-2 text-[11px] text-muted-foreground">Opcional. Confira a identidade da conta antes de vinculá-la.</p></section>}
    <footer className={`${styles.panel} ${styles.formFooter}`}><p>As informações salvas aparecem no perfil público do autor.</p><Button type="submit" disabled={saving || uploading}>{saving ? 'Salvando…' : 'Salvar perfil público'}</Button></footer>
      </div>
      <aside className={styles.aside}><p className={styles.previewLabel}>Prévia do card · ao vivo</p><AuthorAdminCard author={preview} badges={badges.data || []} badgeState={badges.isError ? 'error' : badges.isFetching ? 'loading' : 'ready'} preview />{profile && <Button asChild variant="outline" className="mt-4 w-full"><Link href={`/autores/${profile.slug}`} target="_blank" rel="noopener noreferrer">Ver perfil público<ExternalLink size={14} className="ml-2" /></Link></Button>}<p className="mt-4 text-xs leading-relaxed text-muted-foreground">A foto, a apresentação e os destaques acompanham o autor nos guias.</p></aside>
    </div>
  </form>;

}

export default function AuthorProfileEditor({ admin = false }: { admin?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const roles = useUserRoles();
  const [selected, setSelected] = useState<string | null>(null);
  const allowed = admin ? roles.canAccessAdmin : roles.canAccessAdmin || roles.isModerator;
  const allBadges = useQuery({ queryKey: ['admin-author-badges', user?.id], enabled: !!user && allowed && admin, queryFn: async () => {
    const rows: Tables<'author_badges'>[] = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase.from('author_badges').select('*').order('author_id').order('code').range(from, from + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  } });
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
  return <div className={styles.page}>
    {admin && selected === null ? <AuthorAdminDirectory authors={query.data} badges={allBadges.data || []} badgeState={allBadges.isError ? 'error' : allBadges.isPending ? 'loading' : 'ready'} onSelect={setSelected} /> : <>
      <header className={styles.header}><div>{admin && <Button variant="ghost" size="sm" className="mb-4 -ml-3 text-muted-foreground" onClick={() => setSelected(null)}><ArrowLeft size={14} className="mr-2" />Voltar aos autores</Button>}<p className={styles.eyebrow}>{admin ? 'Conteúdo / Autores' : 'Sua presença no PqEstudar'}</p><h1 className={styles.title}>{admin ? profile ? 'Editar perfil do autor' : 'Uma nova voz nos guias' : 'Meu perfil de autor'}</h1><p className={styles.description}>{profile ? `Cuide da apresentação e dos destaques de ${profile.display_name}.` : 'Apresente quem escreve, valorize sua experiência e conecte seu trabalho aos leitores.'}</p></div></header>
      <AuthorProfileForm key={profile?.id || 'new'} profile={profile} userId={user.id} admin={admin} onSaved={id => setSelected(id)} />
    </>}
  </div>;
}
