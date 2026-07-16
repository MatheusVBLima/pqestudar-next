import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AiProvider = "lovable" | "openai";

type LabSettings = {
  id: number;
  provider: AiProvider;
  lovable_model: string;
  openai_model: string;
  fallback_enabled: boolean;
  max_input_chars: number;
  max_output_tokens: number;
  timeout_ms: number;
  updated_at: string;
};

type CourseInput = {
  goal?: string;
  currentArea?: string;
  education?: string;
  weeklyHours?: string;
  deadline?: string;
  institutionRules?: string;
  courseName?: string;
  providerName?: string;
  courseUrl?: string;
  workloadHours?: string;
  price?: string;
  syllabus?: string;
  certificateRequirements?: string;
  portfolioProject?: string;
};

type AiAttempt = {
  provider: AiProvider;
  model: string;
  status: number;
  duration_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  error?: string;
};

type ProviderCallResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
  attempt: AiAttempt;
};

const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const ALLOWED_MODELS: Record<AiProvider, string[]> = {
  lovable: ["google/gemini-3-flash-preview", "google/gemini-2.5-flash"],
  openai: ["gpt-5.4-mini", "gpt-5-mini"],
};

const MODEL_PRICING_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "google/gemini-3-flash-preview": { input: 0.5, output: 3 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5-mini": { input: 0.25, output: 2 },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function getModel(settings: LabSettings, provider: AiProvider) {
  const configured = provider === "lovable" ? settings.lovable_model : settings.openai_model;
  return ALLOWED_MODELS[provider].includes(configured) ? configured : ALLOWED_MODELS[provider][0];
}

function normalizeInput(raw: unknown, maxChars: number): CourseInput {
  const source = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  const normalized: CourseInput = {
    goal: asText(source.goal, 300),
    currentArea: asText(source.currentArea, 200),
    education: asText(source.education, 200),
    weeklyHours: asText(source.weeklyHours, 100),
    deadline: asText(source.deadline, 120),
    institutionRules: asText(source.institutionRules, 2500),
    courseName: asText(source.courseName, 300),
    providerName: asText(source.providerName, 200),
    courseUrl: asText(source.courseUrl, 600),
    workloadHours: asText(source.workloadHours, 100),
    price: asText(source.price, 100),
    syllabus: asText(source.syllabus, 8000),
    certificateRequirements: asText(source.certificateRequirements, 1800),
    portfolioProject: asText(source.portfolioProject, 1800),
  };

  let serialized = JSON.stringify(normalized);
  if (serialized.length <= maxChars) return normalized;

  const excess = serialized.length - maxChars;
  normalized.syllabus = normalized.syllabus?.slice(0, Math.max(500, (normalized.syllabus?.length ?? 0) - excess));
  serialized = JSON.stringify(normalized);
  if (serialized.length > maxChars) {
    normalized.institutionRules = normalized.institutionRules?.slice(0, 800);
    normalized.certificateRequirements = normalized.certificateRequirements?.slice(0, 600);
    normalized.portfolioProject = normalized.portfolioProject?.slice(0, 600);
  }
  return normalized;
}

function buildSignals(input: CourseInput) {
  return {
    has_clear_goal: Boolean(input.goal),
    has_course_name: Boolean(input.courseName),
    has_syllabus: (input.syllabus?.length ?? 0) >= 80,
    has_workload: Boolean(input.workloadHours),
    has_certificate_rules: Boolean(input.certificateRequirements),
    has_institution_rules: Boolean(input.institutionRules),
    has_portfolio_possibility: Boolean(input.portfolioProject),
    complementary_hours_requires_institution_confirmation:
      /hora|faculdade|complementar|universidade/i.test(input.goal ?? "") && !input.institutionRules,
  };
}

