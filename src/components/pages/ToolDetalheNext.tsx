"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHero } from "@/components/layout/PageHero";
import { renderHighlightedTitle } from "@/lib/highlight-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ExternalLink,
  Wrench,
  Star,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renderMarkdownContent } from "@/lib/concursos-content-renderer";
import { SaveToolButtonNext } from "@/components/ui/save-tool-button-next";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { Tool, ToolsResult } from "@/hooks/useTools";

type ToolInternalLink = NonNullable<Tool["internal_links"]>[number];

async function fetchToolBySlug(slug: string): Promise<Tool | null> {
  const { data, error } = await supabase
    .from("tools_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data as Tool | null) ?? null;
}

async function fetchRelatedTools(tool: Tool): Promise<Tool[]> {
  if (!Array.isArray(tool.tags) || tool.tags.length === 0) return [];

  const { data, error } = await supabase
    .from("tools_public")
    .select("*")
    .neq("id", tool.id)
    .overlaps("tags", tool.tags)
    .order("sort_order", { ascending: true })
    .limit(4);

  if (error) throw error;
  return (data ?? []) as Tool[];
}

// ---------- CTA Block (mesmo padrão dos guias) ----------
function CtaBlock({
  label,
  url,
  text,
}: {
  label?: string | null;
  url?: string | null;
  text?: string | null;
}) {
  if (!label || !url) return null;
  const isExternal = /^https?:\/\//.test(url);
  return (
    <div className="my-10 p-4 sm:p-6 rounded-[1.2rem] bg-primary/5 border text-center space-y-3 max-w-full overflow-hidden">
      {text && (
        <div
          className="text-sm text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>p]:mb-2"
          dangerouslySetInnerHTML={{ __html: renderMarkdownContent(text) }}
        />
      )}
      <Button
        asChild
        size="lg"
        className="w-full sm:w-auto max-w-full px-4 sm:px-8 h-auto min-h-11 py-3 whitespace-normal break-words leading-tight text-sm sm:text-base"
      >
        {isExternal ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2"
          >
            <span className="break-words">{label}</span>
            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
        ) : (
          <Link href={url} className="inline-flex items-center justify-center gap-2">
            <span className="break-words">{label}</span>
          </Link>
        )}
      </Button>
    </div>
  );
}

// ---------- Split content para inserir CTA do meio (igual aos guias) ----------
function splitContentForMiddleCta(html: string): [string, string] {
  const blockPattern = /(<\/(?:p|ul|ol|h[1-6]|blockquote|hr|table|div)>)/gi;
  const parts: { end: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(html)) !== null) {
    parts.push({ end: match.index + match[0].length });
  }
  if (parts.length < 2) return [html, ""];

  const plainText = html.replace(/<[^>]+>/g, " ");
  const totalWords = plainText.trim().split(/\s+/).length;

  if (totalWords < 120) {
    const splitIdx = Math.min(1, parts.length - 1);
    return [html.slice(0, parts[splitIdx].end), html.slice(parts[splitIdx].end)];
  }

  const midWordIndex = Math.floor(totalWords / 2);
  let wordCount = 0;
  let charPos = 0;
  const textForCounting = html.replace(/<[^>]+>/g, (tag) => " ".repeat(tag.length));
  const wordRegex = /\S+/g;
  let wm: RegExpExecArray | null;
  while ((wm = wordRegex.exec(textForCounting)) !== null) {
    wordCount++;
    if (wordCount >= midWordIndex) {
      charPos = wm.index;
      break;
    }
  }
  let bestSplit = parts[Math.floor(parts.length / 2)].end;
  for (const p of parts) {
    if (p.end >= charPos) {
      bestSplit = p.end;
      break;
    }
  }
  return [html.slice(0, bestSplit), html.slice(bestSplit)];
}

