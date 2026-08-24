import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const LEGACY_GUIDE_OWNER_EMAIL = "pqestudar.suporte@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!callerRoles?.length) return json(403, { error: "Forbidden" });

    const body = await req.json().catch(() => ({}));
    const { data: ranking, error: rankingError } = await userClient.rpc("analytics_guides_ranking_public", { start_at: body.start_at || null, end_at: body.end_at || null });
    if (rankingError) return json(500, { error: rankingError.message });

    let ownershipSource = "created_by";
    let guidesResult = await admin.from("guides").select("id,title,slug,created_by,author_name,is_published,created_at");
    if (guidesResult.error && String(guidesResult.error.message).includes("created_by")) {
      ownershipSource = "legacy_owner_account";
      guidesResult = await admin.from("guides").select("id,title,slug,author_name,is_published,created_at");
    }
    if (guidesResult.error) return json(500, { error: guidesResult.error.message });
    const guides = (guidesResult.data ?? []) as Array<Record<string, unknown>>;

    const { data: roleRows } = await admin.from("user_roles").select("user_id,role").in("role", ["admin", "moderator"]);
    const ids = [...new Set([...guides.map((guide) => guide.created_by).filter(Boolean), ...(roleRows ?? []).map((row) => row.user_id)])] as string[];
    const users = new Map<string, { name: string; email: string | null; roles: string[] }>();
    await Promise.all(ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (!data.user) return;
      const metadata = data.user.user_metadata ?? {};
      users.set(id, { name: metadata.full_name || metadata.name || data.user.email?.split("@")[0] || "Usuário", email: data.user.email ?? null, roles: (roleRows ?? []).filter((row) => row.user_id === id).map((row) => row.role) });
    }));
    const legacyOwner = Array.from(users.entries()).find(([, account]) => account.email?.toLowerCase() === LEGACY_GUIDE_OWNER_EMAIL);

    const rankingByKey = new Map<string, Record<string, unknown>>();
    for (const row of ranking ?? []) { if (row.entity_id) rankingByKey.set(String(row.entity_id), row); if (row.slug) rankingByKey.set(String(row.slug), row); }
    const groups = new Map<string, { user_id: string | null; name: string; email: string | null; roles: string[]; guides: Array<Record<string, unknown>> }>();
    for (const guide of guides) {
      const userId = String(guide.created_by || legacyOwner?.[0] || "") || null;
      const account = userId ? users.get(userId) : null;
      const key = userId || `legacy:${guide.author_name || "unknown"}`;
      if (!groups.has(key)) groups.set(key, { user_id: userId, name: account?.name || String(guide.author_name || "Sem usuário vinculado"), email: account?.email || null, roles: account?.roles || [], guides: [] });
      const metric = rankingByKey.get(String(guide.id)) || rankingByKey.get(String(guide.slug)) || {};
      groups.get(key)!.guides.push({ id: guide.id, title: guide.title, slug: guide.slug, is_published: guide.is_published, created_at: guide.created_at, views: Number(metric.views ?? 0), opens: Number(metric.opens ?? 0), cta_clicks: Number(metric.cta_clicks ?? 0), internal_link_clicks: Number(metric.internal_link_clicks ?? 0), avg_read_seconds: Number(metric.avg_read_seconds ?? 0), avg_max_scroll: Number(metric.avg_max_scroll ?? 0) });
    }

    const authors = Array.from(groups.values()).map((author) => {
      const published = author.guides.filter((guide) => guide.is_published);
      const weight = published.reduce((sum, guide) => sum + Math.max(Number(guide.opens), 1), 0);
      return { ...author, total_guides: author.guides.length, published_guides: published.length, draft_guides: author.guides.length - published.length, views: published.reduce((sum, guide) => sum + Number(guide.views), 0), opens: published.reduce((sum, guide) => sum + Number(guide.opens), 0), cta_clicks: published.reduce((sum, guide) => sum + Number(guide.cta_clicks), 0), internal_link_clicks: published.reduce((sum, guide) => sum + Number(guide.internal_link_clicks), 0), avg_read_seconds: weight ? Math.round(published.reduce((sum, guide) => sum + Number(guide.avg_read_seconds) * Math.max(Number(guide.opens), 1), 0) / weight * 10) / 10 : 0, avg_max_scroll: weight ? Math.round(published.reduce((sum, guide) => sum + Number(guide.avg_max_scroll) * Math.max(Number(guide.opens), 1), 0) / weight * 10) / 10 : 0 };
    }).sort((a, b) => b.views - a.views || b.published_guides - a.published_guides);
    return json(200, { authors, ownership_source: ownershipSource });
  } catch (error) {
    console.error("admin-guide-author-analytics error", error);
    return json(500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});
