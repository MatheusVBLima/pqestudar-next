import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "developer" | "moderator" | "user";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const { data: isSuperAdmin } = await userClient.rpc("is_super_admin");
    if (isSuperAdmin !== true) {
      return json(403, { error: "Forbidden: super admin required" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data: roles, error } = await admin
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .order("created_at", { ascending: false });

      if (error) return json(500, { error: error.message });

      const userIds = [...new Set((roles ?? []).map((role) => role.user_id))];
      const emails: Record<string, string> = {};

      for (const id of userIds) {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user?.email) emails[id] = data.user.email;
      }

      return json(200, {
        roles: (roles ?? []).map((role) => ({
          ...role,
          email: emails[role.user_id] ?? null,
        })),
      });
    }

    if (action === "assign") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const role = body.role as Role;

      if (!email || !["admin", "developer", "moderator", "user"].includes(role)) {
        return json(400, { error: "Email and valid role required" });
      }

      let targetId: string | null = null;
      let page = 1;

      while (page <= 20 && !targetId) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        });

        if (error) return json(500, { error: error.message });

        const found = data.users.find((item) => (item.email ?? "").toLowerCase() === email);
        if (found) targetId = found.id;
        if (data.users.length < 200) break;
        page++;
      }

      if (!targetId) return json(404, { error: "User not found for that email" });

      const { error } = await admin
        .from("user_roles")
        .insert({ user_id: targetId, role })
        .select()
        .single();

      if (error && !String(error.message).includes("duplicate")) {
        return json(500, { error: error.message });
      }

      return json(200, { success: true, user_id: targetId, role });
    }

    if (action === "revoke") {
      const userId = String(body.user_id ?? "");
      const role = body.role as Role;
      if (!userId || !role) return json(400, { error: "user_id and role required" });

      if (userId === user.id && role === "admin") {
        return json(400, { error: "Cannot revoke your own admin role" });
      }

      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (error) {
    console.error("admin-manage-roles error", error);
    return json(500, { error: (error as Error).message });
  }
});
