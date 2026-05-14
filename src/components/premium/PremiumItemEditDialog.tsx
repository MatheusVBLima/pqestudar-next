"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

export type PremiumItemType = 'course' | 'job';

export interface PremiumItemSaved {
  id: string;
  item_type: PremiumItemType;
  title: string;
  slug: string;
  description_short: string | null;
  description_full: string | null;
  logo_url: string | null;
  external_url: string | null;
  tags: string[];
  status: 'draft' | 'published';
  sort_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: string | null;
  defaultType?: PremiumItemType;
  lockType?: boolean;
  onSaved?: (item: PremiumItemSaved) => void;
}

interface FormState {
  item_type: PremiumItemType;
  title: string;
  slug: string;
  description_short: string;
  description_full: string;
  logo_url: string;
  external_url: string;
  tags: string;
  status: 'draft' | 'published';
  sort_order: number;
}

const emptyForm = (type: PremiumItemType): FormState => ({
  item_type: type,
  title: '',
  slug: '',
  description_short: '',
  description_full: '',
  logo_url: '',
  external_url: '',
  tags: '',
  status: 'draft',
  sort_order: 0,
});

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function PremiumItemEditDialog({
  open,
  onOpenChange,
  itemId,
  defaultType = 'course',
  lockType,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const isEditing = !!itemId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('card');
  const [form, setForm] = useState<FormState>(emptyForm(defaultType));

  useEffect(() => {
    if (!open) return;
    setTab('card');
    if (!itemId) {
      setForm(emptyForm(defaultType));
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('premium_items').select('*').eq('id', itemId).maybeSingle();
      setLoading(false);
      if (error || !data) {
        toast({ title: 'Erro', description: error?.message || 'Item não encontrado.', variant: 'destructive' });
        onOpenChange(false);
        return;
      }
      setForm({
        item_type: data.item_type as PremiumItemType,
        title: data.title,
        slug: data.slug,
        description_short: data.description_short || '',
        description_full: data.description_full || '',
        logo_url: data.logo_url || '',
        external_url: data.external_url || '',
        tags: (data.tags || []).join(', '),
        status: data.status as 'draft' | 'published',
        sort_order: data.sort_order || 0,
      });
    })();
  }, [open, itemId, defaultType, onOpenChange]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onTitleChange = (title: string) => {
    setForm((p) => ({ ...p, title, slug: !isEditing && !p.slug ? slugify(title) : p.slug }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      setTab('card');
      return;
    }
    if (!form.slug.trim()) {
      toast({ title: 'Slug obrigatório', variant: 'destructive' });
      setTab('publicacao');
      return;
    }
    setSaving(true);
    try {
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = {
        item_type: form.item_type,
        title: form.title.trim(),
        slug: form.slug.trim(),
        description_short: form.description_short.trim() || null,
        description_full: form.description_full.trim() || null,
        logo_url: form.logo_url.trim() || null,
        external_url: form.external_url.trim() || null,
        tags,
        status: form.status,
        sort_order: form.sort_order,
        published_at: form.status === 'published' ? new Date().toISOString() : null,
        updated_by: user?.id,
      };
      let saved;
      if (isEditing) {
        const { data, error } = await supabase
          .from('premium_items')
          .update(payload)
          .eq('id', itemId!)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        saved = data;
        toast({ title: 'Salvo', description: 'Item atualizado.' });
      } else {
        const { data, error } = await supabase
          .from('premium_items')
          .insert({ ...payload, created_by: user?.id })
          .select('*')
          .maybeSingle();
        if (error) throw error;
        saved = data;
        toast({ title: 'Criado', description: 'Item criado.' });
      }
      if (saved && onSaved) {
        onSaved({
          id: saved.id,
          item_type: saved.item_type as PremiumItemType,
          title: saved.title,
          slug: saved.slug,
          description_short: saved.description_short,
          description_full: saved.description_full,
          logo_url: saved.logo_url,
          external_url: saved.external_url,
          tags: saved.tags || [],
          status: saved.status as 'draft' | 'published',
          sort_order: saved.sort_order || 0,
        });
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isJob = form.item_type === 'job';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar item premium' : isJob ? 'Nova vaga' : form.item_type === 'course' ? 'Novo curso' : 'Novo item premium'}
          </DialogTitle>
          <DialogDescription>
            Edite os campos do card e da página interna sem sair desta rota.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card">Card</TabsTrigger>
              <TabsTrigger value="pagina">Página interna</TabsTrigger>
              <TabsTrigger value="publicacao">Publicação</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-4 pt-4">
              {!lockType && (
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={form.item_type}
                    onValueChange={(v: PremiumItemType) => update('item_type', v)}
                    disabled={isEditing}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course">Curso</SelectItem>
                      <SelectItem value="job">Vaga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={form.title} onChange={(e) => onTitleChange(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="desc-short">Descrição curta (resumo do card)</Label>
                <Textarea id="desc-short" rows={2} value={form.description_short} onChange={(e) => update('description_short', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="logo">URL do logo / ícone</Label>
                <Input id="logo" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="tags">Tags / chips (separadas por vírgula)</Label>
                <Input id="tags" value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder={isJob ? 'Remoto, CLT, SP' : 'React, Frontend'} />
              </div>
            </TabsContent>

            <TabsContent value="pagina" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="desc-full">Descrição completa</Label>
                <Textarea id="desc-full" rows={6} value={form.description_full} onChange={(e) => update('description_full', e.target.value)} placeholder={isJob ? 'Detalhes da vaga: empresa, modalidade, localização, benefícios...' : 'Detalhes do curso: plataforma, modalidade, nível, duração, certificado...'} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {isJob
                    ? 'Inclua aqui empresa, localização, modalidade/tipo, salário e demais detalhes da vaga.'
                    : 'Inclua aqui plataforma/instituição, modalidade, nível, duração e demais detalhes do curso.'}
                </p>
              </div>
              <div>
                <Label htmlFor="external">CTA principal — link externo</Label>
                <Input id="external" value={form.external_url} onChange={(e) => update('external_url', e.target.value)} placeholder="https://..." />
                <p className="mt-1 text-xs text-muted-foreground">
                  Botão principal da página interna ({isJob ? 'Acessar vaga' : 'Acessar curso'}).
                </p>
              </div>
            </TabsContent>

            <TabsContent value="publicacao" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={form.slug} onChange={(e) => update('slug', e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">
                  URL: /premium/{form.item_type === 'course' ? 'cursos' : 'vagas'}/{form.slug || '...'}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: 'draft' | 'published') => update('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho (oculto)</SelectItem>
                      <SelectItem value="published">Publicado (visível)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sort">Ordem</Label>
                  <Input id="sort" type="number" value={form.sort_order} onChange={(e) => update('sort_order', parseInt(e.target.value) || 0)} />
                  <p className="mt-1 text-xs text-muted-foreground">Menor número aparece primeiro.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
