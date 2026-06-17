import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AiProvider = "lovable" | "openai";

const TEXT_MODEL_DEFAULTS: Record<AiProvider, string> = {
  lovable: "google/gemini-3-flash-preview",
  openai: "gpt-4.1",
};

const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAiProvider(value: unknown): AiProvider {
  return value === "openai" ? "openai" : "lovable";
}

function bucketForCategory(category: string) {
  return ["editorial", "tom", "cta", "seo", "estrutura"].includes(category)
    ? "guide-structure"
    : "guide-library";
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|section|article|header|footer|li|h1|h2|h3|h4|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pageTitleOf(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 120) : "";
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

async function callTextAi(params: {
  provider: AiProvider;
  model?: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const model = params.model || TEXT_MODEL_DEFAULTS[params.provider];

  if (params.provider === "openai") {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return { error: jsonResponse({ error: "OPENAI_API_KEY nao configurada" }, 500) };
    }

    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    return { response, model };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    return { error: jsonResponse({ error: "LOVABLE_API_KEY nao configurada" }, 500) };
  }

  const response = await fetch(LOVABLE_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    }),
  });

  return { response, model };
}

async function handleAiError(response: Response) {
  const detail = await response.text();
  console.error("AI gateway error:", response.status, detail);
  return jsonResponse({ error: "Erro ao analisar site com IA", detail: detail.slice(0, 500) }, 500);
}

