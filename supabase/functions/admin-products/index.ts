import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const editableFields = [
  "title",
  "description",
  "category",
  "cta_url",
  "image_url",
  "sort_order",
  "sales_page",
] as const;

function editablePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const payload: Record<string, unknown> = {};

  for (const field of editableFields) {
    if (field in source) payload[field] = source[field];
  }

  if ("sort_order" in payload) payload.sort_order = Number(payload.sort_order) || 0;
  if (!payload.sales_page || typeof payload.sales_page !== "object" || Array.isArray(payload.sales_page)) {
    payload.sales_page = {};
  }

  return payload;
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: roleError } = await userClient.rpc("is_admin");
    if (roleError || isAdmin !== true) return json(403, { error: "Admin access required" });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const input = body.data as Record<string, unknown> | undefined;

    if (action === "list") {
      const { data, error } = await admin
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) return json(500, { error: error.message });
      return json(200, data ?? []);
    }

    if (action === "create") {
      const payload = editablePayload(input);
      if (!payload.title || !payload.description || !payload.category || !payload.cta_url) {
        return json(400, { error: "Title, description, category and CTA URL are required" });
      }

      const { data, error } = await admin
        .from("products")
        .insert({ ...payload, is_active: true })
        .select()
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, data);
    }

    const id = String(input?.id ?? "");
    if (!id) return json(400, { error: "Product id is required" });

    if (action === "update") {
      const payload = editablePayload(input);
      const { data, error } = await admin
        .from("products")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, data);
    }

    if (action === "toggleActive") {
      const { data, error } = await admin
        .from("products")
        .update({ is_active: Boolean(input?.is_active), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, data);
    }

    if (action === "delete") {
      const { error } = await admin.from("products").delete().eq("id", id);
      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (error) {
    console.error("admin-products error", error);
    return json(500, { error: error instanceof Error ? error.message : "Unexpected error" });
  }
});
