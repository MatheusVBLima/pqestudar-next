"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronDown, ChevronsUpDown, GripVertical, Pencil, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Role = "admin" | "developer" | "moderator" | "user";
type RoleRow = { id: string; user_id: string; role: Role; created_at: string; email: string | null };
type RolesResponse = { roles: RoleRow[] };
const ROLE_ORDER: Role[] = ["admin", "developer", "moderator", "user"];
const ROLE_LABEL: Record<Role, string> = { admin: "Admin", developer: "Developer", moderator: "Moderator", user: "User" };
const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Controle total do painel e das permissões.",
  developer: "Acesso técnico para manutenção e evolução do sistema.",
  moderator: "Apoio na revisão e moderação de conteúdo.",
  user: "Permissão padrão de usuário autenticado.",
};

async function callRolesFunction(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-manage-roles", { body: { action, ...payload } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

function RoleSelect({ value, onChange, disabled, className }: { value: Role; onChange: (role: Role) => void; disabled?: boolean; className?: string }) {
  return <div className={cn("w-full sm:w-52 sm:flex-none", className)}><Select value={value} onValueChange={(next) => onChange(next as Role)} disabled={disabled}>
    <SelectTrigger className="h-10 min-w-40 rounded-[var(--admin-radius)] bg-background"><SelectValue /></SelectTrigger>
    <SelectContent>{ROLE_ORDER.map((item) => <SelectItem key={item} value={item}>{ROLE_LABEL[item]}</SelectItem>)}</SelectContent>
  </Select></div>;
}

function UserRoleRow({ row, busy, onMove, onRemove }: { row: RoleRow; busy: boolean; onMove: (row: RoleRow, role: Role) => void; onRemove: (row: RoleRow) => void }) {
  const [editing, setEditing] = useState(false);
  const [nextRole, setNextRole] = useState<Role>(row.role);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id, data: { row } });
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={cn("flex items-center gap-2 py-3 first:pt-0 last:pb-0", isDragging && "z-50 opacity-40")}>
    <button type="button" className="cursor-grab rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing" aria-label={`Arrastar ${row.email ?? row.user_id}`} {...listeners} {...attributes}><GripVertical className="h-4 w-4" /></button>
    <div className="min-w-0 flex-1">
      <div className="truncate font-medium">{row.email ?? row.user_id}</div>
      <div className="text-xs text-muted-foreground">Desde {new Date(row.created_at).toLocaleDateString("pt-BR")}</div>
      {editing && <div className="mt-3 flex flex-wrap items-center gap-2">
        <RoleSelect value={nextRole} onChange={setNextRole} disabled={busy} />
        <Button size="icon" className="h-9 w-9" disabled={busy || nextRole === row.role} onClick={() => onMove(row, nextRole)} aria-label="Salvar papel"><Check className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => { setNextRole(row.role); setEditing(false); }} aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>
      </div>}
    </div>
    {!editing && <Button size="icon" variant="ghost" onClick={() => setEditing(true)} disabled={busy} aria-label={`Editar papel de ${row.email ?? row.user_id}`}><Pencil className="h-4 w-4" /></Button>}
    <Button size="icon" variant="ghost" onClick={() => onRemove(row)} disabled={busy} className="text-destructive hover:text-destructive" aria-label={`Remover ${row.role}`}><Trash2 className="h-4 w-4" /></Button>
  </div>;
}

