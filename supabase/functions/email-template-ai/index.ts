import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Não autenticado" }, 401);

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles?.length) return jsonResponse({ error: "Acesso negado" }, 403);

    const body = await req.json();
    const action = body.action === "suggest_topics" ? "suggest_topics" : "generate";
    const theme = String(body.theme || "").trim();
    const subject = String(body.subject || "");
    const preheader = String(body.preheader || "");
    const htmlBody = String(body.htmlBody || "");
    const textBody = String(body.textBody || "");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return jsonResponse({ error: "OPENAI_API_KEY não configurada" }, 500);
    const tools = Array.isArray(body.tools) ? body.tools.slice(0, 3) : [];

    if (action === "suggest_topics") {
      const clientSubjects = Array.isArray(body.previousSubjects)
        ? body.previousSubjects.map((value: unknown) => String(value)).filter(Boolean).slice(0, 150)
        : [];
      const [{ data: campaignHistory }, { data: templateHistory }] = await Promise.all([
        adminClient.from("email_campaigns").select("subject").order("created_at", { ascending: false }).limit(500),
        adminClient.from("email_templates").select("subject").order("created_at", { ascending: false }).limit(200),
      ]);
      const previousSubjects = Array.from(new Set([
        ...clientSubjects,
        ...(campaignHistory || []).map((item: { subject?: string | null }) => item.subject || ""),
        ...(templateHistory || []).map((item: { subject?: string | null }) => item.subject || ""),
      ].filter(Boolean)));
      const catalog = Array.isArray(body.catalog) ? body.catalog.slice(0, 200) : [];
      const suggestionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("EMAIL_AI_MODEL") || "gpt-4.1-mini",
          response_format: { type: "json_object" },
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: `Você planeja newsletters do PqEstudar. Sugira exatamente 6 pautas novas, úteis e específicas em português do Brasil.
Compare semanticamente com os assuntos anteriores e não repita tema, intenção ou combinação já usada, mesmo com palavras diferentes.
Baseie as ideias somente no catálogo fornecido. Para pautas com várias ferramentas, selecione recursos que tenham papéis complementares e explique essa conexão.
Retorne JSON: {"suggestions":[{"title":"...","angle":"...","tool_names":["..."]}]}. O campo angle deve ter 1 ou 2 frases prontas para serem usadas como briefing editorial.`,
            },
            {
              role: "user",
              content: JSON.stringify({ previous_subjects: previousSubjects, available_tools: catalog }),
            },
          ],
        }),
      });
      if (!suggestionResponse.ok) {
        const detail = await suggestionResponse.text();
        console.error("email-template-ai suggestions error", suggestionResponse.status, detail);
        return jsonResponse({ error: "Não foi possível sugerir novos temas" }, suggestionResponse.status === 429 ? 429 : 500);
      }
      const suggestionPayload = await suggestionResponse.json();
      const suggestionContent = suggestionPayload.choices?.[0]?.message?.content;
      const parsed = typeof suggestionContent === "string" ? JSON.parse(suggestionContent) : suggestionContent;
      return jsonResponse({ suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, 6) : [] });
    }

    if (!theme || !htmlBody) return jsonResponse({ error: "Tema e HTML são obrigatórios" }, 400);

    const toolContext = tools.length
      ? tools.map((tool: Record<string, unknown>, index: number) => ({
          position: index + 1,
          name: tool.name,
          description: tool.description,
          tags: tool.tags,
          what_is: tool.what_is,
          who_for: tool.who_for,
          how_helps: tool.how_helps,
          content_markdown: typeof tool.content_markdown === "string" ? tool.content_markdown.slice(0, 5000) : null,
          page_url: tool.page_url,
        }))
      : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("EMAIL_AI_MODEL") || "gpt-4.1-mini",
        response_format: { type: "json_object" },
        temperature: 0.55,
        messages: [
          {
            role: "system",
            content: `Você é o editor-chefe do PqEstudar. Reescreva newsletters em português do Brasil com texto premium, claro, escaneável e factual.

REGRAS OBRIGATÓRIAS:
- Analise o tema e os dados fornecidos; não invente recursos, preços, descontos, números ou promessas.
- Quando houver várias ferramentas, explique por que fazem sentido juntas, como se complementam e qual papel distinto cada uma cumpre no tema. Não produza três descrições genéricas desconectadas.
- Preserve integralmente a estrutura HTML, tags, atributos, estilos inline, URLs em href, marcadores data-* e avisos legais. Altere somente textos visíveis.
- Preserve placeholders entre colchetes que não possuam informação suficiente.
- Não use linguagem enganosa, garantias de resultado ou superlativos sem comprovação.
- Para afiliados, preserve integralmente a transparência comercial.
- Retorne somente JSON válido com: subject, preheader, html_body, text_body.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              editorial_theme: theme,
              tools: toolContext,
              current_email: {
                subject,
                preheader,
                html_body: htmlBody,
                text_body: textBody,
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("email-template-ai OpenAI error", response.status, detail);
      return jsonResponse({ error: response.status === 429 ? "Limite de IA excedido. Tente novamente em instantes." : "Não foi possível gerar o e-mail com IA" }, response.status === 429 ? 429 : 500);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    const generated = typeof content === "string" ? JSON.parse(content) : content;
    if (!generated?.subject || !generated?.preheader || !generated?.html_body || !generated?.text_body) {
      return jsonResponse({ error: "A IA retornou uma resposta incompleta" }, 502);
    }

    return jsonResponse({ generated });
  } catch (error) {
    console.error("email-template-ai error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});
