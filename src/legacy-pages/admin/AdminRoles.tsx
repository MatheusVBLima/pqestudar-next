"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Role = "admin" | "developer" | "moderator" | "user";
type RoleRow = {
  id: string;
  user_id: string;
  role: Role;
  created_at: string;
  email: string | null;
};

type RolesResponse = { roles: RoleRow[] };

async function callRolesFunction(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-manage-roles", {
    body: { action, ...payload },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("developer");

  const { data: isSuperAdmin, isLoading: checkingSuperAdmin } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin");
      if (error) return false;
      return data === true;
    },
  });

  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ["admin-roles-list"],
    queryFn: async () => (await callRolesFunction("list")) as RolesResponse,
    enabled: isSuperAdmin === true,
  });

  const assignRole = useMutation({
    mutationFn: () =>
      callRolesFunction("assign", {
        email: email.trim().toLowerCase(),
        role,
      }),
    onSuccess: () => {
      toast.success(`Papel ${role} atribuido a ${email}`);
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeRole = useMutation({
    mutationFn: (row: RoleRow) =>
      callRolesFunction("revoke", {
        user_id: row.user_id,
        role: row.role,
      }),
    onSuccess: () => {
      toast.success("Papel removido");
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (checkingSuperAdmin) {
    return <div className="p-6 text-muted-foreground">Verificando...</div>;
  }

  if (isSuperAdmin !== true) {
    return (
      <div className="p-6">
        <Card className="rounded-[var(--admin-radius)] p-6">
          <div className="flex items-center gap-3 text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Acesso restrito</h2>
              <p className="text-sm text-muted-foreground">
                Apenas o administrador principal pode gerenciar papeis de usuario.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Papeis de Usuario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atribua <code>developer</code> ao time tecnico. <code>admin</code> mantem controle total.
        </p>
      </div>

      <Card className="rounded-[var(--admin-radius)] p-5 shadow-card">
        <h2 className="mb-3 font-semibold">Atribuir papel</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex-1"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="developer">developer</option>
            <option value="admin">admin</option>
            <option value="moderator">moderator</option>
            <option value="user">user</option>
          </select>
          <Button onClick={() => assignRole.mutate()} disabled={!email || assignRole.isPending}>
            {assignRole.isPending ? "Atribuindo..." : "Atribuir"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          O usuario precisa ter feito login pelo menos uma vez para existir no sistema.
        </p>
      </Card>

      <Card className="rounded-[var(--admin-radius)] p-5 shadow-card">
        <h2 className="mb-3 font-semibold">Papeis ativos</h2>
        {loadingRoles ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : (rolesData?.roles?.length ?? 0) === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum papel atribuido.</div>
        ) : (
          <div className="divide-y">
            {rolesData?.roles.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.email ?? row.user_id}</div>
                  <div className="text-xs text-muted-foreground">
                    Desde {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={row.role === "admin" ? "default" : "secondary"}>{row.role}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Remover ${row.role} de ${row.email ?? row.user_id}?`)) {
                        revokeRole.mutate(row);
                      }
                    }}
                    disabled={revokeRole.isPending}
                    aria-label={`Remover ${row.role}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
