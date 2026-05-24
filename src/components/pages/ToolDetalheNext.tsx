"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHero } from "@/components/layout/PageHero";
import { renderHighlightedTitle } from "@/lib/highlight-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ExternalLink,
  Wrench,
  Star,
  MessageCircle,
  Share2,
  Facebook,
  HelpCircle,
  LogIn,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { splitMarkdownAtMiddle } from "@/lib/split-markdown";
import { SaveToolButtonNext } from "@/components/ui/save-tool-button-next";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { Tool, ToolsResult } from "@/hooks/useTools";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const { data: relations, error: relationsError } = await supabase
    .from("tool_related_tools")
    .select("related_tool_id")
    .eq("tool_id", tool.id)
    .limit(10);

  if (relationsError) throw relationsError;

  const relatedIds = (relations ?? [])
    .map((relation) => relation.related_tool_id)
    .filter(Boolean);

  if (relatedIds.length > 0) {
    const { data, error } = await supabase
      .from("tools_public")
      .select("*")
      .in("id", relatedIds);

    if (error) throw error;

    const byId = new Map(((data ?? []) as Tool[]).map((item) => [item.id, item]));
    return relatedIds
      .map((id) => byId.get(id))
      .filter((item): item is Tool => Boolean(item));
  }

  if (!Array.isArray(tool.tags) || tool.tags.length === 0) return [];

  const { data, error } = await supabase
    .from("tools_public")
    .select("*")
    .neq("id", tool.id)
    .overlaps("tags", tool.tags)
    .order("sort_order", { ascending: true })
    .limit(10);

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
        <MarkdownContent
          variant="prose"
          className="text-sm text-muted-foreground leading-relaxed max-w-none"
        >
          {text}
        </MarkdownContent>
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

const normalizeTag = (tag: string) =>
  tag
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const sharedTagCount = (a: string[] = [], b: string[] = []) => {
  const normalizedB = new Set(b.map(normalizeTag));
  return a.reduce((count, tag) => count + (normalizedB.has(normalizeTag(tag)) ? 1 : 0), 0);
};

function rankToolsForContext(current: Tool, candidates: Tool[]) {
  const currentTags = current.tags ?? [];
  const primaryTag = currentTags[0] ? normalizeTag(currentTags[0]) : null;

  return [...candidates]
    .map((candidate) => {
      const candidateTags = candidate.tags ?? [];
      const shared = sharedTagCount(currentTags, candidateTags);
      const primaryMatch =
        primaryTag && candidateTags.some((tag) => normalizeTag(tag) === primaryTag) ? 1 : 0;
      const featuredBoost = candidate.is_featured ? 1 : 0;

      return {
        candidate,
        score: shared * 10 + primaryMatch * 8 + featuredBoost,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.candidate.sort_order ?? 9999) - (b.candidate.sort_order ?? 9999);
    })
    .map(({ candidate }) => candidate);
}

async function fetchAudienceTools(tool: Tool): Promise<Tool[]> {
  const tags = tool.tags ?? [];

  let query = supabase
    .from("tools_public")
    .select("*")
    .neq("id", tool.id);

  if (tags.length > 0) {
    query = query.overlaps("tags", tags);
  }

  const { data, error } = await query
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(12);

  if (error) throw error;

  const candidates = rankToolsForContext(tool, (data ?? []) as Tool[]);
  const pathsById = new Map(
    candidates
      .filter((candidate) => Boolean(candidate.slug))
      .map((candidate) => [candidate.id, `/ferramentas/${candidate.slug}`]),
  );
  const paths = Array.from(pathsById.values());

  if (paths.length === 0) return candidates.slice(0, 5);

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data: views, error: viewsError } = await supabase
    .from("page_views")
    .select("path")
    .in("path", paths)
    .eq("actor_type", "public")
    .gte("created_at", since.toISOString())
    .limit(10000);

  if (viewsError) {
    return candidates.slice(0, 5);
  }

  const viewsByPath = new Map<string, number>();
  for (const view of views ?? []) {
    viewsByPath.set(view.path, (viewsByPath.get(view.path) ?? 0) + 1);
  }

  return [...candidates]
    .sort((a, b) => {
      const aViews = viewsByPath.get(pathsById.get(a.id) ?? "") ?? 0;
      const bViews = viewsByPath.get(pathsById.get(b.id) ?? "") ?? 0;
      if (bViews !== aViews) return bViews - aViews;
      return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
    })
    .slice(0, 5);
}