// ---------- Hero CTA (botão principal para abrir ferramenta) ----------
function ToolHeroCta({ tool }: { tool: Tool }) {
  const { track } = useAnalyticsTracker();
  if (!tool.url) return null;
  const onClick = () => {
    track({
      event_name: "tool_outbound_click",
      entity_type: "tool",
      entity_id: tool.id,
      path: `/ferramentas/${tool.slug || ""}`,
      meta: { tool_slug: tool.slug, tool_name: tool.name, source: "detail_page" },
    });
  };
  return (
    <Button asChild size="lg" className="rounded-[1.2rem]" data-evt="access_tool">
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="inline-flex items-center gap-2"
        aria-label={`Acessar ${tool.name} (abre em nova aba)`}
      >
        Acessar ferramenta
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
}

// ---------- Page ----------
export default function ToolDetalhe() {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const queryClient = useQueryClient();

  const placeholderTool = useMemo(() => {
    if (!slug) return null;
    const listQueries = queryClient.getQueriesData<ToolsResult>({ queryKey: ["tools_public"] });
    for (const [, cached] of listQueries) {
      const found = cached?.tools?.find((candidate) => candidate.slug === slug);
      if (found) return found as Tool;
    }
    return null;
  }, [queryClient, slug]);

  const toolQuery = useQuery({
    queryKey: ["tool_detail", slug],
    queryFn: async () => fetchToolBySlug(slug as string),
    enabled: !!slug,
    // Paint cached list data immediately, then fetch the full detail payload in the background.
    placeholderData: placeholderTool,
    staleTime: 5 * 60 * 1000,
  });

  const tool = toolQuery.data ?? null;
  const relatedQuery = useQuery({
    queryKey: ["tool_related", tool?.id, (tool?.tags ?? []).slice().sort().join(",")],
    queryFn: async () => fetchRelatedTools(tool as Tool),
    enabled: !!tool,
    staleTime: 5 * 60 * 1000,
  });

  const related = relatedQuery.data ?? [];
  const loading = !!slug && toolQuery.isLoading && !tool;
  const notFound = !slug || (!loading && !tool);

  if (loading) {
    return (
      <>
        <PageHero title="" description="" isLoading />
        <div className="container mx-auto px-6 pt-12 pb-16 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <div className="container mx-auto px-6 py-24 text-center">
        <Wrench className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Ferramenta não encontrada</h1>
        <p className="text-muted-foreground mb-6">
          A ferramenta que você procura não existe ou não está visível.
        </p>
        <Button onClick={() => router.push("/ferramentas")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao catálogo
        </Button>
      </div>
    );
  }

  const hasMiddleCta = !!(tool.cta_middle_label && tool.cta_middle_url);
  const fullHtml = renderMarkdownContent(tool.content_markdown || "");
  let contentFirstHalf = fullHtml;
  let contentSecondHalf = "";
  if (hasMiddleCta) {
    [contentFirstHalf, contentSecondHalf] = splitContentForMiddleCta(fullHtml);
  }

  const hasContent = !!(tool.content_markdown && tool.content_markdown.trim());

  // Split internal links between internal (/...) and external
  const allLinks = Array.isArray(tool.internal_links) ? tool.internal_links : [];
  const usefulLinks = allLinks.filter((link): link is ToolInternalLink => Boolean(link?.label && link?.url));

  const heroBadge = (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {tool.icon_url && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0 mr-2">
          <img
            src={tool.icon_url}
            alt={`Logo de ${tool.name}`}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      {(tool.tags || []).map((tag) => (
        <Badge key={tag} variant="outline" className="text-sm">
          {tag}
        </Badge>
      ))}
      {tool.is_featured && (
        <Badge
          className="bg-amber-500/10 text-amber-600 border-amber-500/20"
          variant="outline"
        >
          <Star className="h-3 w-3 mr-1" /> Destaque
        </Badge>
      )}
    </div>
  );

  return (
    <>
      {/* Hero — mesmo padrão visual dos guias */}
      {tool.cover_image_url ? (
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0">
            <img
              src={tool.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/30" />
          </div>
          <motion.div
            className="container mx-auto px-6 py-20 md:py-28 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {tool.icon_url && (
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden border border-white/20 shrink-0 mr-2">
                  <img
                    src={tool.icon_url}
                    alt={`Logo de ${tool.name}`}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              {(tool.tags || []).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-sm border-white/30 text-white bg-white/10 backdrop-blur-sm"
                >
                  {tag}
                </Badge>
              ))}
              {tool.is_featured && (
                <Badge
                  className="bg-amber-500/20 text-amber-300 border-amber-400/30 backdrop-blur-sm"
                  variant="outline"
                >
                  <Star className="h-3 w-3 mr-1" /> Destaque
                </Badge>
              )}
            </div>
            <h1 className="max-w-full md:max-w-4xl lg:max-w-[1100px] text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-lg">
              {renderHighlightedTitle(tool.name)}
            </h1>
            <p className="max-w-full md:max-w-3xl lg:max-w-[900px] text-lg md:text-xl text-white/80 leading-relaxed">
              {tool.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ToolHeroCta tool={tool} />
              <SaveToolButtonNext toolId={tool.id} toolName={tool.name} />
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="rounded-[1.2rem] text-white hover:bg-white/10"
              >
                <Link href="/ferramentas" aria-label="Voltar ao catálogo">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Catálogo
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>
      ) : (
        <PageHero title={tool.name} description={tool.description} badge={heroBadge}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <ToolHeroCta tool={tool} />
            <SaveToolButtonNext toolId={tool.id} toolName={tool.name} />
            <Button asChild variant="ghost" size="lg" className="rounded-[1.2rem]">
              <Link href="/ferramentas" aria-label="Voltar ao catálogo">
                <ArrowLeft className="h-4 w-4 mr-2" /> Catálogo
              </Link>
            </Button>
          </motion.div>
        </PageHero>
      )}

      {/* Body — mesmo layout dos guias */}
      <div className="container mx-auto px-6 pt-12 md:pt-16 pb-16">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
          <article className="flex-1 min-w-0 max-w-3xl">
            {/* CTA Top */}
            <CtaBlock
              label={tool.cta_top_label}
              url={tool.cta_top_url}
              text={tool.cta_top_text}
            />

            {hasContent ? (
              <>
                <div
                  className="guide-content guide-content-primary text-foreground/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: contentFirstHalf }}
                />
                {hasMiddleCta && (
                  <CtaBlock
                    label={tool.cta_middle_label}
                    url={tool.cta_middle_url}
                    text={tool.cta_middle_text}
                  />
                )}
                {contentSecondHalf && (
                  <div
                    className="guide-content text-foreground/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: contentSecondHalf }}
                  />
                )}
              </>
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                Conteúdo editorial completo em breve. Por enquanto, acesse a ferramenta diretamente
                pelo botão abaixo.
              </p>
            )}

            {/* CTA Final */}
            <CtaBlock
              label={tool.cta_final_label}
              url={tool.cta_final_url}
              text={tool.cta_final_text}
            />

            {/* Default closing CTA only when there's a tool URL and no custom final CTA */}
            {tool.url && !tool.cta_final_label && (
              <div className="my-10 p-6 rounded-[1.2rem] bg-primary/5 border text-center space-y-4">
                <h2 className="text-xl md:text-2xl font-bold">
                  Pronto para experimentar {tool.name}?
                </h2>
                <p className="text-sm text-muted-foreground max-w-prose mx-auto">
                  Acesse o link oficial e comece agora.
                </p>
                <div className="flex justify-center">
                  <ToolHeroCta tool={tool} />
                </div>
              </div>
            )}

            {/* Related tools */}
            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <Wrench className="h-5 w-5" /> Ferramentas relacionadas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {related.map((rt) => (
                    <Link
                      key={rt.id}
                      href={`/ferramentas/${rt.slug}`}
                      className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-[1.2rem]"
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow rounded-[1.2rem]">
                        <CardContent className="p-5 flex gap-4 items-start">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
                            {rt.icon_url ? (
                              <img
                                src={rt.icon_url}
                                alt={`Logo de ${rt.name}`}
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Wrench
                                className="w-5 h-5 text-primary"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                              {rt.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {rt.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Internal/external useful links */}
            {usefulLinks.length > 0 && (
              <section className="mt-10 pt-6 border-t border-border">
                <p className="text-sm font-bold uppercase tracking-wide text-primary mb-5">
                  Links úteis
                </p>
                <div className="space-y-5">
                  {usefulLinks.map((link, i) => {
                    const isExternal = /^https?:\/\//.test(link.url);
                    const Wrapper = isExternal ? "a" : Link;
                    const wrapperProps = isExternal
                      ? {
                          href: link.url,
                          target: "_blank",
                          rel: "noopener noreferrer",
                        }
                      : { href: link.url };
                    return (
                      <Wrapper
                        key={i}
                        {...wrapperProps}
                        className="flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                        aria-label={`Link útil: ${link.label}`}
                      >
                        <div className="w-20 h-16 sm:w-28 sm:h-20 shrink-0 rounded-md overflow-hidden flex items-center justify-center bg-primary/10">
                          {link.imageUrl ? (
                            <img
                              src={link.imageUrl}
                              alt={link.label}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <BookOpen className="h-6 w-6 text-primary/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                            {isExternal ? "Link externo" : "Link interno"}
                          </span>
                          <h3 className="text-base font-semibold leading-snug mt-0.5 group-hover:text-primary transition-colors line-clamp-2">
                            {link.label}
                          </h3>
                        </div>
                      </Wrapper>
                    );
                  })}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>
    </>
  );
}
