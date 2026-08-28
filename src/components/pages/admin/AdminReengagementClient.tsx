"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bell, Clock3, Mail, Plus, RefreshCw, RotateCcw, Settings2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Channel = "in_app" | "email" | "smart";
type Trigger = "saved_inactive" | "user_inactive" | "related_content" | "long_inactive" | "manual";
type Journey = { id: string; name: string; description: string | null; trigger_type: Trigger; channel: Channel; is_active: boolean; wait_days: number; cooldown_days: number; max_per_30_days: number; priority: number; email_template_id: string | null };
type Delivery = { id: string; journey_id: string; email: string | null; channel: "in_app" | "email"; status: string; scheduled_at: string };
type Template = { id: string; name: string };
type Overview = { journeys: Journey[]; deliveries: Delivery[]; templates: Template[]; stats: { active: number; queued: number; sent: number; returned: number } };

const baseJourney = { name: "", description: "", trigger_type: "user_inactive" as Trigger, channel: "smart" as Channel, is_active: false, wait_days: 7, cooldown_days: 7, max_per_30_days: 4, priority: 50, email_template_id: null as string | null };
const triggerLabels: Record<Trigger, string> = { saved_inactive: "Salvo não revisitado", user_inactive: "Usuário inativo", related_content: "Novo conteúdo relacionado", long_inactive: "Inatividade prolongada", manual: "Seleção manual" };
const channelLabels: Record<Channel, string> = { in_app: "Na conta", email: "E-mail", smart: "Canal inteligente" };
const statusLabels: Record<string, string> = { queued: "Na fila", cancelled: "Cancelado", sending: "Enviando", sent: "Enviado", failed: "Falhou", opened: "Aberto", clicked: "Clicado", returned: "Retornou" };

function ChannelIcon({ channel }: { channel: Channel }) {
  return channel === "email" ? <Mail className="h-4 w-4" /> : channel === "in_app" ? <Bell className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />;
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof Activity }) {
  return <article className="flex min-h-32 flex-col justify-between rounded-[22px] border border-border bg-card/65 p-5"><div className="flex justify-between text-sm font-semibold text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4 text-primary" /></div><div><strong className="text-3xl tabular-nums">{value}</strong><p className="text-xs text-muted-foreground">{detail}</p></div></article>;
}