const FacebookIcon = Facebook;
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.34 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

function ToolEngagementFooter({ tool }: { tool: Tool }) {
  const [questionDrawerOpen, setQuestionDrawerOpen] = useState(false);
  const title = tool.name;
  const url = typeof window !== "undefined" ? window.location.href : "";

  const openShare = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    await navigator.clipboard?.writeText(url);
  };

  return (
    <section className="mt-12 pt-6 border-t border-border">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="rounded-full w-full sm:w-auto"
          onClick={() => setQuestionDrawerOpen(true)}
        >
          <MessageCircle className="h-4 w-4" />
          Tirar dúvida sobre a ferramenta
        </Button>

        <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground hidden sm:inline mr-1">
            Compartilhar
          </span>
          <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)} aria-label="Compartilhar no Facebook">
            <FacebookIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`)} aria-label="Compartilhar no X">
            <XIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank", "noopener,noreferrer")} aria-label="Compartilhar no WhatsApp">
            <WhatsAppIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={shareNative} aria-label="Mais opções de compartilhamento">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ToolQuestionsDrawer
        tool={tool}
        open={questionDrawerOpen}
        onOpenChange={setQuestionDrawerOpen}
      />
    </section>
  );
}

function ToolQuestionsDrawer({
  tool,
  open,
  onOpenChange,
}: {
  tool: Tool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const storageKey = `tool_questions:${tool.id}`;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setQuestions(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
    } catch {
      setQuestions([]);
    }
  }, [open, storageKey]);

  const handleSubmit = () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const nextQuestions = [trimmed, ...questions].slice(0, 10);
    setQuestions(nextQuestions);
    setQuestion("");

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextQuestions));
    } catch {
      // Local persistence is a convenience; the drawer should still work without it.
    }

    toast({
      title: "Dúvida registrada",
      description: "Sua dúvida ficou salva nesta ferramenta.",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-2 text-left">
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Dúvidas sobre a ferramenta
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Envie uma pergunta sobre {tool.name} sem sair da página.
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {!user ? (
            <div className="rounded-[1.2rem] border bg-muted/30 p-5 text-center space-y-3">
              <LogIn className="mx-auto h-6 w-6 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Entre para comentar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça login para registrar dúvidas sobre esta ferramenta.
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link href="/login">Entrar</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Escreva sua dúvida..."
                className="min-h-32 resize-none"
              />
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!question.trim()}
                className="w-full rounded-full"
              >
                <Send className="h-4 w-4" />
                Enviar dúvida
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Dúvidas recentes
            </h3>
            {questions.length > 0 ? (
              <div className="space-y-3">
                {questions.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-[1rem] border bg-card p-4">
                    <p className="text-sm leading-relaxed text-foreground/85">{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1rem] border border-dashed p-5 text-center text-sm text-muted-foreground">
                Ainda não há dúvidas registradas nesta ferramenta.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AudienceToolsCard({ tools, isLoading }: { tools: Tool[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-[1.2rem] border bg-card p-5 shadow-card space-y-4">
        <Skeleton className="h-5 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!tools || tools.length === 0) return null;

  return (
    <div className="rounded-[1.2rem] border bg-card p-5 shadow-card">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Mais acessadas para este público
      </h3>

      <div className="space-y-4">
        {tools.map((tool, index) => (
          <Link
            key={tool.id}
            href={`/ferramentas/${tool.slug}`}
            aria-label={`Abrir ferramenta indicada para este público: ${tool.name}`}
            className="group flex gap-3 items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md -mx-1 px-1 py-0.5"
          >
            <span
              className={`
                shrink-0 flex items-center justify-center rounded-md text-sm font-bold w-8 h-8 overflow-hidden
                ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
              `}
            >
              {tool.icon_url ? (
                <img src={tool.icon_url} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                index + 1
              )}
            </span>

            <div className="min-w-0 flex-1">
              {tool.tags?.[0] && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 mb-1 uppercase tracking-wide font-medium"
                >
                  {tool.tags[0]}
                </Badge>
              )}
              <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {tool.name}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
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
    const listQueries = queryClient.getQueriesData<ToolsResult>({ queryKey: ["tools_public_v2"] });
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
  const audienceQuery = useQuery({
    queryKey: ["tool_audience_recommendations", tool?.id, (tool?.tags ?? []).slice().sort().join(",")],
    queryFn: async () => fetchAudienceTools(tool as Tool),
    enabled: !!tool,
    staleTime: 5 * 60 * 1000,
  });

  const relatedQuery = useQuery({
    queryKey: ["tool_related", tool?.id, (tool?.tags ?? []).slice().sort().join(",")],
    queryFn: async () => fetchRelatedTools(tool as Tool),
    enabled: !!tool,
    staleTime: 5 * 60 * 1000,
  });

  const audienceTools = audienceQuery.data ?? [];
  const audienceToolIds = new Set(audienceTools.map((item) => item.id));
  const relatedReady = !audienceQuery.isLoading && !relatedQuery.isLoading;
  const related = relatedReady
    ? (relatedQuery.data ?? [])
        .filter((item) => !audienceToolIds.has(item.id))
        .slice(0, 4)
    : [];
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
  let contentFirstHalf = tool.content_markdown ?? "";
  let contentSecondHalf = "";
  if (hasMiddleCta) {
    [contentFirstHalf, contentSecondHalf] = splitMarkdownAtMiddle(contentFirstHalf);
  }

  const hasContent = !!(tool.content_markdown && tool.content_markdown.trim());

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
      <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 pt-12 md:pt-16 pb-16">
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
                <MarkdownContent className="guide-content guide-content-primary text-foreground/80 leading-relaxed">
                  {contentFirstHalf}
                </MarkdownContent>
                {hasMiddleCta && (
                  <CtaBlock
                    label={tool.cta_middle_label}
                    url={tool.cta_middle_url}
                    text={tool.cta_middle_text}
                  />
                )}
                {contentSecondHalf && (
                  <MarkdownContent className="guide-content text-foreground/80 leading-relaxed">
                    {contentSecondHalf}
                  </MarkdownContent>
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

            <ToolEngagementFooter tool={tool} />

            {!relatedReady && (
              <section className="mt-10 pt-6 border-t border-border">
                <Skeleton className="h-4 w-48 mb-5" />
                <div className="space-y-5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <Skeleton className="w-20 h-16 sm:w-28 sm:h-20 rounded-md shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Related tools */}
            {related.length > 0 && (
              <section className="mt-10 pt-6 border-t border-border">
                <p className="text-sm font-bold uppercase tracking-wide text-primary mb-5">
                  Ferramentas relacionadas
                </p>
                <div className="space-y-5">
                  {related.map((rt) => (
                    <Link
                      key={rt.id}
                      href={`/ferramentas/${rt.slug}`}
                      className="flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                      aria-label={`Ferramenta relacionada: ${rt.name}`}
                    >
                      <div className="w-20 h-16 sm:w-28 sm:h-20 shrink-0 rounded-md overflow-hidden flex items-center justify-center bg-primary/10">
                        {rt.icon_url ? (
                          <img
                            src={rt.icon_url}
                            alt={`Logo de ${rt.name}`}
                            className="w-full h-full object-contain p-3"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <Wrench className="h-6 w-6 text-primary/60" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          {rt.tags?.[0] || "Ferramenta"}
                        </span>
                        <h3 className="text-base font-semibold leading-snug mt-0.5 group-hover:text-primary transition-colors line-clamp-2">
                          {rt.name}
                        </h3>
                        {rt.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {rt.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </article>

          <aside className="w-full lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-24">
              <AudienceToolsCard tools={audienceTools} isLoading={audienceQuery.isLoading} />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
