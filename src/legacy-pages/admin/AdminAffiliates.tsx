"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ExternalLink, Copy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AffiliatePage {
  id: string;
  affiliate_name: string;
  slug: string;
  basic_url: string;
  premium_url: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const ADMIN_AFFILIATES_KEY = ["admin_affiliate_pages"] as const;

const emptyForm = {
  id: "" as string | null,
  affiliate_name: "",
  slug: "",
  basic_url: "",
  premium_url: "",
  is_active: true,
  notes: "",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const validSlug = (value: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length >= 2 && value.length <= 80;
const validUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export default function AdminAffiliates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const affiliatesQuery = useQuery({
    queryKey: ADMIN_AFFILIATES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_pages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AffiliatePage[];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof emptyForm) => {
      const dataPayload = {
        affiliate_name: payload.affiliate_name.trim(),
        slug: payload.slug.trim(),
        basic_url: payload.basic_url.trim(),
        premium_url: payload.premium_url.trim(),
        is_active: payload.is_active,
        notes: payload.notes.trim() || null,
      };
      const { error } = payload.id
        ? await supabase.from("affiliate_pages").update(dataPayload).eq("id", payload.id)
        : await supabase.from("affiliate_pages").insert(dataPayload);
      if (error) throw error;
    },
    onSuccess: async (_, payload) => {
      toast({ title: payload.id ? "Afiliado atualizado" : "Afiliado criado" });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ADMIN_AFFILIATES_KEY });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("affiliate_pages").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ADMIN_AFFILIATES_KEY });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("affiliate_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Afiliado excluído" });
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ADMIN_AFFILIATES_KEY });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const items = affiliatesQuery.data ?? [];
  const loading = affiliatesQuery.isLoading;

  const openNew = () => {
    setForm({ ...emptyForm });
    setSlugTouched(false);
    setOpen(true);
  };

  const openEdit = (item: AffiliatePage) => {
    setForm({
      id: item.id,
      affiliate_name: item.affiliate_name,
      slug: item.slug,
      basic_url: item.basic_url,
      premium_url: item.premium_url,
      is_active: item.is_active,
      notes: item.notes || "",
    });
    setSlugTouched(true);
    setOpen(true);
  };

  const onNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      affiliate_name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const onSubmit = async () => {
    if (!form.affiliate_name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!validSlug(form.slug)) {
      toast({
        title: "Slug inválido",
        description: "Use apenas letras minúsculas, números e hífens.",
        variant: "destructive",
      });
      return;
    }
    if (!validUrl(form.basic_url) || !validUrl(form.premium_url)) {
      toast({
        title: "Links inválidos",
        description: "Os links de checkout devem ser URLs válidas (https).",
        variant: "destructive",
      });
      return;
    }

    await saveMutation.mutateAsync(form);
  };

  const toggleActive = async (item: AffiliatePage) => {
    await toggleMutation.mutateAsync({ id: item.id, is_active: !item.is_active });
  };

  const publicUrl = (slug: string) => `${window.location.origin}/mapa-dos-beneficios/${slug}`;

  const copyUrl = async (slug: string) => {
    await navigator.clipboard.writeText(publicUrl(slug));
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Afiliados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Páginas de afiliado da landing <code className="text-xs">/mapa-dos-beneficios</code>. Cada afiliado tem links próprios para os planos Básico e Premium, mantendo o mesmo template.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo afiliado
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de afiliados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Básico</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum afiliado cadastrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.affiliate_name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{item.slug}</code>
                    </TableCell>
                    <TableCell>
                      <a href={item.basic_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate inline-block max-w-[180px]">
                        {item.basic_url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <a href={item.premium_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate inline-block max-w-[180px]">
                        {item.premium_url}
                      </a>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleActive(item)}
                        className="inline-flex items-center"
                        title="Clique para alterar status"
                      >
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => copyUrl(item.slug)} title="Copiar URL pública">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" asChild title="Abrir página pública">
                          <a href={publicUrl(item.slug)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(item.id)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar afiliado" : "Novo afiliado"}</DialogTitle>
            <DialogDescription>
              A página pública usará o template de <code>/mapa-dos-beneficios</code>, alterando apenas os links dos planos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do afiliado</Label>
              <Input
                id="name"
                value={form.affiliate_name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ex.: João Silva"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug público</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                }}
                placeholder="joao-silva"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL pública: <code>/mapa-dos-beneficios/{form.slug || "slug"}</code>
              </p>
            </div>

            <div>
              <Label htmlFor="basic_url">Link do plano Básico</Label>
              <Input
                id="basic_url"
                value={form.basic_url}
                onChange={(e) => setForm((prev) => ({ ...prev, basic_url: e.target.value }))}
                placeholder="https://pay.cakto.com.br/..."
              />
            </div>

            <div>
              <Label htmlFor="premium_url">Link do plano Premium</Label>
              <Input
                id="premium_url"
                value={form.premium_url}
                onChange={(e) => setForm((prev) => ({ ...prev, premium_url: e.target.value }))}
                placeholder="https://pay.cakto.com.br/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Este link também é usado automaticamente no botão da seção de garantia.
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_active: value }))}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Página ativa (acessível publicamente)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(state) => !state && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir afiliado?</AlertDialogTitle>
            <AlertDialogDescription>
              A página pública desse afiliado deixará de funcionar imediatamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
