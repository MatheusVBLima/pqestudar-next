"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Share2,
  FileText,
  Globe,
  MapPin,
  GraduationCap,
  Briefcase,
  Building2,
  Calendar,
  Link as LinkIcon,
  AlertCircle,
  Clock,
  ChevronRight,
  Home,
} from "lucide-react";
import { Oportunidade, FonteOportunidade } from "@/hooks/useOportunidades";
import { useOportunidadeViewTracker } from "@/hooks/useOportunidadeViews";
import { useConcursoReadTracker } from "@/hooks/useAnalyticsTracker";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownContent } from "@/components/ui/markdown-content";

const CATEGORIA_COLORS: Record<string, string> = {
  "Concurso": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Políticas Públicas": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Educação": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const SITUACAO_COLORS: Record<string, string> = {
  "Previsto": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Edital publicado": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Aberto": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Encerrado": "bg-muted text-muted-foreground border-muted",
};

const SOURCE_TIPO_LABELS: Record<string, string> = {
  "oficial": "Fonte oficial",
  "diario": "Diário Oficial",
  "banca": "Banca organizadora",
  "outro-oficial": "Outra fonte oficial",
};

interface Atualizacao {
  id: string;
  data_atualizacao: string;
  texto: string;
  created_at: string;
}

interface ExtendedOportunidade extends Oportunidade {
  conteudo_principal?: string;
  conteudo_markdown?: string;
  conteudo_html?: string;
  meta_title?: string;
  meta_description?: string;
  published_at?: string;
  escolaridades?: ("Fundamental" | "Médio" | "Superior")[];
  atualizacoes_oportunidade?: Atualizacao[];
  views_total?: number;
}

// Content rendering is now handled by renderRichContentConcursos from concursos-content-renderer

// Generate JSON-LD structured data
function generateJsonLd(oportunidade: ExtendedOportunidade, canonicalUrl: string) {
  // Normalize escolaridades for schema
  const escolaridadesList = oportunidade.escolaridades?.length 
    ? oportunidade.escolaridades 
    : [oportunidade.escolaridade];

  const baseData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": oportunidade.titulo,
    "description": oportunidade.meta_description || oportunidade.resumo_editorial,
    "datePublished": oportunidade.published_at || oportunidade.created_at,
    "dateModified": oportunidade.updated_at,
    "inLanguage": "pt-BR",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    "publisher": {
      "@type": "Organization",
      "name": "PqEstudar",
      "url": "https://pqestudar.com.br"
    },
    "author": {
      "@type": "Organization",
      "name": "PqEstudar"
    },
    "about": {
      "@type": "EducationalOccupationalCredential",
      "educationalLevel": escolaridadesList.join(", "),
    }
  };

  // Add BreadcrumbList
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Início",
        "item": "https://pqestudar.com.br"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Concursos",
        "item": "https://pqestudar.com.br/concursos"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": oportunidade.titulo,
        "item": canonicalUrl
      }
    ]
  };

  return [baseData, breadcrumbData];
}

interface ConcursoDetailQueryResult {
  oportunidade: ExtendedOportunidade | null;
  atualizacoes: Atualizacao[];
  redirectSlug: string | null;
  notFound: boolean;
}

async function fetchConcursoDetail(slug: string): Promise<ConcursoDetailQueryResult> {
  const { data: oportunidade, error: oportunidadeError } = await supabase
    .from("oportunidades")
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .maybeSingle();

  if (oportunidadeError) throw oportunidadeError;

  if (oportunidade) {
    const [fontesResponse, atualizacoesResponse] = await Promise.all([
      supabase
        .from("fontes_oportunidade")
        .select("*")
        .eq("oportunidade_id", oportunidade.id),
      supabase
        .from("atualizacoes_oportunidade")
        .select("*")
        .eq("oportunidade_id", oportunidade.id)
        .order("data_atualizacao", { ascending: false }),
    ]);

    if (fontesResponse.error) throw fontesResponse.error;
    if (atualizacoesResponse.error) throw atualizacoesResponse.error;

    return {
      oportunidade: {
        ...oportunidade,
        fontes_oportunidade: (fontesResponse.data || []) as FonteOportunidade[],
      } as ExtendedOportunidade,
      atualizacoes: (atualizacoesResponse.data || []) as Atualizacao[],
      redirectSlug: null,
      notFound: false,
    };
  }

  // Only check redirect table when the current slug does not exist.
  const { data: redirect, error: redirectError } = await supabase
    .from("oportunidades_slug_redirects")
    .select("oportunidade_id")
    .eq("old_slug", slug)
    .maybeSingle();

  if (redirectError) throw redirectError;

  if (redirect?.oportunidade_id) {
    const { data: currentOp, error: currentOpError } = await supabase
      .from("oportunidades")
      .select("slug")
      .eq("id", redirect.oportunidade_id)
      .eq("publicado", true)
      .maybeSingle();

    if (currentOpError) throw currentOpError;

    if (currentOp?.slug) {
      return {
        oportunidade: null,
        atualizacoes: [],
        redirectSlug: currentOp.slug,
        notFound: false,
      };
    }
  }

  return {
    oportunidade: null,
    atualizacoes: [],
    redirectSlug: null,
    notFound: true,
  };
}

