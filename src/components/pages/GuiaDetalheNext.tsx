"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHero } from "@/components/layout/PageHero";
import { renderHighlightedTitle } from "@/lib/highlight-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Star, BookOpen, Wrench, FileText } from "lucide-react";
import {
  useGuideBySlug,
  useGuideRelatedTools,
  useGuideRelatedContests,
  useGuideRelatedGuides,
  useGuideLinkPreviews,
} from "@/hooks/useGuides";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { splitMarkdownAtMiddle } from "@/lib/split-markdown";
import { MostReadGuides } from "@/components/guides/MostReadGuides";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function CtaBlock({ label, url, text }: { label?: string | null; url?: string | null; text?: string | null }) {
  if (!label || !url) return null;
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
      <Button asChild size="lg" className="w-full sm:w-auto max-w-full px-4 sm:px-8 h-auto min-h-11 py-3 whitespace-normal break-words leading-tight text-sm sm:text-base">
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2">
          <span className="break-words">{label}</span>
          <ExternalLink className="h-4 w-4 shrink-0" />
        </a>
      </Button>
    </div>
  );
}

export default function GuiaDetalheNext() {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const { data: guide, isLoading } = useGuideBySlug(slug);
  const { data: relatedTools } = useGuideRelatedTools(guide?.id);
  const { data: relatedContests } = useGuideRelatedContests(guide?.id);
  const { data: relatedGuides } = useGuideRelatedGuides(guide?.id);

  const rawInternalLinks: Array<{ label: string; url: string; imageUrl?: string | null }> = Array.isArray(guide?.internal_links)
    ? guide.internal_links.filter((l: { label?: string; url?: string }) => l.label && l.url)
    : [];
  const resolvedLinks = useGuideLinkPreviews(rawInternalLinks);

  const viewTracked = useRef<string | null>(null);

  useEffect(() => {
    if (slug && guide && viewTracked.current !== slug) {
      viewTracked.current = slug;
      supabase.rpc("increment_guide_view", { p_slug: slug }).then(({ error }) => {
        if (error) console.warn("Guide view track error:", error.message);
      });
    }
  }, [slug, guide]);

  if (isLoading) {
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

  if (!guide) {
    return (
      <div className="container mx-auto px-6 py-24 text-center">
        <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Guia não encontrado</h1>
        <p className="text-muted-foreground mb-6">O guia que você procura não existe ou não está publicado.</p>
        <Button onClick={() => router.push("/guias")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos guias
        </Button>
      </div>
    );
  }

  const updatedDate = guide.updated_at
    ? format(new Date(guide.updated_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const hasRelated = (relatedTools && relatedTools.length > 0) ||
    (relatedContests && relatedContests.length > 0) ||
    (relatedGuides && relatedGuides.length > 0);

  const ctaTopText = guide.cta_top_text || null;
  const ctaMiddleText = guide.cta_middle_text || null;
  const ctaFinalText = guide.cta_final_text || null;

  const hasMiddleCta = !!(guide.cta_middle_label && guide.cta_middle_url);

  let contentFirstHalf = guide.content_markdown ?? "";
  let contentSecondHalf = "";
  if (hasMiddleCta) {
    [contentFirstHalf, contentSecondHalf] = splitMarkdownAtMiddle(contentFirstHalf);
  }

  const authorName = guide.author_name || "Equipe PqEstudar";

  return (
    <>
      {guide.cover_image_url ? (
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0">
            <img
              src={guide.cover_image_url}
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
              <Badge variant="outline" className="text-sm border-white/30 text-white bg-white/10 backdrop-blur-sm">
                {guide.category}
              </Badge>
              {guide.is_featured && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 backdrop-blur-sm" variant="outline">
                  <Star className="h-3 w-3 mr-1" /> Destaque
                </Badge>
              )}
              {updatedDate ? (
                <span className="text-xs text-white/70">
                  Por {authorName} · Atualizado em {updatedDate}
                </span>
              ) : (
                <span className="text-xs text-white/70">Por {authorName}</span>
              )}
            </div>
            <h1 className="max-w-full md:max-w-4xl lg:max-w-[1100px] text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-lg">
              {renderHighlightedTitle(guide.title)}
            </h1>
            <p className="max-w-full md:max-w-3xl lg:max-w-[900px] text-lg md:text-xl text-white/80 leading-relaxed">
              {guide.short_description}
            </p>
          </motion.div>
        </section>
      ) : (
        <PageHero
          title={guide.title}
          description={guide.short_description}
          badge={
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge variant="outline" className="text-sm">
                {guide.category}
              </Badge>
              {guide.is_featured && (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
                  <Star className="h-3 w-3 mr-1" /> Destaque
                </Badge>
              )}
              {updatedDate ? (
                <span className="text-xs text-muted-foreground">
                  Por {authorName} · Atualizado em {updatedDate}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Por {authorName}</span>
              )}
            </div>
          }
        />
      )}

      <div className="container mx-auto px-6 pt-12 md:pt-16 pb-16">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
          <article className="flex-1 min-w-0 max-w-3xl">
            <CtaBlock label={guide.cta_top_label} url={guide.cta_top_url} text={ctaTopText} />

            <MarkdownContent className="guide-content guide-content-primary text-foreground/80 leading-relaxed">
              {contentFirstHalf}
            </MarkdownContent>

            {hasMiddleCta && (
              <CtaBlock label={guide.cta_middle_label} url={guide.cta_middle_url} text={ctaMiddleText} />
            )}

            {contentSecondHalf && (
              <MarkdownContent className="guide-content text-foreground/80 leading-relaxed">
                {contentSecondHalf}
              </MarkdownContent>
            )}

            <CtaBlock label={guide.cta_final_label} url={guide.cta_final_url} text={ctaFinalText} />

            {hasRelated && (
              <div className="mt-16 space-y-10">
                {relatedTools && relatedTools.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Wrench className="h-5 w-5" /> Ferramentas relacionadas
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {relatedTools.map((tool) => (
                        <Card key={tool.id} className="flex flex-col">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{tool.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {tool.description?.slice(0, 100)}
                            {tool.url && (
                              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="block mt-2 text-primary underline text-xs">
                                Acessar ferramenta
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {relatedContests && relatedContests.length > 0 && (
                  <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Concursos relacionados
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {relatedContests.map((contest) => (
                        <Card key={contest.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              <Link href={`/concursos/${contest.slug}`} className="hover:text-primary transition-colors">
                                {contest.titulo}
                              </Link>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-2">
                              <Badge variant="outline">{contest.situacao}</Badge>
                              <Badge variant="outline">{contest.tipo}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {relatedGuides && relatedGuides.length > 0 && (
                  <section>
                    <p className="text-sm font-bold uppercase tracking-wide text-primary mb-5">Veja também</p>
                    <div className="space-y-5">
                      {relatedGuides.map((g) => (
                        <Link
                          key={g.id}
                          href={`/guias/${g.slug}`}
                          className="flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                        >
                          <div className="w-20 h-16 sm:w-28 sm:h-20 shrink-0 rounded-md bg-accent flex items-center justify-center overflow-hidden">
                            <BookOpen className="h-6 w-6 text-primary/60" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                              {g.category}
                            </span>
                            <h3 className="text-base font-semibold leading-snug mt-0.5 group-hover:text-primary transition-colors line-clamp-2">
                              {g.title}
                            </h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {resolvedLinks.length > 0 && (
              <section className="mt-10 pt-6 border-t border-border">
                <p className="text-sm font-bold uppercase tracking-wide text-primary mb-5">Links úteis</p>
                <div className="space-y-5">
                  {resolvedLinks.map((link, i) => {
                    const thumbUrl = link.coverImageUrl || link.imageUrl;
                    return (
                      <Link
                        key={i}
                        href={link.url}
                        className="flex items-start gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
                        aria-label={`Link útil: ${link.label}`}
                      >
                        <div className="w-20 h-16 sm:w-28 sm:h-20 shrink-0 rounded-md overflow-hidden flex items-center justify-center bg-primary/10">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
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
                            {link.category || "Link útil"}
                          </span>
                          <h3 className="text-base font-semibold leading-snug mt-0.5 group-hover:text-primary transition-colors line-clamp-2">
                            {link.label}
                          </h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="mt-12">
              <Button variant="outline" onClick={() => router.push("/guias")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos guias
              </Button>
            </div>
          </article>

          <aside className="w-full lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-24">
              <MostReadGuides excludeSlug={slug} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