function RoleGroup({ role, users, open, onOpenChange, busy, onMove, onRemove }: { role: Role; users: RoleRow[]; open: boolean; onOpenChange: (open: boolean) => void; busy: boolean; onMove: (row: RoleRow, role: Role) => void; onRemove: (row: RoleRow) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `role:${role}`, data: { role } });
  return <Collapsible open={open} onOpenChange={onOpenChange}>
    <Card ref={setNodeRef} className={cn("rounded-[var(--admin-radius)] p-5 shadow-card transition-colors", isOver && "border-primary bg-primary/5 ring-2 ring-primary/20")}>
      <CollapsibleTrigger asChild><button type="button" className="flex w-full items-start justify-between gap-3 text-left">
        <div><div className="flex items-center gap-2"><h3 className="font-semibold">{ROLE_LABEL[role]}</h3><Badge variant={role === "admin" ? "default" : "secondary"}>{users.length}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{ROLE_DESCRIPTION[role]}</p></div>
        <div className="flex items-center gap-2"><Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge><ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} /></div>
      </button></CollapsibleTrigger>
      <CollapsibleContent><div className="mt-4 max-h-80 divide-y divide-border/70 overflow-y-auto pr-1">
        {users.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">Solte um usuário aqui para atribuir este papel.</p> : users.map((row) => <UserRoleRow key={row.id} row={row} busy={busy} onMove={onMove} onRemove={onRemove} />)}
      </div></CollapsibleContent>
    </Card>
  </Collapsible>;
}

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("developer");
  const [openRoles, setOpenRoles] = useState<Set<Role>>(() => new Set(ROLE_ORDER));
  const { data: isSuperAdmin, isLoading: checkingSuperAdmin } = useQuery({ queryKey: ["is-super-admin"], queryFn: async () => { const { data, error } = await supabase.rpc("is_super_admin"); return !error && data === true; } });
  const { data: rolesData, isLoading: loadingRoles } = useQuery({ queryKey: ["admin-roles-list"], queryFn: async () => (await callRolesFunction("list")) as RolesResponse, enabled: isSuperAdmin === true });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
  const assignRole = useMutation({ mutationFn: () => callRolesFunction("assign", { email: email.trim().toLowerCase(), role }), onSuccess: () => { toast.success(`Papel ${role} atribuído a ${email}`); setEmail(""); refresh(); }, onError: (error: Error) => toast.error(error.message) });
  const revokeRole = useMutation({ mutationFn: (row: RoleRow) => callRolesFunction("revoke", { user_id: row.user_id, role: row.role }), onSuccess: () => { toast.success("Papel removido"); refresh(); }, onError: (error: Error) => toast.error(error.message) });
  const moveRole = useMutation({ mutationFn: ({ row, toRole }: { row: RoleRow; toRole: Role }) => callRolesFunction("move", { user_id: row.user_id, from_role: row.role, to_role: toRole }), onSuccess: (_, vars) => { toast.success(`Papel alterado para ${ROLE_LABEL[vars.toRole]}`); refresh(); }, onError: (error: Error) => toast.error(error.message) });
  const groups = ROLE_ORDER.map((roleName) => ({ role: roleName, users: (rolesData?.roles ?? []).filter((row) => row.role === roleName) }));
  const setGroupOpen = (roleName: Role, open: boolean) => setOpenRoles((current) => { const next = new Set(current); if (open) next.add(roleName); else next.delete(roleName); return next; });
  const handleMove = (row: RoleRow, toRole: Role) => { if (row.role !== toRole) moveRole.mutate({ row, toRole }); };
  const handleDragEnd = ({ active, over }: DragEndEvent) => { if (!over) return; const row = active.data.current?.row as RoleRow | undefined; const toRole = over.data.current?.role as Role | undefined; if (row && toRole) handleMove(row, toRole); };
  const handleRemove = (row: RoleRow) => { if (confirm(`Remover ${row.role} de ${row.email ?? row.user_id}?`)) revokeRole.mutate(row); };
  const busy = assignRole.isPending || revokeRole.isPending || moveRole.isPending;

  if (checkingSuperAdmin) return <div className="p-6 text-muted-foreground">Verificando...</div>;
  if (isSuperAdmin !== true) return <div className="p-6"><Card className="rounded-[var(--admin-radius)] p-6"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Acesso restrito</h2><p className="text-sm text-muted-foreground">Apenas o administrador principal pode gerenciar papéis de usuário.</p></div></div></Card></div>;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Papéis de Usuário</h1><p className="mt-1 text-sm text-muted-foreground">Crie, consulte, altere ou remova papéis. Arraste usuários entre os grupos para alterar rapidamente.</p></div>
    <Card className="rounded-[var(--admin-radius)] p-5 shadow-card"><h2 className="mb-3 font-semibold">Atribuir papel</h2><div className="grid gap-2 sm:grid-cols-[minmax(320px,1fr)_13rem_auto]"><Input type="email" placeholder="email@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0" /><RoleSelect value={role} onChange={setRole} disabled={busy} className="sm:w-full" /><Button onClick={() => assignRole.mutate()} disabled={!email || busy}>{assignRole.isPending ? "Atribuindo..." : "Atribuir"}</Button></div><p className="mt-2 text-xs text-muted-foreground">O usuário precisa ter feito login pelo menos uma vez para existir no sistema.</p></Card>
    <section className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold">Papéis ativos</h2><p className="mt-1 text-sm text-muted-foreground">Arraste um usuário para outro grupo ou use o botão de editar.</p></div><Button variant="outline" size="sm" onClick={() => setOpenRoles(openRoles.size === ROLE_ORDER.length ? new Set() : new Set(ROLE_ORDER))}><ChevronsUpDown className="mr-2 h-4 w-4" />{openRoles.size === ROLE_ORDER.length ? "Recolher todos" : "Expandir todos"}</Button></div>
      {loadingRoles ? <Card className="rounded-[var(--admin-radius)] p-5"><p className="text-sm text-muted-foreground">Carregando...</p></Card> : <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}><div className="grid items-start gap-4 xl:grid-cols-2">{groups.map((group) => <RoleGroup key={group.role} role={group.role} users={group.users} open={openRoles.has(group.role)} onOpenChange={(open) => setGroupOpen(group.role, open)} busy={busy} onMove={handleMove} onRemove={handleRemove} />)}</div></DndContext>}
    </section>
  </div>;
}
