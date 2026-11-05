import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { automaticSections, diagramForSection, rankImages, type LibraryImage } from '../_shared/guide-auto-images.ts';

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
const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAiProvider(value: unknown): AiProvider {
  return value === "openai" ? "openai" : "lovable";
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
  if (response.status === 429) {
    return jsonResponse({ error: "Limite de requisicoes excedido. Tente novamente em alguns segundos." }, 429);
  }
  if (response.status === 402) {
    return jsonResponse({ error: "Creditos de IA esgotados." }, 402);
  }

  const errText = await response.text();
  console.error("AI gateway error:", response.status, errText);
  return jsonResponse({ error: "Erro ao gerar conteudo com IA", detail: errText.slice(0, 500) }, 500);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Nao autenticado" }, 401);

    const body = await req.json();
    const isToolTarget = body.targetType === "tool";

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "developer", "moderator"]);

    if (!roles || roles.length === 0) return jsonResponse({ error: "Acesso negado" }, 403);

    const roleNames = new Set(roles.map(({ role }) => role));
    const canManageTools = roleNames.has("admin") || roleNames.has("developer");
    if (isToolTarget && !canManageTools) {
      return jsonResponse({ error: "Moderadores podem gerar somente guias" }, 403);
    }

    const {
      tema,
      tipo,
      categoria,
      palavraChave,
      intencao,
      contextoAdicional,
      selectedLibrary,
      structureContext,
      libraryContext,
      editorialMeta,
      visualMode,
      aiProvider,
      textModel,
      imageModel,
    } = body;

    const selectedProvider = getAiProvider(aiProvider);
    const suggestionsOnly = !visualMode || visualMode === "suggestion";
    const automaticImages = visualMode === 'automatic';
    const shouldGenerateImages = !isToolTarget && visualMode === "generate";

    if (!tema || (!isToolTarget && !categoria)) {
      return jsonResponse({ error: "Tema e categoria sao obrigatorios" }, 400);
    }

    const hasStructure = !!structureContext?.trim();
    const hasLibrary = !!libraryContext?.trim();
    const hasImageDirective =
      isToolTarget || (hasStructure && normalize(structureContext).includes(normalize("diretriz editorial de imagens")));

    const [guidesRes, toolsRes, contestsRes] = await Promise.all([
      supabase.from("guides").select("id, title, slug, category, short_description").eq("is_published", true).limit(30),
      supabase.from("tools").select("id, name, description, url").eq("is_visible", true).limit(30),
      supabase.from("oportunidades").select("id, titulo, slug, situacao, tipo").eq("publicado", true).limit(20),
    ]);

    const existingGuides = (guidesRes.data ?? [])
      .map((g: any) => `- "${g.title}" (/guias/${g.slug}) [${g.category}]`)
      .join("\n");
    const existingTools = (toolsRes.data ?? [])
      .map((t: any) => `- "${t.name}": ${t.description?.slice(0, 80) ?? ""} (${t.url})`)
      .join("\n");
    const existingContests = (contestsRes.data ?? [])
      .map((c: any) => `- "${c.titulo}" (/concursos/${c.slug}) [${c.situacao}]`)
      .join("\n");

    const editorialParts: string[] = [];
    if (editorialMeta?.tipo) {
      editorialParts.push(`### Tipo de Guia: ${editorialMeta.tipo.label}
${editorialMeta.tipo.meaning || ""}
**Impacto na geracao:** ${editorialMeta.tipo.impact}`);
    }
    if (editorialMeta?.categoria) {
      editorialParts.push(`### Categoria: ${editorialMeta.categoria.label}
${editorialMeta.categoria.context || ""}
${editorialMeta.categoria.impact ? `**Impacto na geracao:** ${editorialMeta.categoria.impact}` : ""}`);
    }
    if (editorialMeta?.intencao) {
      editorialParts.push(`### Intencao: ${editorialMeta.intencao.label}
**Impacto na geracao:** ${editorialMeta.intencao.impact}`);
    }

    const editorialModulation = editorialParts.length > 0
      ? `\n\n## PARAMETROS EDITORIAIS DE MODULACAO
Os parametros abaixo modulam o tom, a organizacao e o foco do conteudo. Eles NAO substituem as diretrizes editoriais acima.

REGRA DE CONFLITO: Se houver conflito entre estes parametros e as diretrizes editoriais, as DIRETRIZES EDITORIAIS SEMPRE vencem.

${editorialParts.join("\n\n")}`
      : "";

    const toolEditorialInstruction = isToolTarget
      ? `\n\n## FORMATO EDITORIAL PARA PAGINA DE FERRAMENTA
Voce esta editando o corpo editorial de uma pagina de ferramenta ja existente no PqEstudar.

REGRAS DE PRESERVACAO:
- Nao altere nome/titulo da ferramenta.
- Nao altere slug.
- Nao altere descricao curta.
- Nao altere hero, logo, capa, categoria visual, destaque ou dados de catalogo.
- O foco e atualizar apenas o corpo do texto da pagina, como se estivesse editando a pagina da ferramenta escolhida.

Use este formato no content_markdown:
- Introducao curta, independente e honesta, sem repetir a hero.
- ## Como usar
- ## O que e
- ## O que da para fazer ou encontrar
- ## Para quem faz mais sentido
- ## Planos
- ## Beneficios
- ## Quando nao e a melhor opcao
- ## FAQ - Perguntas Frequentes

Regras:
- Escreva como curadoria independente, nao como propaganda.
- Aponte limites, cuidados e situacoes em que a ferramenta nao e ideal.
- Inclua a secao "## Planos" apenas se houver informacao suficiente sobre plano gratuito, pago, assinatura, acesso ou limitacoes. Se nao houver, omita essa secao.
- O FAQ deve ter de 4 a 6 perguntas objetivas.
- Nao gere links internos no texto. As relacoes de ferramentas sao feitas automaticamente pela pagina.
- CTAs podem ser null se nao houver contexto forte.
- Mesmo que o JSON tenha campos de titulo, slug, descricao ou capa, eles devem refletir os dados originais da ferramenta e nao uma nova pagina.
`
      : "";

    const imageInstruction = automaticImages
      ? `\n## IMAGENS AUTOMATICAS\nNao gere imagens, prompts visuais, URLs ou tags de imagem. Retorne image_prompts vazio. O sistema selecionara imagens aprovadas da biblioteca e montara esquemas a partir de listas numeradas ja presentes no texto. Nao crie listas apenas para obter imagens.`
      : suggestionsOnly
      ? `\n## POSICOES DE IMAGEM (PRIORIDADE SOBRE DIRETRIZES DE PROMPTS)
Nao escreva prompts visuais e nao gere imagens. Apenas sugira pontos uteis para inserir imagens.
Retorne image_prompts com prompt vazio, type internal, position after_section_N e editorial_function curta em portugues.
N comeca em 1 e conta os cards de conteudo, incluindo introducao se existir antes do primeiro H2.
Use a indicacao "Imagem aqui". Nao inclua tags img nem URLs de imagens no content_markdown.`
      : isToolTarget
      ? `\n\n## IMAGENS PARA PAGINA DE FERRAMENTA
Gere prompts de imagem para prints/areas da ferramenta. Use 3 imagens internas como padrao minimo. Pode sugerir mais se houver funcionalidades claramente diferentes.

Para cada imagem, inclua no campo "image_prompts":
- "type": "internal"
- "position": "after_section_N"
- "prompt": descreva qual print real/manual deveria entrar naquele ponto
- "alt_text": texto alternativo em portugues
- "editorial_function": por que esta imagem ajuda a leitura

Nao gere imagem de capa para ferramenta por padrao. As imagens serao preenchidas inicialmente com placeholder e trocadas manualmente por prints reais.`
      : hasImageDirective
      ? `\n\n## GERACAO DE PROMPTS VISUAIS
A diretriz editorial de imagens esta ativa. Voce DEVE gerar prompts visuais para as imagens do guia.

Para cada imagem necessaria, inclua no campo "image_prompts" do JSON:
- "type": "cover" para a imagem de capa, "internal" para imagens internas
- "position": "cover" para capa, ou "after_section_N"
- "prompt": descricao visual detalhada em ingles para geracao por IA. Deve comecar com "Wide 16:9 landscape format."
- "alt_text": texto alternativo em portugues
- "editorial_function": funcao editorial da imagem no contexto do guia

Regras:
- Proporcao obrigatoria: 16:9 landscape
- Estilo consistente: flat illustration, moderno, cores vibrantes, fundo limpo
- Nao incluir texto na imagem
- Gere entre 2 e 4 prompts no total`
      : "";

    const systemPrompt = `Voce e um editor assistente do portal PqEstudar, especializado em criar guias praticos e educativos para concurseiros.

## HIERARQUIA DE PRIORIDADE DA GERACAO
1. Diretrizes editoriais
2. Tema do guia
3. Palavra-chave
4. Tipo de guia
5. Categoria
6. Intencao
7. Contexto adicional

## DIRETRIZES EDITORIAIS
${hasStructure ? structureContext : "Nenhuma diretriz editorial fornecida."}

## BASE FACTUAL
${hasLibrary ? libraryContext : "Nenhuma biblioteca factual selecionada. Nao afirme fatos sem fonte."}
${editorialModulation}
${toolEditorialInstruction}
${imageInstruction}

## CTAs contextuais
- CTA superior: mais leve
- CTA intermediaria: relacionada ao conteudo
- CTA final: proximo passo mais util para a intencao do guia; pode orientar execucao, comparacao, validacao ou contratacao quando pertinente, sem forcar chamada comercial
- Preencha ate tres CTAs apenas quando houver proximo passo util e destino existente; use null nas posicoes sem contexto suficiente. Nao invente destinos nem exija quantidade minima.
- Botao: verbo e objeto, preferencialmente 2 a 6 palavras e ate 40 caracteres. Apoio: uma frase, preferencialmente ate 120 caracteres, explicando a utilidade sem repetir o botao. Sao recomendacoes, nao limites obrigatorios.
- O destino deve entregar o que a chamada anuncia. Evite repetir CTAs sem motivo editorial.
- URLs de CTA devem ser internas, comecando com /

## Dados reais disponiveis

### Guias existentes:
${existingGuides || "Nenhum guia publicado ainda."}

### Ferramentas disponiveis:
${existingTools || "Nenhuma ferramenta disponivel."}

### Concursos ativos:
${existingContests || "Nenhum concurso publicado."}

## Formato obrigatorio de FAQ
Use sempre o titulo: ## FAQ — Perguntas Frequentes

## Regra para titulo principal de guias
Quando o destino nao for ferramenta, o campo "title" deve sempre comecar com a primeira palavra em maiuscula. Exemplo correto: "Entender carteirinha de estudante sem complicacao". Exemplo incorreto: "entender carteirinha de estudante sem complicacao".

## Regras de output
Retorne exclusivamente um JSON valido, sem markdown code fences e sem texto fora do JSON.`;

    const imageSchema = automaticImages ? ', "image_prompts": []' : suggestionsOnly
      ? `,
  "image_prompts": [{ "type": "internal", "position": "after_section_1", "prompt": "", "alt_text": "", "editorial_function": "Imagem aqui: ilustrar o conceito desta secao" }]`
      : isToolTarget
      ? `,
  "image_prompts": [
    { "type": "internal", "position": "after_section_1", "prompt": "descricao do primeiro print real/manual da ferramenta", "alt_text": "texto alternativo em portugues", "editorial_function": "funcao editorial da imagem" },
    { "type": "internal", "position": "after_section_3", "prompt": "descricao do segundo print real/manual da ferramenta", "alt_text": "texto alternativo em portugues", "editorial_function": "funcao editorial da imagem" },
    { "type": "internal", "position": "after_section_6", "prompt": "descricao do terceiro print real/manual da ferramenta", "alt_text": "texto alternativo em portugues", "editorial_function": "funcao editorial da imagem" }
  ]`
      : hasImageDirective
      ? `,
  "image_prompts": [
    { "type": "cover", "position": "cover", "prompt": "Wide 16:9 landscape format. detailed visual description in English for AI image generation", "alt_text": "texto alternativo em portugues", "editorial_function": "funcao editorial da imagem" }
  ]`
      : `,
  "cover_image_suggestion": "descricao da imagem de capa ideal"`;

    const userPrompt = `Gere ${isToolTarget ? "uma pagina editorial de ferramenta" : "um guia completo"} com base nos seguintes inputs:

- ${isToolTarget ? "Ferramenta" : "Tema"}: ${tema}
- Tipo de guia: ${editorialMeta?.tipo?.label || tipo || "pratico"}
- Categoria: ${editorialMeta?.categoria?.label || categoria}
- Palavra-chave principal: ${palavraChave || tema}
- Intencao do conteudo: ${editorialMeta?.intencao?.label || intencao || "informar e orientar"}
${contextoAdicional ? `- Contexto adicional: ${contextoAdicional}` : ""}
${selectedLibrary ? `- Biblioteca factual: ${selectedLibrary}` : "- ATENCAO: Nenhuma biblioteca factual selecionada"}

Retorne um JSON com esta estrutura exata:
{
  "title": "${isToolTarget ? "mesmo nome exato da ferramenta recebida" : "titulo do guia"}",
  "slug": "${isToolTarget ? "mesmo slug exato da ferramenta recebida" : "slug-do-guia"}",
  "short_description": "${isToolTarget ? "mantenha a descricao curta original da ferramenta" : "descricao curta, max 160 chars"}",
  "seo_title": "titulo SEO, max 60 chars",
  "seo_description": "meta description, max 160 chars",
  "category": "${editorialMeta?.categoria?.label || categoria || "Ferramentas"}",
  "author_name": "Matheus Dias",
  "content_markdown": "conteudo completo em Markdown",
  "cta_top": { "label": "texto do botao", "url": "/caminho-interno", "text": "texto descritivo" },
  "cta_middle": { "label": "texto do botao", "url": "/caminho-interno", "text": "texto descritivo" },
  "cta_final": { "label": "texto do botao", "url": "/caminho-interno", "text": "texto descritivo" },
  "internal_links": ${isToolTarget ? "[]" : '[{ "label": "texto do link", "url": "/guias/slug" }]'}${imageSchema}
}`;

    const aiResult = await callTextAi({
      provider: selectedProvider,
      model: textModel,
      systemPrompt,
      userPrompt,
    });
    if (aiResult.error) return aiResult.error;
    if (!aiResult.response?.ok) return await handleAiError(aiResult.response!);

    const aiData = await aiResult.response.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "";

    let guideData: any;
    try {
      const cleaned = rawContent.replace(/^```json\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      guideData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      return jsonResponse({
        error: "Erro ao processar resposta da IA. Tente novamente.",
        raw: rawContent.slice(0, 1000),
      }, 500);
    }

    if (automaticImages) {
      const { data: assets, error: libraryError } = await supabase.from('guide_image_library').select('*').eq('approved', true).limit(1000);
      const library = (assets || []) as LibraryImage[];
      const selected: any[] = [];
      const used = new Set<string>();
      const usage: Record<string, number> = {};
      const { data: previous } = await supabase.from('guides').select('cover_image_url, flow_data').limit(200);
      for (const guide of previous || []) {
        for (const image of guide.flow_data?.generated_images || []) {
          if (image.library_path) usage[image.library_path] = (usage[image.library_path] || 0) + 1;
        }
      }
      const choose = (subject: string, purpose: string, position: string, type: string) => {
        const found = rankImages(library, subject, purpose, used, usage)[0];
        if (!found) return false;
        const asset = found.asset;
        const url = supabase.storage.from('guide-covers').getPublicUrl(asset.storage_path).data.publicUrl;
        selected.push({type, position, status:'success', prompt:'', url, alt_text:asset.description, editorial_function:asset.description, source_kind:'library', library_path:asset.storage_path, source:asset.source, license:asset.license});
        used.add(asset.storage_path);
        if (type === 'cover') guideData.cover_image_url = url;
        return true;
      };
      guideData.cover_image_url = '';
      guideData.cover_image_suggestion = '';
      if (!isToolTarget && !choose(`${tema} ${palavraChave || ''} ${guideData.title || ''}`, 'cover', 'cover', 'cover')) {
        selected.push({type:'cover', position:'cover', status:'suggestion', prompt:'', alt_text:'', editorial_function:'Selecione uma capa: nenhuma imagem aprovada com correspondencia suficiente.', source_kind:'automatic'});
      }
      let placed = 0;
      for (const section of automaticSections(guideData.content_markdown || '')) {
        if (placed >= 2 || !section.heading || /faq|perguntas frequentes/i.test(section.title)) continue;
        const svg = diagramForSection(section.content, section.title);
        const purpose = svg ? 'steps' : /compar|diferenc|versus/i.test(normalize(section.title)) ? 'comparison' : 'explanation';
        if (choose(section.title, purpose, section.position, 'internal')) { placed++; continue; }
        if (svg) {
          const file = `${user.id}/${crypto.randomUUID()}.svg`;
          const { error } = await supabase.storage.from('guide-diagrams').upload(file, new TextEncoder().encode(svg), {contentType:'image/svg+xml', upsert:false});
          if (!error) {
            selected.push({type:'internal',position:section.position,status:'success',prompt:'',url:supabase.storage.from('guide-diagrams').getPublicUrl(file).data.publicUrl,alt_text:`Esquema ilustrativo: ${section.title}`,editorial_function:'Resumo dos passos desta secao. Confira as orientacoes completas no texto.',source_kind:'diagram'});
            placed++; continue;
          }
        }
        // One unresolved position is enough; do not fill every section with placeholders.
        if (!selected.some(i => i.type === 'internal' && i.status === 'suggestion')) selected.push({type:'internal',position:section.position,status:'suggestion',prompt:'',alt_text:'',editorial_function:libraryError ? 'Biblioteca indisponivel. Revise a imagem desta secao.' : 'Sem imagem adequada. Opcional: selecionar na biblioteca ou remover.',source_kind:'automatic'});
      }
      guideData.image_prompts = selected;
      guideData.generated_images = selected;
    }
    if (suggestionsOnly) {
      const suggestions = Array.isArray(guideData.image_prompts) && guideData.image_prompts.length
        ? guideData.image_prompts
        : [{ type: "internal", position: "after_section_1", editorial_function: "Imagem aqui" }];
      guideData.image_prompts = suggestions.map((item: any) => ({
        type: item.type === "cover" ? "cover" : "internal",
        position: item.type === "cover" ? "cover" : /^after_section_[1-9]\d*$/.test(item.position) ? item.position : "after_section_1",
        prompt: "",
        alt_text: "",
        editorial_function: item.editorial_function || "Imagem aqui",
        status: "suggestion",
      }));
      guideData.cover_image_url = "";
      guideData.cover_image_suggestion = "";
    }
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (guideData.image_prompts && Array.isArray(guideData.image_prompts) && guideData.image_prompts.length > 0 && shouldGenerateImages) {
      const generatedImages: any[] = [];

      if (!lovableKey) {
        generatedImages.push(
          ...guideData.image_prompts.map((imgPrompt: any) => ({
            ...imgPrompt,
            status: "error",
            error: "LOVABLE_API_KEY nao configurada para gerar imagens",
          })),
        );
      } else {
        for (const imgPrompt of guideData.image_prompts) {
          let visualPrompt = imgPrompt.prompt || "";
          if (!visualPrompt.toLowerCase().includes("16:9") && !visualPrompt.toLowerCase().includes("landscape")) {
            visualPrompt = `Wide 16:9 landscape format. ${visualPrompt}`;
          }

          const nodeBase = {
            type: imgPrompt.type,
            position: imgPrompt.position,
            prompt: visualPrompt,
            alt_text: imgPrompt.alt_text || "",
            editorial_function: imgPrompt.editorial_function || "",
          };

          try {
            const imgResponse = await fetch(LOVABLE_CHAT_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: imageModel || DEFAULT_IMAGE_MODEL,
                messages: [{ role: "user", content: `${visualPrompt}\n\nIMPORTANT: The image MUST be in 16:9 widescreen landscape aspect ratio.` }],
                modalities: ["image", "text"],
              }),
            });

            if (!imgResponse.ok) {
              generatedImages.push({ ...nodeBase, status: "error", error: `HTTP ${imgResponse.status}` });
              continue;
            }

            const imgData = await imgResponse.json();
            const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (!base64Url) {
              generatedImages.push({ ...nodeBase, status: "error", error: "No image data returned" });
              continue;
            }

            const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const slug = guideData.slug || "guide";
            const fileName = imgPrompt.type === "cover"
              ? `${slug}-cover-${Date.now()}.png`
              : `${slug}-${imgPrompt.position}-${Date.now()}.png`;

            const { error: uploadErr } = await supabase.storage
              .from("guide-covers")
              .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

            if (uploadErr) {
              generatedImages.push({ ...nodeBase, status: "error", error: `Upload failed: ${uploadErr.message}` });
              continue;
            }

            const { data: publicUrlData } = supabase.storage.from("guide-covers").getPublicUrl(fileName);
            generatedImages.push({ ...nodeBase, status: "success", url: publicUrlData.publicUrl, storage_path: fileName });

            if (imgPrompt.type === "cover" && publicUrlData.publicUrl) {
              guideData.cover_image_url = publicUrlData.publicUrl;
            }
          } catch (imgErr) {
            generatedImages.push({
              ...nodeBase,
              status: "error",
              error: imgErr instanceof Error ? imgErr.message : "Unknown error",
            });
          }
        }
      }

      guideData.generated_images = generatedImages;
    } else if (!automaticImages && guideData.image_prompts && Array.isArray(guideData.image_prompts) && guideData.image_prompts.length > 0 && !shouldGenerateImages) {
      guideData.generated_images = guideData.image_prompts.map((imgPrompt: any) => ({
        type: imgPrompt.type,
        position: imgPrompt.position,
        prompt: imgPrompt.prompt || "",
        alt_text: imgPrompt.alt_text || "",
        editorial_function: imgPrompt.editorial_function || "",
        status: suggestionsOnly ? "suggestion" : "prompt_only",
      }));
    }

    guideData._sources = {
      has_structure: hasStructure,
      has_library: hasLibrary,
      has_image_directive: hasImageDirective,
      library_name: selectedLibrary || null,
      editorial_meta: editorialMeta || null,
      ai_provider: selectedProvider,
      text_model: aiResult.model,
      image_model: imageModel || DEFAULT_IMAGE_MODEL,
    };

    return jsonResponse(guideData);
  } catch (e) {
    console.error("guide-flow-generate error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