const SITE_ANALYSIS_TEMPLATE = `# Template de análise de site

## 1. Identificação
**Nome do site:**  
**URL principal:**  
**Instituição responsável:**  
**Tipo de organização:**  
**Categoria:**  
**Idioma/país:**  

## 2. Resumo estratégico
**O que é em 1 frase:**  
**O que resolve na prática:**  
**Para quem serve:**  
**Para quem não serve:**  
**Quando vale indicar:**  
**Quando não vale indicar:**  

## 3. Oferta real
**O que oferece exatamente:**  
**Modalidades disponíveis:**  
**É gratuito, pago ou freemium:**  
**Tem certificado?:**  
**O certificado vale para quê, segundo a fonte?:**  
**Tem mensalidade?:**  
**Há algum custo possível?:**  
**Tem app, site ou ambos?:**  
**Exige cadastro?:**  
**Forma de login:**  
**Exige processo seletivo, edital ou aprovação?:**  

## 4. Categorias de cursos presentes no site
**Categorias visíveis no site:**  
**Subcategorias, se houver:**  
**Temas, componentes, áreas ou trilhas, se houver:**  

## 5. Regras e critérios importantes
**Quem pode acessar:**  
**Pré-requisitos:**  
**Limites de idade, escolaridade ou perfil:**  
**Como funciona a entrada:**  
**Como funciona a aprovação:**  
**O que muda conforme o tipo de curso:**  
**Restrições importantes:**  

## 6. Estrutura e recursos da plataforma
**Recursos públicos visíveis:**  
**Indicadores públicos mostrados na home:**  
**Exemplos de cursos destacados:**  
**Formato dos cursos:**  
**Ferramentas e funcionalidades relevantes:**  
**Compatibilidade, apps ou recursos extras:**  

## 7. Provas por fonte
**Fato confirmado:**  
**Fonte:**  
**Nível de confiança:**  

## 8. Dúvidas que o site responde
**Pergunta:**  
**Resposta:**  

## 9. Dúvidas que o site não responde bem
**Pergunta:**  
**Por que não responde bem:**  
**O que precisa verificar fora dali:**  

## 10. Riscos de interpretação errada
**Risco:**  

## 11. Mapa editorial
**Tema:**  

## 12. SEO e busca
**Palavra-chave principal:**  
**Palavras-chave secundárias:**  
**Termos adicionais úteis:**  
**Intenção de busca predominante:**  

## 13. Bloco de respostas prontas
**Resposta curta para comentário:**  
**Resposta média para direct/chat:**  
**Resposta longa para roteiro/artigo:**  

## 14. Conteúdo proibido de inventar
**Item:**  

## 15. Status de verificação
**Páginas analisadas:**  
**O que foi confirmado:**  
**O que ainda falta confirmar:**  
**Última revisão:**  

## O que deixei em branco
-`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Nao autenticado" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) return jsonResponse({ error: "Acesso negado" }, 403);

    const body = await req.json();
    const action = body.action;

    if (action === "list") {
      const { data, error } = await supabase
        .from("guide_flow_knowledge")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse(data ?? []);
    }

    if (action === "create") {
      const category = body.category || "geral";
      const { data, error } = await supabase
        .from("guide_flow_knowledge")
        .insert({
          title: body.title,
          content: body.content,
          category,
          is_active: body.is_active ?? true,
          sort_order: body.sort_order ?? 0,
          source_type: "manual",
          source_bucket: bucketForCategory(category),
          source_path: null,
          extraction_status: "not_applicable",
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse(data);
    }

    if (action === "update") {
      const { id, ...updates } = body;
      delete updates.action;
      const { data, error } = await supabase
        .from("guide_flow_knowledge")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse(data);
    }

    if (action === "delete") {
      const { error } = await supabase.from("guide_flow_knowledge").delete().eq("id", body.id);
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    if (action === "sync") {
      const buckets = ["guide-structure", "guide-library"];
      const details: Array<{ bucket: string; file: string; status: string; extraction_status?: string; error?: string }> = [];
      let totalFound = 0;
      let totalCreated = 0;
      let totalExisting = 0;
      let totalExtracted = 0;
      let totalErrors = 0;

      for (const bucket of buckets) {
        const { data: files, error: listError } = await supabase.storage.from(bucket).list("", { limit: 1000 });
        if (listError) {
          totalErrors += 1;
          details.push({ bucket, file: "", status: "error", error: listError.message });
          continue;
        }

        for (const file of files ?? []) {
          if (!file.name || file.name.startsWith(".")) continue;
          totalFound += 1;

          const { data: existing } = await supabase
            .from("guide_flow_knowledge")
            .select("id")
            .eq("source_bucket", bucket)
            .eq("source_path", file.name)
            .maybeSingle();

          if (existing) {
            totalExisting += 1;
            details.push({ bucket, file: file.name, status: "existing" });
            continue;
          }

          let content = "";
          let extractionStatus = "pending";
          const extension = file.name.split(".").pop()?.toLowerCase();

          if (extension && ["txt", "md", "markdown", "json", "html", "htm"].includes(extension)) {
            const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(file.name);
            if (downloadError) {
              totalErrors += 1;
              details.push({ bucket, file: file.name, status: "error", error: downloadError.message });
              continue;
            }
            content = extension === "html" || extension === "htm"
              ? stripHtml(await blob.text())
              : await blob.text();
            extractionStatus = content.trim() ? "success" : "no_text";
            if (extractionStatus === "success") totalExtracted += 1;
          } else {
            content = `Arquivo sincronizado do Storage: ${file.name}. Extração automática de texto não disponível neste tipo de arquivo.`;
            extractionStatus = "pending";
          }

          const category = bucket === "guide-structure" ? "editorial" : "referencia";
          const { error: insertError } = await supabase.from("guide_flow_knowledge").insert({
            title: file.name.replace(/\.[^.]+$/, ""),
            content,
            category,
            is_active: extractionStatus === "success",
            sort_order: 0,
            source_type: "storage",
            source_bucket: bucket,
            source_path: file.name,
            synced_at: new Date().toISOString(),
            extraction_status: extractionStatus,
            created_by: user.id,
          });

          if (insertError) {
            totalErrors += 1;
            details.push({ bucket, file: file.name, status: "error", error: insertError.message });
          } else {
            totalCreated += 1;
            details.push({ bucket, file: file.name, status: "created", extraction_status: extractionStatus });
          }
        }
      }

      return jsonResponse({ totalFound, totalCreated, totalExisting, totalExtracted, totalErrors, details });
    }

    if (action === "analyze-url") {
      const url = String(body.url || "").trim();
      if (!url) return jsonResponse({ error: "URL obrigatoria" }, 400);

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return jsonResponse({ error: "URL invalida" }, 400);
      }

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return jsonResponse({ error: "Use uma URL http ou https" }, 400);
      }

      const siteResponse = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent": "PqEstudarBot/1.0 (+https://pqestudar.com.br)",
          "Accept": "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8",
        },
      });

      if (!siteResponse.ok) {
        return jsonResponse({ error: `Nao foi possivel acessar o site. HTTP ${siteResponse.status}` }, 502);
      }

      const html = await siteResponse.text();
      const pageTitle = pageTitleOf(html);
      const extractedText = stripHtml(html).slice(0, 45000);

      if (!extractedText || extractedText.length < 200) {
        return jsonResponse({ error: "Nao foi possivel extrair texto suficiente deste link" }, 422);
      }

      const selectedProvider = getAiProvider(body.aiProvider);
      const today = new Date().toISOString().slice(0, 10);

      const systemPrompt = `Voce e um analista factual do PqEstudar. Sua tarefa e analisar sites e transformar o que esta visivel em uma base factual para a Biblioteca de Conhecimento.

Regras obrigatorias:
- Nao preencher lacuna com suposicao.
- Quando faltar prova, escrever claramente que nao foi confirmado.
- Separar fato confirmado de inferencia.
- Nunca generalizar certificado, horas complementares, concurso, curriculo ou aceitacao institucional sem fonte explicita.
- Sempre dizer quando a regra muda conforme curso, oferta, edital, instituicao ou perfil do usuario.
- Preferir linguagem direta, curta e pratica.
- Usar exemplos concretos do site sempre que possivel.
- Em "Provas por fonte", registrar apenas fatos realmente observados.
- Em "Duvidas que o site nao responde bem", colocar justamente os pontos que mais geram erro de interpretacao.
- Em "Conteudo proibido de inventar", listar tudo o que seria tentador afirmar sem base.
- Se a informacao nao estiver clara no site analisado, no FAQ, na pagina do curso, no suporte, no documento oficial ou no print enviado, nao afirmar como fato.

Retorne exclusivamente JSON valido, sem markdown code fences.`;

      const userPrompt = `Analise o site abaixo e preencha o template em Markdown.

URL analisada: ${parsedUrl.toString()}
Titulo detectado: ${pageTitle || "nao detectado"}
Ultima revisao: ${today}
Orientacao adicional do editor: ${body.notes || "nenhuma"}

Template obrigatorio:
${SITE_ANALYSIS_TEMPLATE}

Texto extraido da pagina:
${extractedText}

Organizacao obrigatoria do Markdown:
- O conteudo deve comecar com "# Nome da ferramenta/site", nao com "# Template de analise de site".
- Mantenha as secoes numeradas do template.
- Use listas em Markdown quando houver varios itens.
- Mantenha campos nao confirmados como "Nao confirmado no site analisado".
- O nome final da entrada no sistema sera "Contexto + nome da ferramenta".

Retorne este JSON:
{
  "tool_name": "nome curto da ferramenta ou site",
  "title": "Contexto nome curto da ferramenta ou site",
  "category": "referencia",
  "content": "template completo preenchido em Markdown"
}`;

      const aiResult = await callTextAi({
        provider: selectedProvider,
        model: body.textModel,
        systemPrompt,
        userPrompt,
      });
      if (aiResult.error) return aiResult.error;
      if (!aiResult.response?.ok) return await handleAiError(aiResult.response!);

      const aiData = await aiResult.response.json();
      const rawContent = aiData.choices?.[0]?.message?.content ?? "";

      try {
        const cleaned = rawContent.replace(/^```json\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
        const result = JSON.parse(cleaned);
        const toolName = String(result.tool_name || pageTitle || parsedUrl.hostname).trim();
        const title = `Contexto ${toolName}`.replace(/\s+/g, " ").trim();
        const content = String(result.content || "").trim();

        if (!content) return jsonResponse({ error: "A IA nao retornou conteudo para salvar" }, 500);

        const contentWithHeading = /^#\s+/m.test(content)
          ? content
          : `# ${toolName}\n\n${content}`;
        const fileName = `${sanitizeFileName(title)}.txt`;
        const now = new Date().toISOString();
        const blob = new Blob([contentWithHeading], { type: "text/plain;charset=utf-8" });

        const { error: uploadError } = await supabase.storage
          .from("guide-library")
          .upload(fileName, blob, { contentType: "text/plain;charset=utf-8", upsert: true });

        if (uploadError) return jsonResponse({ error: uploadError.message }, 500);

        const existing = await supabase
          .from("guide_flow_knowledge")
          .select("id")
          .eq("source_bucket", "guide-library")
          .eq("source_path", fileName)
          .maybeSingle();

        const payload = {
          title,
          content: contentWithHeading,
          category: "referencia",
          is_active: true,
          sort_order: 0,
          source_type: "storage",
          source_bucket: "guide-library",
          source_path: fileName,
          synced_at: now,
          extraction_status: "success",
          created_by: user.id,
          updated_at: now,
        };

        const dbResult = existing.data
          ? await supabase
            .from("guide_flow_knowledge")
            .update(payload)
            .eq("id", existing.data.id)
            .select("*")
            .single()
          : await supabase
            .from("guide_flow_knowledge")
            .insert(payload)
            .select("*")
            .single();

        if (dbResult.error) return jsonResponse({ error: dbResult.error.message }, 500);

        return jsonResponse({
          title,
          category: "referencia",
          content: contentWithHeading,
          source_path: fileName,
        });
      } catch {
        console.error("Failed to parse AI response:", rawContent.slice(0, 500));
        return jsonResponse({ error: "Erro ao processar resposta da IA", raw: rawContent.slice(0, 1000) }, 500);
      }
    }

    return jsonResponse({ error: "Acao invalida" }, 400);
  } catch (error) {
    console.error("guide-flow-knowledge error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
