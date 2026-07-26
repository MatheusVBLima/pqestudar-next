import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;

  let admin: ReturnType<typeof createSupabaseAdminClient>;

  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    console.error("[emails] Supabase admin client unavailable", error);
    return NextResponse.json(
      {
        error:
          "A Central de E-mails precisa da variável SUPABASE_SERVICE_ROLE_KEY no ambiente para carregar os dados.",
      },
      { status: 500 },
    );
  }

  const [{ data: templates, error: templatesError }, { data: campaigns, error: campaignsError }] = await Promise.all([
    admin
      .from("email_templates")
      .select("id, name, description, category, subject, preheader, html_body, text_body, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("email_campaigns")
      .select("id, name, campaign_type, status, subject, total_recipients, sent_count, failed_count, last_error, created_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (templatesError) {
    console.error("[emails] Failed to load templates", templatesError);
  }

  if (campaignsError) {
    console.error("[emails] Failed to load campaigns", campaignsError);
  }

  return NextResponse.json({
    config: {
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      fromEmail: process.env.RESEND_FROM_EMAIL || null,
      replyTo: process.env.RESEND_REPLY_TO || null,
      maxSelectedRecipients: 25,
    },
    templates: templates || [],
    campaigns: campaigns || [],
  });
}