export default function ConcursoDetalheNext() {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const queryClient = useQueryClient();
  const placeholderDetail = useMemo<ConcursoDetailQueryResult | undefined>(() => {
    if (!slug) return undefined;
    const cachedLists = queryClient.getQueriesData<Oportunidade[]>({
      queryKey: ["oportunidades-public"],
    });
    for (const [, oportunidades] of cachedLists) {
      const found = oportunidades?.find((item) => item.slug === slug);
      if (found) {
        return {
          oportunidade: found as ExtendedOportunidade,
          atualizacoes: [],
          redirectSlug: null,
          notFound: false,
        };
      }
    }
    return undefined;
  }, [queryClient, slug]);

  const detailQuery = useQuery({
    queryKey: ["concurso_detail", slug],
    queryFn: async () => fetchConcursoDetail(slug as string),
    enabled: !!slug,
    placeholderData: placeholderDetail,
    staleTime: 5 * 60 * 1000,
  });

  const queryResult = detailQuery.data;
  const oportunidade = queryResult?.oportunidade ?? null;
  const atualizacoes = queryResult?.atualizacoes ?? [];
  const isLoading = !!slug && detailQuery.isLoading;
  const error =
    !slug
      ? "Slug não encontrado"
      : detailQuery.isError
        ? "Erro ao carregar oportunidade"
        : queryResult?.notFound
          ? "Oportunidade não encontrada"
          : null;

  // View tracking hook - tracks after 6s on visible page
  const { viewsTotal } = useOportunidadeViewTracker(
    oportunidade?.id,
    oportunidade?.views_total || oportunidade?.visualizacoes || 0
  );

  // Analytics tracking (heartbeat, scroll depth, events)
  const { trackEvent } = useConcursoReadTracker(oportunidade?.id, slug);

  const redirectSlug = queryResult?.redirectSlug ?? null;

  useEffect(() => {
    if (redirectSlug) {
      router.replace(`/concursos/${redirectSlug}`);
    }
  }, [redirectSlug, router]);

  if (redirectSlug) {
    return null;
  }

  const handleShare = async () => {
    trackEvent('concurso_share_click');
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: oportunidade?.titulo,
          url,
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const canonicalUrl = `https://pqestudar.com.br/concursos/${slug}`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !oportunidade) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {error || "Oportunidade não encontrada"}
          </h1>
          <p className="text-muted-foreground mb-6">
            A oportunidade que você está procurando não existe ou foi removida.
          </p>
          <Button asChild>
            <Link href="/concursos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para lista
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  const fontes = oportunidade.fontes_oportunidade || [];
  const jsonLdData = generateJsonLd(oportunidade, canonicalUrl);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground flex items-center gap-1">
                <Home className="h-3 w-3" />
                Início
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" />
            <li>
              <Link href="/concursos" className="hover:text-foreground">
                Concursos
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" />
            <li className="text-foreground font-medium truncate max-w-[200px]">
              {oportunidade.titulo}
            </li>
          </ol>
        </nav>

        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2"
          onClick={() => router.push("/concursos")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para lista
        </Button>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge
                variant="outline"
                className={CATEGORIA_COLORS[oportunidade.categoria] || ""}
              >
                {oportunidade.categoria}
              </Badge>
              <Badge
                variant="outline"
                className={SITUACAO_COLORS[oportunidade.situacao] || ""}
              >
                {oportunidade.situacao}
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {oportunidade.titulo}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={oportunidade.data_publicacao}>
                  {format(new Date(oportunidade.data_publicacao), "d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </time>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {viewsTotal.toLocaleString("pt-BR")} visualizações
              </div>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                Compartilhar
              </Button>
            </div>

            {/* Edital link */}
            {oportunidade.link_edital && (
              <div className="mt-6">
                <Button asChild size="lg" onClick={() => trackEvent('concurso_editais_click')}>
                  <a
                    href={oportunidade.link_edital}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Edital (PDF)
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            )}
          </header>

          <Separator className="my-8" />

          {/* Resumo Editorial */}
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Sobre esta oportunidade
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
                {oportunidade.resumo_editorial ? (
                  <p className="text-base leading-relaxed">{oportunidade.resumo_editorial}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Informações detalhadas serão adicionadas em breve. Consulte as fontes oficiais abaixo para mais informações.
                  </p>
                )}

                {oportunidade.orgao && (
                  <div className="flex items-center gap-2 mt-4 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Órgão:</span>
                    <span>{oportunidade.orgao}</span>
                  </div>
                )}

                {oportunidade.banca && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Banca:</span>
                    <span>{oportunidade.banca}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Conteúdo Principal */}
          {(oportunidade.conteudo_html || oportunidade.conteudo_markdown || oportunidade.conteudo_principal) && (
            <section className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações Detalhadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
                  <MarkdownContent>
                    {oportunidade.conteudo_html ||
                      oportunidade.conteudo_markdown ||
                      oportunidade.conteudo_principal}
                  </MarkdownContent>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Atualizações */}
          {atualizacoes.length > 0 && (
            <section className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Atualizações
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Histórico de atualizações desta oportunidade
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {atualizacoes.map((atualizacao) => (
                      <li key={atualizacao.id} className="border-l-2 border-primary/30 pl-4">
                        <time 
                          dateTime={atualizacao.data_atualizacao}
                          className="text-sm font-medium text-primary"
                        >
                          {format(new Date(atualizacao.data_atualizacao), "d 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </time>
                        <MarkdownContent
                          variant="prose"
                          className="text-sm mt-1 max-w-none"
                        >
                          {atualizacao.texto}
                        </MarkdownContent>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Tags/Classificação */}
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Classificação
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Estas são classificações informativas, não garantias oficiais.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Escolaridade(s) */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Escolaridade
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(oportunidade.escolaridades?.length 
                        ? oportunidade.escolaridades 
                        : [oportunidade.escolaridade]
                      ).map(esc => (
                        <Badge key={esc} variant="secondary" className="w-fit">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {esc}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Abrangência */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Abrangência
                    </p>
                    <Badge variant="secondary" className="w-fit">
                      {oportunidade.abrangencia === "Nacional" ? (
                        <Globe className="h-3 w-3 mr-1" />
                      ) : (
                        <MapPin className="h-3 w-3 mr-1" />
                      )}
                      {oportunidade.abrangencia}
                    </Badge>
                  </div>

                  {/* Tipo */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Tipo
                    </p>
                    <Badge variant="secondary" className="w-fit">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {oportunidade.tipo}
                    </Badge>
                  </div>

                  {/* Situação */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Situação
                    </p>
                    <Badge
                      variant="outline"
                      className={`w-fit ${SITUACAO_COLORS[oportunidade.situacao] || ""}`}
                    >
                      {oportunidade.situacao}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Fontes */}
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Fontes
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Consulte as fontes oficiais para informações atualizadas.
                </p>
              </CardHeader>
              <CardContent>
                {fontes.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">
                    Nenhuma fonte disponível.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {fontes.map((fonte) => (
                      <li key={fonte.id} className="flex items-start gap-3">
                        <img
                          src={getFaviconUrl(fonte.source_url) || ""}
                          alt=""
                          className="h-5 w-5 mt-0.5 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <a
                            href={fonte.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            {fonte.source_title || getDomain(fonte.source_url)}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {SOURCE_TIPO_LABELS[fonte.source_tipo] || fonte.source_tipo}
                            </Badge>
                            {fonte.source_date && (
                              <time 
                                dateTime={fonte.source_date}
                                className="text-xs text-muted-foreground"
                              >
                                {format(new Date(fonte.source_date), "dd/MM/yyyy")}
                              </time>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Disclaimer */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Importante</p>
                <p>
                  As informações apresentadas são baseadas em fontes oficiais disponíveis até a data de publicação.
                  Sempre consulte os canais oficiais para confirmação de prazos, requisitos e procedimentos.
                </p>
              </div>
            </div>
          </div>
        </motion.article>
      </main>

      
    </div>
  );
}



