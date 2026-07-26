import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminApi } from "@/lib/admin-api";

export const runtime = "nodejs";

const MAX_SELECTED_RECIPIENTS = 25;

type SendEmailBody = {
  mode?: "test" | "selected";
  testEmail?: string;
  recipients?: Array<{
    email?: string;
    name?: string | null;
    userId?: string | null;
    source?: string;
  }>;
  campaign?: {
    name?: string;
    campaignType?: string;
    subject?: string;
    preheader?: string;
    htmlBody?: string;
    textBody?: string;
    audienceFilter?: Record<string, unknown>;
  };
};

type ResendEmailResponse = {
  id?: string;
  name?: string;
  message?: string;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHtmlWithFooter(html: string, preheader?: string) {
  const safePreheader = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>`
    : "";

  return `${safePreheader}
${html}
<div style="max-width:640px;margin:24px auto 0;padding-top:16px;border-top:1px solid #e5e7eb;font-family:Arial,sans-serif;color:#6b7280;font-size:12px;line-height:1.5">
  <p>Você recebeu este e-mail porque se cadastrou ou possui conta no PqEstudar.</p>
  <p>Se não quiser receber comunicações de marketing, responda este e-mail solicitando descadastro. O link automático de descadastro entra na próxima etapa.</p>
</div>`;
}

async function sendWithResend({
  apiKey,
  from,
  replyTo,
  to,
  subject,
  html,
  text,
}: {
  apiKey: string;
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      reply_to: replyTo || undefined,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as ResendEmailResponse;
  return { response, data };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json(
      { error: "Configure RESEND_API_KEY e RESEND_FROM_EMAIL no ambiente antes de enviar." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as SendEmailBody;
  const mode = body.mode || "test";
  const campaign = body.campaign || {};
  const subject = campaign.subject?.trim();
  const htmlBody = campaign.htmlBody?.trim();

  if (!subject || !htmlBody) {
    return NextResponse.json({ error: "Assunto e conteúdo HTML são obrigatórios." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const recipients =
    mode === "test"
      ? [{ email: normalizeEmail(body.testEmail), name: "Teste", userId: null, source: "test" }]
      : (body.recipients || []).map((recipient) => ({
          email: normalizeEmail(recipient.email),
          name: recipient.name || null,
          userId: recipient.userId || null,
          source: recipient.source || "selected",
        }));

  const validRecipients = recipients.filter((recipient) => isEmail(recipient.email));

  if (validRecipients.length === 0) {
    return NextResponse.json({ error: "Nenhum destinatário válido." }, { status: 400 });
  }

  if (mode === "selected" && validRecipients.length > MAX_SELECTED_RECIPIENTS) {
    return NextResponse.json(
      { error: `Limite inicial de ${MAX_SELECTED_RECIPIENTS} destinatários por envio.` },
      { status: 400 },
    );
  }

  const { data: unsubscribes } = await admin
    .from("email_unsubscribes")
    .select("email")
    .in(
      "email",
      validRecipients.map((recipient) => recipient.email),
    );

  const blocked = new Set((unsubscribes || []).map((row) => normalizeEmail(row.email)));
  const allowedRecipients =
    mode === "test" ? validRecipients : validRecipients.filter((recipient) => !blocked.has(recipient.email));

  if (allowedRecipients.length === 0) {
    return NextResponse.json({ error: "Todos os destinatários selecionados estão descadastrados." }, { status: 400 });
  }

  const { data: campaignRow, error: campaignError } = await admin
    .from("email_campaigns")
    .insert({
      name: campaign.name?.trim() || subject,
      campaign_type: campaign.campaignType || "newsletter",
      status: mode === "test" ? "test_sent" : "sending",
      subject,
      preheader: campaign.preheader || null,
      html_body: htmlBody,
      text_body: campaign.textBody || null,
      audience_filter: campaign.audienceFilter || {},
      total_recipients: allowedRecipients.length,
      created_by: auth.user?.id,
      sent_by: auth.user?.id,
    })
    .select("id")
    .single();

  if (campaignError || !campaignRow?.id) {
    console.error("[emails] Failed to create campaign", campaignError);
    return NextResponse.json({ error: "Não foi possível criar a campanha." }, { status: 500 });
  }

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  for (const recipient of allowedRecipients) {
    const { data: recipientRow } = await admin
      .from("email_campaign_recipients")
      .insert({
        campaign_id: campaignRow.id,
        email: recipient.email,
        name: recipient.name,
        user_id: recipient.userId,
        contact_source: recipient.source,
        recipient_type: mode,
        status: "pending",
      })
      .select("id")
      .single();

    const result = await sendWithResend({
      apiKey: resendApiKey,
      from: fromEmail,
      replyTo,
      to: recipient.email,
      subject,
      html: buildHtmlWithFooter(htmlBody, campaign.preheader),
      text: campaign.textBody,
    });

    if (result.response.ok && result.data.id) {
      sentCount += 1;
      await admin
        .from("email_campaign_recipients")
        .update({
          status: "sent",
          resend_email_id: result.data.id,
          sent_at: new Date().toISOString(),
        })
        .eq("id", recipientRow?.id);
    } else {
      failedCount += 1;
      lastError = result.data.message || result.data.name || `Erro ${result.response.status}`;
      await admin
        .from("email_campaign_recipients")
        .update({
          status: "failed",
          error: lastError,
        })
        .eq("id", recipientRow?.id);
    }
  }

  await admin
    .from("email_campaigns")
    .update({
      status: failedCount > 0 && sentCount === 0 ? "failed" : mode === "test" ? "test_sent" : "sent",
      sent_count: sentCount,
      failed_count: failedCount,
      last_error: lastError,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignRow.id);

  return NextResponse.json({
    campaignId: campaignRow.id,
    sentCount,
    failedCount,
    skippedUnsubscribed: validRecipients.length - allowedRecipients.length,
    lastError,
  });
}
