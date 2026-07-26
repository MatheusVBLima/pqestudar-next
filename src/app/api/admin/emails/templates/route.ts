import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

type SaveTemplateBody = {
  id?: string | null;
  name?: string;
  description?: string | null;
  category?: string;
  subject?: string;
  preheader?: string | null;
  htmlBody?: string;
  textBody?: string | null;
};

function normalizeText(value?: string | null) {
  return value?.trim() || null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as SaveTemplateBody;
  const name = normalizeText(body.name);
  const subject = normalizeText(body.subject);
  const htmlBody = normalizeText(body.htmlBody);

  if (!name || !subject || !htmlBody) {
    return NextResponse.json(
      { error: "Nome, assunto e HTML do modelo são obrigatórios." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    name,
    description: normalizeText(body.description),
    category: normalizeText(body.category) || "newsletter",
    subject,
    preheader: normalizeText(body.preheader),
    html_body: htmlBody,
    text_body: normalizeText(body.textBody),
    is_active: true,
    updated_by: auth.user?.id,
    updated_at: new Date().toISOString(),
  };

  const query = body.id
    ? admin
        .from("email_templates")
        .update(payload)
        .eq("id", body.id)
        .select("id, name, description, category, subject, preheader, html_body, text_body, created_at")
        .single()
    : admin
        .from("email_templates")
        .insert({
          ...payload,
          created_by: auth.user?.id,
        })
        .select("id, name, description, category, subject, preheader, html_body, text_body, created_at")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    console.error("[emails] Failed to save template", error);
    return NextResponse.json({ error: "Não foi possível salvar o modelo." }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;

  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "ID do modelo é obrigatório." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("email_templates")
    .update({
      is_active: false,
      updated_by: auth.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[emails] Failed to delete template", error);
    return NextResponse.json({ error: "Não foi possível remover o modelo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
