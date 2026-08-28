import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const fields = "id,name,description,trigger_type,trigger_config,channel,is_active,wait_days,cooldown_days,max_per_30_days,priority,email_template_id,created_at,updated_at";

function unavailable(error: unknown) {
  console.error("[reengagement] database unavailable", error);
  return NextResponse.json({ error: "A estrutura de reengajamento ainda não foi instalada no Supabase.", migrationRequired: true }, { status: 503 });
}

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;
  const db = createSupabaseAdminClient() as any;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [journeys, deliveries, templates] = await Promise.all([
    db.from("reengagement_journeys").select(fields).order("priority", { ascending: false }),
    db.from("reengagement_deliveries").select("id,journey_id,user_id,email,channel,status,reason,scheduled_at,sent_at,returned_at,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(100),
    db.from("email_templates").select("id,name,category,subject").eq("is_active", true).order("name"),
  ]);
  if (journeys.error) return unavailable(journeys.error);
  if (deliveries.error) return unavailable(deliveries.error);
  const rows = deliveries.data ?? [];
  return NextResponse.json({
    journeys: journeys.data ?? [],
    deliveries: rows,
    templates: templates.data ?? [],
    stats: {
      active: (journeys.data ?? []).filter((item: any) => item.is_active).length,
      queued: rows.filter((item: any) => item.status === "queued").length,
      sent: rows.filter((item: any) => ["sent", "opened", "clicked", "returned"].includes(item.status)).length,
      returned: rows.filter((item: any) => item.status === "returned").length,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;
  const body = await request.json();
  const db = createSupabaseAdminClient() as any;
  const payload = {
    name: String(body.name ?? "").trim(), description: String(body.description ?? "").trim() || null,
    trigger_type: body.trigger_type, trigger_config: body.trigger_config ?? {}, channel: body.channel,
    is_active: Boolean(body.is_active), wait_days: Number(body.wait_days), cooldown_days: Number(body.cooldown_days),
    max_per_30_days: Number(body.max_per_30_days), priority: Number(body.priority),
    email_template_id: body.email_template_id || null, created_by: auth.user!.id, updated_by: auth.user!.id,
  };
  if (!payload.name) return NextResponse.json({ error: "Informe o nome da jornada." }, { status: 400 });
  const result = await db.from("reengagement_journeys").insert(payload).select(fields).single();
  if (result.error) return unavailable(result.error);
  return NextResponse.json({ journey: result.data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Jornada inválida." }, { status: 400 });
  const allowed = ["name", "description", "trigger_type", "trigger_config", "channel", "is_active", "wait_days", "cooldown_days", "max_per_30_days", "priority", "email_template_id"];
  const payload: Record<string, unknown> = { updated_by: auth.user!.id, updated_at: new Date().toISOString() };
  for (const key of allowed) if (key in body) payload[key] = body[key];
  const db = createSupabaseAdminClient() as any;
  const result = await db.from("reengagement_journeys").update(payload).eq("id", body.id).select(fields).single();
  if (result.error) return unavailable(result.error);
  return NextResponse.json({ journey: result.data });
}

