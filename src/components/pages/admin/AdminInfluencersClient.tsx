"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, ExternalLink, Eye, EyeOff, Filter, House, Loader2, Pencil, Plus, Search, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

type Influencer = Database["public"]["Tables"]["admin_influencers"]["Row"];
type Fields = Pick<Influencer, "name" | "profile_url" | "email" | "phone" | "status" | "photo_url" | "show_on_home">;
const labels = { pending: "Pendente", accepted: "Aceito", rejected: "Não aceito" };
const affiliationOptions = [
  { value: "accepted", Icon: Check, color: "text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400", active: "border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/20" },
  { value: "pending", Icon: Clock, color: "text-amber-700 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400", active: "border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/20" },
  { value: "rejected", Icon: X, color: "text-red-700 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400", active: "border-red-500/40 bg-red-500/15 hover:bg-red-500/20" },
] as const;
const empty: Fields = { name: "", profile_url: "", email: "", phone: "", status: "pending", photo_url: "", show_on_home: false };
const queryKey = ["admin-influencers"];

function profileUrl(value: string) {
  const trimmed = value.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) {
    throw new Error("Informe um link de perfil válido, usando http ou https.");
  }
  return url.href;
}

export default function AdminInfluencersClient() {
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [showPhones, setShowPhones] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Influencer | null>(null);
  const [deleting, setDeleting] = useState<Influencer | null>(null);
  const [fields, setFields] = useState<Fields>(empty);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // Fetch in pages so prospect lists are not silently limited to 1,000 rows.
      const rows: Influencer[] = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase.from("admin_influencers").select("*").order("created_at", { ascending: false }).order("id").range(from, from + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
  });
  const mutation = useMutation({
    mutationFn: async (action: { kind: "save"; id?: string; values: Fields } | { kind: "status"; id: string; status: Influencer["status"] } | { kind: "home"; id: string; visible: boolean } | { kind: "delete"; id: string }) => {
      if (action.kind === "delete") {
        const { data, error } = await supabase.from("admin_influencers").delete().eq("id", action.id).select("id").single();
        if (error || !data) throw new Error("Não foi possível excluir o influenciador. Tente novamente.");
        return;
      }
      if (action.kind === "home" && action.visible) {
        const row = cache.getQueryData<Influencer[]>(queryKey)?.find(item => item.id === action.id);
        if (!row?.photo_url?.trim() || row.status !== "accepted") {
          throw new Error("Para exibir na home, cadastre uma foto e selecione a afiliação Aceito.");
        }
      }
      const values = action.kind === "status" ? { status: action.status } : action.kind === "home" ? { show_on_home: action.visible } : action.values;
      const request = action.id
        ? supabase.from("admin_influencers").update(values).eq("id", action.id)
        : supabase.from("admin_influencers").insert(action.kind === "save" ? action.values : empty);
      const { data, error } = await request.select().single();
      if (error || !data) throw new Error("Não foi possível salvar. Confira sua conexão e tente novamente.");
      return data;
    },
    onSuccess: (saved, action) => {
      if (saved) cache.setQueryData<Influencer[]>(queryKey, rows => rows?.map(row => row.id === saved.id ? saved : row));
      if (action.kind === "save") setOpen(false);
      if (action.kind === "delete") setDeleting(null);
      toast.success(action.kind === "delete" ? "Influenciador excluído." : action.kind === "home" ? action.visible ? "Exibição na home ativada." : "Exibição na home desativada." : "Dados salvos.");
      void cache.invalidateQueries({ queryKey });
      void cache.invalidateQueries({ queryKey: ["home-influencer-partners"] });
    },
    onError: (error, action) => {
      if (action.kind === "save") setFormError(error.message);
      toast.error(error.message);
    },
  });
  const busy = mutation.isPending || uploading;
  async function uploadPhoto(file: File) {
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    setFormError("");
    if (!extensions[file.type] || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setFormError("Selecione uma imagem JPG, PNG ou WebP de até 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const path = `portraits/${crypto.randomUUID()}.${extensions[file.type]}`;
      const bucket = supabase.storage.from("influencer-photos");
      const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const { data } = bucket.getPublicUrl(path);
      setFields(current => ({ ...current, photo_url: data.publicUrl }));
      toast.success("Foto enviada. Salve o cadastro para aplicar a alteração.");
    } catch {
      setFormError("Não foi possível enviar a foto. Verifique se a imagem é válida e tente novamente.");
    } finally {
      setUploading(false);
    }
  }
  function startEdit(row: Influencer | null) {
    setEditing(row);
    setFields(row ? { name: row.name, profile_url: row.profile_url, email: row.email ?? "", phone: row.phone ?? "", status: row.status, photo_url: row.photo_url ?? "", show_on_home: row.show_on_home ?? false } : empty);
    setFormError("");
    setOpen(true);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    try {
      if (!fields.name.trim()) throw new Error("Informe o nome do influenciador.");
      const url = profileUrl(fields.profile_url);
      if (url.length > 2048) throw new Error("O link do perfil é muito longo.");
      const photo = fields.photo_url?.trim() ? profileUrl(fields.photo_url) : null;
      if (photo && (!photo.startsWith("https://") || photo.length > 2048)) throw new Error("Use um link HTTPS válido para a foto.");
      if (fields.show_on_home && (!photo || fields.status !== "accepted")) throw new Error("Para exibir na home, cadastre uma foto e selecione a afiliação Aceito.");
      mutation.mutate({ kind: "save", id: editing?.id, values: { ...fields, photo_url: photo, name: fields.name.trim(), profile_url: url, email: fields.email?.trim() || null, phone: fields.phone?.trim() || null } });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Confira o link do perfil.");
    }
  }
  const rows = (query.data ?? []).filter(row => (filter === "all" || row.status === filter) && [row.name, row.profile_url, row.email, row.phone].some(value => value?.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))));
  if (sort !== "recent") {
    rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base", numeric: true }) * (sort === "asc" ? 1 : -1));
  }

  return (
    <div className="space-y-5 [&_button]:rounded-[var(--admin-radius)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Influenciadores</h1><p className="mt-1 text-sm text-muted-foreground">Contatos e acompanhamento das parcerias do PqEstudar.</p></div>
        <Button onClick={() => startEdit(null)} disabled={mutation.isPending}><Plus className="mr-2 h-4 w-4" />Cadastrar influenciador</Button>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-primary/15 bg-card/70 shadow-2xl shadow-primary/5">
        <div className="flex items-center gap-3 border-b border-primary/10 bg-card/50 px-4 py-3">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-primary/15 bg-background/60 px-4 shadow-inner shadow-primary/5 lg:max-w-3xl">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input className="h-10 min-w-0 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" aria-label="Buscar influenciadores" placeholder="Pesquisar influenciador" value={search} onChange={event => setSearch(event.target.value)} />
            <Button type="button" variant="ghost" size="icon" className={`h-9 w-9 shrink-0 rounded-full ${showFilters || filter !== "all" || sort !== "recent" ? "bg-primary/15 text-primary" : ""}`} onClick={() => setShowFilters(value => !value)} aria-label="Filtros de pesquisa" aria-expanded={showFilters} aria-controls="influencer-filters">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 border-b border-primary/10 px-4 py-2">
          <Button type="button" variant="ghost" size="icon" className={`h-9 w-9 rounded-full ${showFilters || filter !== "all" || sort !== "recent" ? "bg-primary/15 text-primary" : ""}`} onClick={() => setShowFilters(value => !value)} aria-label="Filtros e ordenação" aria-expanded={showFilters} aria-controls="influencer-filters"><Filter className="h-4 w-4" /></Button>
          {filter !== "all" && <span className="text-xs font-medium text-primary">{labels[filter as Influencer["status"]]}</span>}
          <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">{rows.length} {rows.length === 1 ? "influenciador" : "influenciadores"}</span>
        </div>
        {showFilters && <div id="influencer-filters" className="flex flex-wrap items-center gap-2 border-b border-primary/10 bg-background/45 px-4 py-3 text-sm">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger aria-label="Filtrar por afiliação" className="h-10 w-auto gap-3 rounded-full border-primary/20 bg-background/70 px-4 font-semibold hover:border-primary/40 hover:bg-primary/10 [&>svg]:shrink-0 [&:focus:not(:focus-visible)]:ring-0 [&:focus:not(:focus-visible)]:ring-offset-0"><SelectValue>Afiliação: {filter === "all" ? "todas" : labels[filter as Influencer["status"]]}</SelectValue></SelectTrigger>
            <SelectContent className="admin-radius rounded-2xl border-primary/20 p-1 shadow-2xl shadow-primary/10 [&_[role=option]]:rounded-xl [&_[role=option]]:font-semibold">
              <SelectItem value="all">Todas as afiliações</SelectItem>
              {Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger aria-label="Ordenar influenciadores" className="h-10 w-auto gap-3 rounded-full border-primary/20 bg-background/70 px-4 font-semibold hover:border-primary/40 hover:bg-primary/10 [&>svg]:shrink-0 [&:focus:not(:focus-visible)]:ring-0 [&:focus:not(:focus-visible)]:ring-offset-0"><SelectValue /></SelectTrigger>
            <SelectContent className="admin-radius rounded-2xl border-primary/20 p-1 shadow-2xl shadow-primary/10 [&_[role=option]]:rounded-xl [&_[role=option]]:font-semibold">
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="asc">Nome: A–Z</SelectItem>
              <SelectItem value="desc">Nome: Z–A</SelectItem>
            </SelectContent>
          </Select>
          {(filter !== "all" || sort !== "recent" || search) && <Button type="button" variant="ghost" size="sm" onClick={() => { setFilter("all"); setSort("recent"); setSearch(""); }}>Limpar filtros</Button>}
        </div>}
      {query.isError ? <div role="alert" className="rounded-[var(--admin-radius)] border border-border bg-card p-5 text-sm shadow-[var(--admin-shadow)]">Não foi possível carregar os influenciadores.<Button variant="outline" className="ml-3" onClick={() => void query.refetch()}>Tentar novamente</Button></div> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
            <caption className="sr-only">Influenciadores prospectados e status da afiliação</caption>
            <colgroup><col /><col /><col /><col className="w-[180px]" /><col className="w-[148px]" /><col className="w-[128px]" /></colgroup>
            <thead className="border-b bg-muted/50 text-xs text-muted-foreground"><tr>{["Nome", "Perfil", "E-mail", "Telefone", "Afiliação", "Ações"].map(label => <th key={label} scope="col" className="px-3 py-3 font-medium">{label === "Telefone" ? <div className="flex items-center gap-2">Telefone<Button variant="ghost" size="icon" className="h-7 w-7" aria-label={showPhones ? "Ocultar telefones" : "Mostrar telefones"} title={showPhones ? "Ocultar telefones" : "Mostrar telefones"} aria-pressed={showPhones} onClick={() => setShowPhones(value => !value)}>{showPhones ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div> : label}</th>)}</tr></thead>
            <tbody className="divide-y">
              {query.isPending ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando influenciadores…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{query.data?.length ? "Nenhum influenciador encontrado com esses filtros." : "Nenhum influenciador cadastrado. Cadastre seu primeiro contato."}</td></tr> : rows.map(row => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5"><span className="block truncate font-medium" title={row.name}>{row.name}</span></td>
                  <td className="px-3 py-2.5"><a href={/^https?:\/\//i.test(row.profile_url) ? row.profile_url : undefined} target="_blank" rel="noopener noreferrer" title={row.profile_url} className="flex items-center gap-1 text-primary hover:underline"><span className="truncate">{row.profile_url.replace(/^https?:\/\/(www\.)?/, "")}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="sr-only"> (abre em nova aba)</span></a></td>
                  <td className="px-3 py-2.5">{row.email ? <a className="block truncate hover:underline" title={row.email} href={`mailto:${row.email}`}>{row.email}</a> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5">{row.phone ? showPhones ? <a className="block truncate hover:underline" title={row.phone} href={`tel:${row.phone.replace(/[^+\d]/g, "")}`}>{row.phone}</a> : <span className="text-muted-foreground" aria-label="Telefone oculto">••••••••••</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <div role="group" aria-label={`Afiliação de ${row.name}`} className="flex items-center gap-1">
                      {affiliationOptions.map(({ value, Icon, color, active }) => (
                        <Button key={value} variant="ghost" size="icon"
                          className={`h-9 w-9 shrink-0 border ${color} ${row.status === value ? active : "border-transparent opacity-60 hover:opacity-100"}`}
                          title={labels[value]} aria-label={`${labels[value]}: ${row.name}`}
                          aria-pressed={row.status === value} disabled={mutation.isPending}
                          onClick={() => { if (row.status !== value) mutation.mutate({ kind: "status", id: row.id, status: value }); }}>
                          {mutation.isPending && mutation.variables?.kind === "status" && mutation.variables.id === row.id && mutation.variables.status === value
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Icon className="h-4 w-4" />}
                        </Button>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2.5"><div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon"
                      className={`h-8 w-8 shrink-0 border ${row.show_on_home ? "border-primary/30 bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      aria-label={`${row.show_on_home ? "Ocultar" : "Exibir"} ${row.name} na home`}
                      title={row.show_on_home ? "Ocultar da home" : "Exibir na home"}
                      aria-pressed={!!row.show_on_home}
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ kind: "home", id: row.id, visible: !row.show_on_home })}>
                      {mutation.isPending && mutation.variables?.kind === "home" && mutation.variables.id === row.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <House className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Editar ${row.name}`} disabled={mutation.isPending} onClick={() => startEdit(row)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Excluir ${row.name}`} disabled={mutation.isPending} onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
      <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
        <DialogContent className="admin-radius rounded-[var(--admin-radius)] sm:max-w-lg sm:rounded-[var(--admin-radius)] [&_button]:rounded-[var(--admin-radius)]"><DialogHeader><DialogTitle>{editing ? "Editar influenciador" : "Cadastrar influenciador"}</DialogTitle><DialogDescription>Registre o contato e a situação da parceria.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="influencer-name">Nome *</Label><Input id="influencer-name" required maxLength={150} value={fields.name} onChange={event => setFields({ ...fields, name: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="influencer-profile">Link do perfil *</Label><Input id="influencer-profile" required maxLength={2048} placeholder="https://instagram.com/perfil" value={fields.profile_url} onChange={event => setFields({ ...fields, profile_url: event.target.value })} /></div>
              <div className="space-y-2">
                <Label htmlFor="influencer-photo-upload">Foto do influenciador</Label>
                <div className="flex items-center gap-3 rounded-[var(--admin-radius)] border border-border p-3">
                  {fields.photo_url && <img src={fields.photo_url} alt="Foto do influenciador" className="h-16 w-16 shrink-0 rounded-full object-cover" width={64} height={64} />}
                  <div className="min-w-0 space-y-1">
                    <input ref={photoInput} id="influencer-photo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file && !busy) void uploadPhoto(file); }} />
                    <Button type="button" variant="outline" disabled={busy} onClick={() => photoInput.current?.click()}><Upload className="mr-2 h-4 w-4" />{uploading ? "Enviando foto…" : fields.photo_url ? "Trocar foto" : "Enviar foto"}</Button>
                    <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Até 5 MB.</p>
                  </div>
                </div>
                <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Usar link de uma imagem</summary><Input aria-label="Link da foto" type="url" className="mt-2" maxLength={2048} placeholder="https://.../foto.jpg" value={fields.photo_url ?? ""} onChange={event => setFields({ ...fields, photo_url: event.target.value })} /></details>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fields.show_on_home} onChange={event => setFields({ ...fields, show_on_home: event.target.checked })} className="h-4 w-4 accent-primary" />Exibir na home como parceiro do PqEstudar</label>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="influencer-email">E-mail (opcional)</Label><Input id="influencer-email" type="email" maxLength={254} value={fields.email ?? ""} onChange={event => setFields({ ...fields, email: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="influencer-phone">Telefone (opcional)</Label><Input id="influencer-phone" type="tel" maxLength={40} value={fields.phone ?? ""} onChange={event => setFields({ ...fields, phone: event.target.value })} /></div></div>
              <div className="space-y-2">
                <Label htmlFor="influencer-status">Status de afiliação</Label>
                <Select value={fields.status} disabled={mutation.isPending} onValueChange={value => setFields({ ...fields, status: value as Influencer["status"] })}>
                  <SelectTrigger id="influencer-status" className="[&:focus:not(:focus-visible)]:ring-0 [&:focus:not(:focus-visible)]:ring-offset-0"><SelectValue /></SelectTrigger>
                  <SelectContent className="admin-radius rounded-[var(--admin-radius)] [&_[role=option]]:rounded-[calc(var(--admin-radius)-0.2rem)]">
                    {Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{uploading ? "Enviando foto…" : mutation.isPending ? "Salvando…" : "Salvar"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={value => { if (!value && !mutation.isPending) setDeleting(null); }}><AlertDialogContent className="admin-radius rounded-[var(--admin-radius)] sm:rounded-[var(--admin-radius)] [&_button]:rounded-[var(--admin-radius)]"><AlertDialogHeader><AlertDialogTitle>Excluir influenciador?</AlertDialogTitle><AlertDialogDescription>O cadastro de {deleting?.name} será excluído. Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel><Button variant="destructive" disabled={mutation.isPending} onClick={() => deleting && mutation.mutate({ kind: "delete", id: deleting.id })}>{mutation.isPending ? "Excluindo…" : "Excluir"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