function buildPrompts(input: CourseInput) {
  const signals = buildSignals(input);
  const systemPrompt = `Você é o motor de análise do produto Certificado que Conta, do PqEstudar.
Avalie se um curso específico faz sentido para o objetivo informado pela pessoa.

Regras obrigatórias:
- Não invente reconhecimento, validade, aceitação institucional, empregabilidade ou garantia de resultado.
- Nunca afirme que horas complementares serão aceitas. Quando faltarem regras da instituição, marque como "requer confirmação".
- Só avalie horas complementares quando o objetivo mencionar explicitamente faculdade, universidade, graduação ou horas complementares. Nos demais casos, use "nao_se_aplica".
- Diferencie certificado, habilidade demonstrável, projeto de portfólio e horas complementares.
- Explique a recomendação com critérios observáveis e linguagem simples.
- Se faltarem dados essenciais, reduza a confiança e informe exatamente o que precisa ser confirmado.
- Não use acusações como fraude, golpe, propaganda enganosa ou publicidade enganosa. Prefira "promessa não verificável" ou "promessa não sustentada pelas informações apresentadas".
- Não recomende marcas, plataformas ou instituições específicas que não estejam nos dados informados. Descreva critérios objetivos para a pessoa encontrar alternativas.
- Não chame uma instituição de reconhecida, certificada ou confiável sem uma evidência fornecida nos dados.
- Trate notas numéricas como apoio comparativo, sem apresentá-las como garantia científica ou precisão absoluta.
- Retorne somente JSON válido, sem markdown.

Estrutura exata:
{
  "verdict": "recomendado" | "recomendado_com_ressalvas" | "nao_recomendado" | "dados_insuficientes",
  "confidence": "alta" | "media" | "baixa",
  "summary": "resumo direto em até 500 caracteres",
  "scores": {
    "objective_fit": 0,
    "curriculum_value": 0,
    "portfolio_value": 0,
    "time_feasibility": 0
  },
  "complementary_hours": {
    "status": "compativel" | "requer_confirmacao" | "nao_se_aplica" | "dados_insuficientes",
    "reason": "explicação curta"
  },
  "strengths": ["até 5 pontos"],
  "warnings": ["até 5 alertas"],
  "missing_information": ["dados que precisam ser confirmados"],
  "recommended_actions": ["até 5 próximos passos"],
  "cv_example": "exemplo responsável para currículo ou string vazia",
  "linkedin_example": "exemplo responsável para LinkedIn ou string vazia",
  "disclaimer": "a decisão final sobre aceitação de horas pertence à instituição"
}`;

  const userPrompt = `Analise os dados abaixo.

DADOS INFORMADOS:
${JSON.stringify(input, null, 2)}

SINAIS OBJETIVOS CALCULADOS PELO SISTEMA:
${JSON.stringify(signals, null, 2)}`;

  return { systemPrompt, userPrompt };
}

function getUsage(data: Record<string, unknown>) {
  const usage = data.usage && typeof data.usage === "object"
    ? data.usage as Record<string, unknown>
    : {};
  const input = Number(usage.prompt_tokens ?? usage.input_tokens);
  const output = Number(usage.completion_tokens ?? usage.output_tokens);
  const total = Number(usage.total_tokens);
  return {
    input: Number.isFinite(input) ? input : null,
    output: Number.isFinite(output) ? output : null,
    total: Number.isFinite(total) ? total : (Number.isFinite(input) && Number.isFinite(output) ? input + output : null),
  };
}

function estimateCost(model: string, inputTokens: number | null, outputTokens: number | null) {
  const pricing = MODEL_PRICING_USD_PER_MILLION[model];
  if (!pricing || inputTokens === null || outputTokens === null) return null;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

function parseModelJson(data: Record<string, unknown>) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : {};
  const message = first.message && typeof first.message === "object" ? first.message as Record<string, unknown> : {};
  const content = typeof message.content === "string" ? message.content : "";
  const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!cleaned) throw new Error("A IA não retornou conteúdo.");
  return JSON.parse(cleaned) as Record<string, unknown>;
}