export default function AdminReengagementClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<any>(baseJourney);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/admin/reengagement", { cache: "no-store" }); const body = await response.json(); if (!response.ok) { setMigrationRequired(Boolean(body.migrationRequired)); throw new Error(body.error); } setData(body); setMigrationRequired(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const deliveries = useMemo(() => (data?.deliveries ?? []).filter((item) => filter === "all" || item.status === filter), [data, filter]);
  const names = useMemo(() => new Map((data?.journeys ?? []).map((item) => [item.id, item.name])), [data]);
  const edit = (journey?: Journey) => { setDraft(journey ? { ...journey } : { ...baseJourney }); setOpen(true); };
  const change = (key: string, value: unknown) => setDraft((current: any) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Informe o nome da jornada.");
    setSaving(true);
    try { const response = await fetch("/api/admin/reengagement", { method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); toast.success("Jornada salva."); setOpen(false); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Erro ao salvar."); } finally { setSaving(false); }
  };
  const toggle = async (journey: Journey, is_active: boolean) => {
    try { const response = await fetch("/api/admin/reengagement", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: journey.id, is_active }) }); if (!response.ok) throw new Error((await response.json()).error); toast.success(is_active ? "Jornada ativada." : "Jornada pausada."); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Erro ao alterar jornada."); }
  };

  return <div className="mx-auto w-full max-w-[1640px] space-y-7 p-4 md:p-8">
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><Badge variant="outline" className="mb-3 rounded-full border-primary/30 bg-primary/10 text-primary"><RotateCcw className="mr-2 h-3.5 w-3.5" />Relacionamento</Badge><h1 className="text-3xl font-bold md:text-4xl">Reengajamento</h1><p className="mt-2 max-w-3xl text-muted-foreground">Crie jornadas baseadas no comportamento, controle a frequência e acompanhe quem realmente voltou.</p></div><div className="flex gap-2"><Button variant="outline" className="rounded-xl" onClick={() => void load()}><RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />Atualizar</Button><Button className="rounded-xl" onClick={() => edit()} disabled={migrationRequired}><Plus className="mr-2 h-4 w-4" />Nova jornada</Button></div></header>
    {error && <div className={cn("rounded-[22px] border p-5", migrationRequired ? "border-amber-500/30 bg-amber-500/10" : "border-destructive/30 bg-destructive/10")}><h2 className="font-semibold">{migrationRequired ? "Estrutura pendente no Supabase" : "Erro ao carregar"}</h2><p className="mt-1 text-sm text-muted-foreground">{error}</p>{migrationRequired && <p className="mt-3 text-xs">Execute a migração <code>20260828000200_reengagement_control_center.sql</code>.</p>}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Jornadas ativas" value={data?.stats.active ?? 0} detail="regras funcionando" icon={Activity} /><Metric label="Na fila" value={data?.stats.queued ?? 0} detail="aguardando processamento" icon={Clock3} /><Metric label="Enviados" value={data?.stats.sent ?? 0} detail="últimos 30 dias" icon={Bell} /><Metric label="Retornaram" value={data?.stats.returned ?? 0} detail="retorno atribuído" icon={Users} /></section>
    <section className="rounded-[26px] border bg-card/55"><div className="flex justify-between border-b p-5"><div><h2 className="text-xl font-bold">Jornadas</h2><p className="text-sm text-muted-foreground">Revise canal e frequência antes de ativar.</p></div><Badge variant="secondary" className="h-fit rounded-full">{data?.journeys.length ?? 0}</Badge></div><div className="grid gap-4 p-5 lg:grid-cols-2 2xl:grid-cols-3">{(data?.journeys ?? []).map((journey) => <article key={journey.id} className="flex min-h-64 flex-col rounded-[22px] border bg-background/55 p-5"><div className="flex justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><ChannelIcon channel={journey.channel} /></span><Switch checked={journey.is_active} onCheckedChange={(value) => void toggle(journey, value)} /></div><h3 className="mt-4 text-lg font-bold">{journey.name}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{journey.description || "Sem descrição."}</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline" className="rounded-full">{triggerLabels[journey.trigger_type]}</Badge><Badge variant="outline" className="rounded-full">{channelLabels[journey.channel]}</Badge></div><div className="mt-auto grid grid-cols-3 gap-2 pt-5 text-center text-xs"><span className="rounded-xl bg-muted/60 p-2"><b className="block text-sm">{journey.wait_days}d</b>espera</span><span className="rounded-xl bg-muted/60 p-2"><b className="block text-sm">{journey.cooldown_days}d</b>intervalo</span><span className="rounded-xl bg-muted/60 p-2"><b className="block text-sm">{journey.max_per_30_days}</b>por mês</span></div><Button variant="outline" className="mt-3 rounded-xl" onClick={() => edit(journey)}><Settings2 className="mr-2 h-4 w-4" />Personalizar</Button></article>)}</div></section>
    <section className="overflow-hidden rounded-[26px] border bg-card/55"><div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center"><div><h2 className="text-xl font-bold">Fila e histórico</h2><p className="text-sm text-muted-foreground">Últimas decisões dos últimos 30 dias.</p></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full rounded-xl md:w-44"><SelectValue /></SelectTrigger><SelectContent>{["all","queued","sent","opened","clicked","returned","failed","cancelled"].map((status) => <SelectItem key={status} value={status}>{status === "all" ? "Todos os status" : statusLabels[status]}</SelectItem>)}</SelectContent></Select></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-4">Jornada</th><th className="p-4">Contato</th><th className="p-4">Canal</th><th className="p-4">Status</th><th className="p-4">Programado</th></tr></thead><tbody className="divide-y">{deliveries.map((item) => <tr key={item.id}><td className="p-4 font-medium">{names.get(item.journey_id) || "Removida"}</td><td className="p-4 text-muted-foreground">{item.email || "Conta autenticada"}</td><td className="p-4">{channelLabels[item.channel]}</td><td className="p-4"><Badge variant="outline" className="rounded-full">{statusLabels[item.status] || item.status}</Badge></td><td className="p-4 text-muted-foreground">{new Date(item.scheduled_at).toLocaleString("pt-BR")}</td></tr>)}{!deliveries.length && <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Nenhum envio registrado.</td></tr>}</tbody></table></div></section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[26px]"><DialogHeader><DialogTitle>{draft.id ? "Personalizar jornada" : "Nova jornada"}</DialogTitle><DialogDescription>Configure o gatilho, o canal e os limites de contato.</DialogDescription></DialogHeader><div className="grid gap-4"><Field label="Nome"><Input className="rounded-xl" value={draft.name} onChange={(e) => change("name", e.target.value)} /></Field><Field label="Descrição"><Textarea className="rounded-xl" value={draft.description || ""} onChange={(e) => change("description", e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Choice label="Gatilho" value={draft.trigger_type} onChange={(v) => change("trigger_type", v)} options={triggerLabels} /><Choice label="Canal" value={draft.channel} onChange={(v) => change("channel", v)} options={channelLabels} /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Template de e-mail"><Select value={draft.email_template_id || "none"} onValueChange={(v) => change("email_template_id", v === "none" ? null : v)}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Definir depois</SelectItem>{data?.templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field><NumberField label="Prioridade" value={draft.priority} onChange={(v) => change("priority", v)} /></div><div className="grid gap-4 sm:grid-cols-3"><NumberField label="Espera (dias)" value={draft.wait_days} onChange={(v) => change("wait_days", v)} /><NumberField label="Intervalo (dias)" value={draft.cooldown_days} onChange={(v) => change("cooldown_days", v)} /><NumberField label="Máximo/30 dias" value={draft.max_per_30_days} onChange={(v) => change("max_per_30_days", v)} /></div><div className="flex justify-between rounded-2xl border bg-muted/25 p-4"><div><b>Ativar jornada</b><p className="text-xs text-muted-foreground">Mantenha pausada durante a configuração.</p></div><Switch checked={draft.is_active} onCheckedChange={(v) => change("is_active", v)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => void save()} disabled={saving}>{saving ? "Salvando..." : "Salvar jornada"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}</div>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <Field label={label}><Input className="rounded-xl" type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} /></Field>; }
function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Record<string, string> }) { return <Field label={label}><Select value={value} onValueChange={onChange}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(options).map(([key,text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></Field>; }