async function callProvider(params: {
  provider: AiProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  timeoutMs: number;
}): Promise<ProviderCallResult> {
  const key = Deno.env.get(params.provider === "lovable" ? "LOVABLE_API_KEY" : "OPENAI_API_KEY");
  const startedAt = Date.now();
  if (!key) {
    return {
      ok: false,
      status: 500,
      data: {} as Record<string, unknown>,
      attempt: {
        provider: params.provider,
        model: params.model,
        status: 500,
        duration_ms: 0,
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        estimated_cost_usd: null,
        error: `${params.provider === "lovable" ? "LOVABLE_API_KEY" : "OPENAI_API_KEY"} não configurada`,
      } satisfies AiAttempt,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      response_format: { type: "json_object" },
    };
    if (params.provider === "lovable") body.max_tokens = params.maxOutputTokens;
    else {
      body.max_completion_tokens = params.maxOutputTokens;
      body.reasoning_effort = "low";
    }

    const response = await fetch(params.provider === "lovable" ? LOVABLE_CHAT_URL : OPENAI_CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    const usage = getUsage(data);
    const providerError = data.error && typeof data.error === "object"
      ? data.error as Record<string, unknown>
      : {};
    const message = typeof providerError.message === "string"
      ? providerError.message
      : response.ok ? undefined : `HTTP ${response.status}`;
    const attempt: AiAttempt = {
      provider: params.provider,
      model: params.model,
      status: response.status,
      duration_ms: Date.now() - startedAt,
      input_tokens: usage.input,
      output_tokens: usage.output,
      total_tokens: usage.total,
      estimated_cost_usd: estimateCost(params.model, usage.input, usage.output),
      ...(message ? { error: message.slice(0, 500) } : {}),
    };
    return { ok: response.ok, status: response.status, data, attempt };
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError"
      ? "Tempo limite excedido"
      : error instanceof Error ? error.message : "Erro de conexão";
    return {
      ok: false,
      status: 0,
      data: {} as Record<string, unknown>,
      attempt: {
        provider: params.provider,
        model: params.model,
        status: 0,
        duration_ms: Date.now() - startedAt,
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
        estimated_cost_usd: null,
        error: message,
      } satisfies AiAttempt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = createClient(supabaseUrl, serviceRoleKey);
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  try {
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Não autenticado" }, 401);

    const { data: roles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "developer"])
      .limit(1);
    if (!roles?.length) return jsonResponse({ error: "Acesso negado" }, 403);

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "getConfig";
    const { data: settingsData, error: settingsError } = await service
      .from("certificate_course_ai_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (settingsError) throw settingsError;
    const settings = settingsData as LabSettings;

    if (action === "getConfig") {
      return jsonResponse({
        settings,
        availableModels: ALLOWED_MODELS,
        secrets: {
          lovable: Boolean(Deno.env.get("LOVABLE_API_KEY")),
          openai: Boolean(Deno.env.get("OPENAI_API_KEY")),
        },
      });
    }

    if (action === "saveConfig") {
      const incoming = body.settings && typeof body.settings === "object"
        ? body.settings as Record<string, unknown>
        : {};
      const provider: AiProvider = incoming.provider === "openai" ? "openai" : "lovable";
      const lovableModel = ALLOWED_MODELS.lovable.includes(String(incoming.lovable_model))
        ? String(incoming.lovable_model)
        : settings.lovable_model;
      const openaiModel = ALLOWED_MODELS.openai.includes(String(incoming.openai_model))
        ? String(incoming.openai_model)
        : settings.openai_model;
      const update = {
        provider,
        lovable_model: lovableModel,
        openai_model: openaiModel,
        fallback_enabled: incoming.fallback_enabled === true,
        max_input_chars: clampInteger(incoming.max_input_chars, settings.max_input_chars, 2000, 30000),
        max_output_tokens: clampInteger(incoming.max_output_tokens, settings.max_output_tokens, 300, 4000),
        timeout_ms: clampInteger(incoming.timeout_ms, settings.timeout_ms, 5000, 120000),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await service
        .from("certificate_course_ai_settings")
        .update(update)
        .eq("id", 1)
        .select("*")
        .single();
      if (error) throw error;
      return jsonResponse({ settings: data });
    }

    if (action === "listRuns") {
      const limit = clampInteger(body.limit, 30, 1, 100);
      const { data, error } = await service
        .from("certificate_course_ai_runs")
        .select("id, provider_requested, provider_used, model, status, input_tokens, output_tokens, total_tokens, estimated_cost_usd, duration_ms, error_code, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const runs = data ?? [];
      const summary = runs.reduce((acc, run) => {
        acc.total += 1;
        if (run.status === "success") acc.success += 1;
        if (run.status === "limited") acc.limited += 1;
        acc.tokens += Number(run.total_tokens ?? 0);
        acc.costUsd += Number(run.estimated_cost_usd ?? 0);
        return acc;
      }, { total: 0, success: 0, limited: 0, tokens: 0, costUsd: 0 });
      return jsonResponse({ runs, summary });
    }

    if (action === "healthcheck") {
      const provider: AiProvider = body.provider === "openai" ? "openai" : "lovable";
      const response = await callProvider({
        provider,
        model: getModel(settings, provider),
        systemPrompt: "Retorne somente JSON válido.",
        userPrompt: '{"status":"responda com ok"}',
        maxOutputTokens: 50,
        timeoutMs: Math.min(settings.timeout_ms, 20000),
      });
      return jsonResponse({ ok: response.ok, attempt: response.attempt }, response.ok ? 200 : (response.status || 502));
    }

    if (action !== "analyze") return jsonResponse({ error: "Ação inválida" }, 400);

    const input = normalizeInput(body.input, settings.max_input_chars);
    if (!input.goal || !input.courseName || !input.syllabus) {
      return jsonResponse({ error: "Objetivo, nome do curso e conteúdo programático são obrigatórios." }, 400);
    }

    const { systemPrompt, userPrompt } = buildPrompts(input);
    const requestedProvider = settings.provider;
    const attempts: AiAttempt[] = [];
    const startedAt = Date.now();
    let selectedProvider = requestedProvider;
    let call = await callProvider({
      provider: selectedProvider,
      model: getModel(settings, selectedProvider),
      systemPrompt,
      userPrompt,
      maxOutputTokens: settings.max_output_tokens,
      timeoutMs: settings.timeout_ms,
    });
    attempts.push(call.attempt);

    if (!call.ok && settings.fallback_enabled && (call.status === 402 || call.status === 429)) {
      selectedProvider = selectedProvider === "lovable" ? "openai" : "lovable";
      call = await callProvider({
        provider: selectedProvider,
        model: getModel(settings, selectedProvider),
        systemPrompt,
        userPrompt,
        maxOutputTokens: settings.max_output_tokens,
        timeoutMs: settings.timeout_ms,
      });
      attempts.push(call.attempt);
    }

    let result: Record<string, unknown> | null = null;
    let parsingError = "";
    if (call.ok) {
      try {
        result = parseModelJson(call.data);
      } catch (error) {
        parsingError = error instanceof Error ? error.message : "Resposta inválida";
      }
    }

    const finalAttempt = attempts[attempts.length - 1];
    const success = call.ok && result !== null;
    const limited = !success && (call.status === 402 || call.status === 429);
    const errorMessage = success ? null : (parsingError || finalAttempt.error || "Falha ao gerar análise");
    const costUsd = attempts.reduce((sum, attempt) => sum + Number(attempt.estimated_cost_usd ?? 0), 0);
    const inputTokens = attempts.reduce((sum, attempt) => sum + Number(attempt.input_tokens ?? 0), 0) || null;
    const outputTokens = attempts.reduce((sum, attempt) => sum + Number(attempt.output_tokens ?? 0), 0) || null;
    const totalTokens = attempts.reduce((sum, attempt) => sum + Number(attempt.total_tokens ?? 0), 0) || null;

    const { data: savedRun, error: runError } = await service
      .from("certificate_course_ai_runs")
      .insert({
        admin_user_id: user.id,
        provider_requested: requestedProvider,
        provider_used: finalAttempt.provider,
        model: finalAttempt.model,
        status: success ? "success" : limited ? "limited" : "error",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: costUsd || null,
        duration_ms: Date.now() - startedAt,
        error_code: success ? null : String(call.status || "connection"),
        error_message: errorMessage,
        attempts,
        input_snapshot: input,
        result,
      })
      .select("id")
      .single();
    if (runError) console.error("Failed to save AI run", runError);

    if (!success) {
      return jsonResponse({ error: errorMessage, attempts, runId: savedRun?.id ?? null }, limited ? 429 : 502);
    }

    return jsonResponse({
      result,
      measurement: {
        runId: savedRun?.id ?? null,
        providerRequested: requestedProvider,
        providerUsed: finalAttempt.provider,
        model: finalAttempt.model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd: costUsd || null,
        durationMs: Date.now() - startedAt,
        attempts,
      },
    });
  } catch (error) {
    console.error("certificate-course-ai error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro desconhecido" }, 500);
  }
});
