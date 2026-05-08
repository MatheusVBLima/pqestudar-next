"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, ExternalLink, Bookmark, BookmarkCheck, RefreshCw, Sparkles, HelpCircle } from "lucide-react";
import useFavoritos from "@/hooks/useFavoritos";
import { useToast } from "@/hooks/use-toast";
import { useGamification, type Badge as BadgeType } from "@/hooks/useGamification";
import { BadgeNotification } from "@/components/ui/badge-notification";
import { AINewsService, type NewsArticle } from "@/services/ai-news-service";
import { RealNewsService, type ValidatedNews } from "@/services/real-news-service";
import { DailyNewsLimitService } from "@/services/daily-news-limit";
import NewsStorageService from "@/services/news-storage";
import { supabase } from "@/integrations/supabase/client";

import { sanitizeHtml } from "@/lib/utils";

type NewsItem = NewsArticle | ValidatedNews;

const Noticias = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const [filtroAtivo, setFiltroAtivo] = useState<string>("Todas");
  const [noticias, setNoticias] = useState<NewsItem[]>([]);
  const [expandedNews, setExpandedNews] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearchingReal, setIsSearchingReal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState<number>(0);
  const [newBadge, setNewBadge] = useState<BadgeType | null>(null);
  const { adicionarFavorito, removerFavorito, isFavorito } = useFavoritos();
  const { toast } = useToast();
  const { recordHelpAction, userProfile } = useGamification(isAdmin);

  // Daily global and user limits
  const dailyData = DailyNewsLimitService.getDailyData();
  const userData = DailyNewsLimitService.getUserDailyData(user?.id);
  const globalCount = dailyData.count;
  const maxDaily = DailyNewsLimitService.getMaxDaily();
  const userCount = DailyNewsLimitService.getUserContributionCount(user?.id);
  const userMaxContributions = DailyNewsLimitService.getUserMaxContributions();
  const remainingUsers = DailyNewsLimitService.getRemainingUsersNeeded();
  const canUserContribute = DailyNewsLimitService.canUserContribute(user?.id);
  const canAddDaily = DailyNewsLimitService.canAddNews(1, user?.id);

  // Cooldown settings
  const SEARCH_COOLDOWN = 30000; // 30 seconds
  const now = Date.now();
  const timeSinceLastSearch = now - lastSearchTime;
  const isOnCooldown = timeSinceLastSearch < SEARCH_COOLDOWN;

  // Load stored news on mount
  useEffect(() => {
    console.log("Loading stored news...");
    const storedNews = NewsStorageService.getAllNews();
    if (storedNews.length > 0) {
      setNoticias(storedNews);
      console.log(`Loaded ${storedNews.length} stored news articles`);
    }
  }, []);

  const checkForDuplicates = (newNews: NewsItem[], existingNews: NewsItem[]): NewsItem[] => {
    return newNews.filter((newsItem) => {
      // Verificar se já existe notícia com título muito similar
      const isDuplicate = existingNews.some((existing) => {
        // Comparar títulos normalizados (remover pontuação, lowercase)
        const normalizeTitle = (title: string) =>
          title
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        const newTitle = normalizeTitle(newsItem.titulo);
        const existingTitle = normalizeTitle(existing.titulo);

        // Calcular similaridade (palavras em comum)
        const newWords = new Set(newTitle.split(" ").filter((w) => w.length > 3));
        const existingWords = new Set(existingTitle.split(" ").filter((w) => w.length > 3));

        const commonWords = [...newWords].filter((word) => existingWords.has(word));
        const similarity = commonWords.length / Math.max(newWords.size, existingWords.size);

        // Se mais de 60% das palavras são iguais, considerar duplicata
        if (similarity > 0.6) {
          console.log(
            `Duplicate detected: "${newsItem.titulo}" is similar to "${existing.titulo}" (${Math.round(similarity * 100)}% similar)`,
          );
          return true;
        }

        return false;
      });

      return !isDuplicate;
    });
  };

  // Admin functions
  const resetLimitsAndClearNews = () => {
    // Reset daily limits
    DailyNewsLimitService.resetDailyCount(user?.id);
    // Clear all news
    NewsStorageService.clearNews();
    setNoticias([]);

    toast({
      title: "Sistema resetado!",
      description: "Limites diários resetados e notícias limpas. Você pode testar novamente.",
      duration: 3000,
    });

    // Refresh page to update counters
    window.location.reload();
  };

  const removeNewsByTitle = (titleToRemove: string) => {
    const allNews = NewsStorageService.getAllNews();
    const filtered = allNews.filter((n) => n.titulo !== titleToRemove);

    // Clear and re-store
    NewsStorageService.clearNews();
    NewsStorageService.storeNews(filtered);
    setNoticias(filtered);

    toast({
      title: "Notícia removida",
      description: `"${titleToRemove}" foi removida.`,
      duration: 3000,
    });
  };

  const removeDuplicates = () => {
    const allNews = NewsStorageService.getAllNews();
    const seen = new Map();

    const unique = allNews.filter((news) => {
      const normalizeTitle = (title: string) =>
        title
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const normalized = normalizeTitle(news.titulo);

      if (seen.has(normalized)) {
        return false;
      }

      seen.set(normalized, true);
      return true;
    });

    const removedCount = allNews.length - unique.length;

    if (removedCount > 0) {
      NewsStorageService.clearNews();
      NewsStorageService.storeNews(unique);
      setNoticias(unique);

      toast({
        title: "Duplicados removidos",
        description: `${removedCount} notícia${removedCount > 1 ? "s" : ""} duplicada${removedCount > 1 ? "s" : ""} removida${removedCount > 1 ? "s" : ""}.`,
        duration: 3000,
      });
    } else {
      toast({
        title: "Nenhuma duplicata encontrada",
        description: "Todas as notícias são únicas.",
        duration: 3000,
      });
    }
  };

  const searchMoreNews = async () => {
    // Check if user is logged in
    if (!user) {
      setShowLoginPrompt(true);

      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para buscar mais notícias.",
        variant: "destructive",
        duration: 4000,
      });

      // Navigate to login after showing the prompt, with return path
      setTimeout(() => {
        router.push("/login?from=noticias");
      }, 1500);
      return;
    }

    // Admins have unlimited access - skip all limits
    if (!isAdmin) {
      // Check user contribution limit first
      if (!canUserContribute) {
        toast({
          title: "Você já contribuiu hoje",
          description: `Você já adicionou sua ${userMaxContributions} notícia diária. Tente novamente amanhã.`,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }

      // Check daily global limit
      if (!canAddDaily) {
        const resetTime = DailyNewsLimitService.getTimeUntilReset();
        toast({
          title: "Limite diário atingido",
          description: `Limite de ${maxDaily} notícias/dia atingido para toda a plataforma. Redefine em ${resetTime.hours}h ${resetTime.minutes}min.`,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
    }

    if (isOnCooldown) {
      const remainingTime = Math.ceil((SEARCH_COOLDOWN - timeSinceLastSearch) / 1000);
      toast({
        title: "Aguarde um momento",
        description: `Você pode buscar mais notícias em ${remainingTime} segundos.`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsSearchingReal(true);
    setLastSearchTime(now);

    try {
      const { data, error } = await supabase.functions.invoke("generate-validated-news", {
        body: { maxResults: 1 },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data?.success || !data?.news) {
        throw new Error("Resposta inválida do servidor");
      }

      const validatedNews = data.news;

      if (validatedNews.length > 0) {
        // Verificar duplicatas antes de adicionar
        const uniqueNews = checkForDuplicates(validatedNews, noticias);

        if (uniqueNews.length === 0) {
          toast({
            title: "Notícia duplicada detectada",
            description: "Esta notícia já existe ou é muito similar a uma existente. Tente novamente.",
            variant: "destructive",
            duration: 4000,
          });
          setIsSearchingReal(false);
          return;
        }

        // Admins don't update counters and don't participate in gamification
        if (isAdmin) {
          setNoticias((prev) => [...uniqueNews, ...prev]);
          NewsStorageService.storeNews(uniqueNews);

          toast({
            title: "Nova notícia encontrada! (Admin)",
            description: "1 notícia validada adicionada sem limite.",
            duration: 4000,
          });
        } else {
          // Update global counter and user status for non-admins
          const success = DailyNewsLimitService.addNewsCount(uniqueNews.length, user?.id);

          if (success) {
            setNoticias((prev) => [...uniqueNews, ...prev]);
            // Store new news for detail page access
            NewsStorageService.storeNews(uniqueNews);
            const newGlobalCount = DailyNewsLimitService.getCurrentCount();
            const newRemainingUsers = DailyNewsLimitService.getRemainingUsersNeeded();

            // Record help action for gamification
            const earnedBadge = recordHelpAction();
            if (earnedBadge) {
              setNewBadge(earnedBadge);
            }

            toast({
              title: "Nova notícia encontrada!",
              description: `1 notícia validada adicionada. Global: ${newGlobalCount}/${maxDaily} (falta ${newRemainingUsers > 0 ? `+${newRemainingUsers} usuário${newRemainingUsers > 1 ? "s" : ""}` : "0 usuários"} para fechar as notícias diárias)`,
              duration: 4000,
            });
          } else {
            toast({
              title: "Erro no limite diário",
              description: "Não foi possível adicionar as notícias devido ao limite diário.",
              variant: "destructive",
              duration: 3000,
            });
          }
        }
      } else {
        toast({
          title: "Nenhuma notícia nova encontrada",
          description: "Não foram encontradas notícias recentes validadas.",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching news:", error);

      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      toast({
        title: "Erro ao buscar notícias",
        description: errorMessage.includes("Rate limit")
          ? "Limite de requisições atingido. Tente novamente em alguns minutos."
          : errorMessage.includes("Payment required")
            ? "Créditos insuficientes no Lovable AI. Adicione créditos para continuar."
            : "Não foi possível buscar novas notícias no momento.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsSearchingReal(false);
    }
  };

  const generateMoreNews = () => {
    setIsGenerating(true);

    // Simulate AI generation delay for better UX
    setTimeout(() => {
      const newNews = AINewsService.generateNews(1);
      setNoticias((prev) => [...newNews, ...prev]);
      // Store new news for detail page access
      NewsStorageService.storeNews(newNews);
      setIsGenerating(false);

      toast({
        title: "Nova notícia gerada!",
        description: "1 notícia sobre educação foi adicionada com IA.",
        duration: 3000,
      });
    }, 1500);
  };

  const getCategoriaColor = (categoria: string) => {
    const cores = {
      ENEM: "bg-blue-500",
      Concursos: "bg-green-500",
      SISU: "bg-purple-500",
      ProUni: "bg-orange-500",
      FIES: "bg-pink-500",
    };
    return cores[categoria as keyof typeof cores] || "bg-gray-500";
  };

  const filtros = ["Todas", "ENEM", "Concursos", "SISU", "ProUni", "FIES", "Vestibular", "Educação"];

  const noticiasFiltradas =
    filtroAtivo === "Todas" ? noticias : noticias.filter((noticia) => noticia.categoria === filtroAtivo);

  const handleSalvarNoticia = (noticia: NewsItem) => {
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para salvar notícias.",
        variant: "destructive",
        duration: 4000,
      });

      // Navigate to login after a short delay, with return path
      setTimeout(() => {
        router.push("/login?from=noticias");
      }, 1500);
      return;
    }

    const noticiaFavorito = {
      id: noticia.id,
      titulo: noticia.titulo,
      descricao: noticia.descricao,
      categoria: noticia.categoria,
      data: noticia.data,
      tipo: "noticia" as const,
    };

    if (isFavorito(noticia.id, "noticia")) {
      removerFavorito(noticia.id, "noticia");
      toast({
        title: "Removido dos favoritos",
        description: "A notícia foi removida da sua lista de favoritos.",
      });
    } else {
      adicionarFavorito(noticiaFavorito);
      toast({
        title: "Salvo nos favoritos",
        description: "A notícia foi adicionada à sua lista de favoritos.",
      });
    }
  };

  const toggleNewsExpansion = (newsId: number) => {
    setExpandedNews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(newsId)) {
        newSet.delete(newsId);
      } else {
        newSet.add(newsId);
      }
      return newSet;
    });
  };

  const isNewsExpanded = (newsId: number) => expandedNews.has(newsId);

  /**
   * Converte HTML em texto plano de forma segura
   */
  const toPlainText = (html: string) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(sanitizeHtml(html), "text/html");
    return (doc.body.textContent || "").trim();
  };

  /**
   * Gera um preview seguro (texto) e reconstrói um <p> sanitizado
   * - Evita truncar HTML no meio de tags
   * - Mantém saída segura via sanitizeHtml
   */
  const getSafePreviewHtml = (html: string, max = 400) => {
    const text = toPlainText(html);
    const preview = text.length > max ? `${text.slice(0, max)}...` : text;
    // Re-encapsula em <p> e sanitiza novamente por garantia
    return sanitizeHtml(`<p>${preview}</p>`);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      <main className="container mx-auto px-4 py-8 max-w-7xl w-full">
        {/* Admin Controls - Only visible to admins */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🛡️</span>
              <h3 className="font-bold text-lg text-foreground">Painel de Administração</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Controles administrativos para gerenciar o sistema de notícias
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={resetLimitsAndClearNews} variant="destructive" size="sm" className="gap-2">
                🗑️ Limpar Tudo
              </Button>
              <Button
                onClick={() => {
                  // Reset both global and user limits
                  DailyNewsLimitService.resetDailyCount(user?.id);

                  toast({
                    title: "Limites resetados",
                    description: "Contadores diários foram zerados. Atualizando página...",
                    duration: 2000,
                  });

                  // Force reload after a short delay to ensure storage is updated
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                🔄 Resetar Limites
              </Button>
              <Button onClick={removeDuplicates} variant="outline" size="sm" className="gap-2">
                🔍 Remover Duplicados
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 w-full">
          <div className="space-y-4">
            {/* Title and Help Icon */}
            <div className="flex items-start gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground break-words flex-1">
                Notícias sobre Educação
              </h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-auto mt-1 flex-shrink-0">
                      <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm p-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">Como funciona nossa busca inteligente?</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Nosso sistema automatiza a busca por notícias relevantes sobre educação, validando informações
                        através de múltiplas fontes confiáveis. Filtramos conteúdo por relevância, veracidade e
                        importância, garantindo que você receba apenas as notícias mais precisas e atualizadas sobre
                        ENEM, SISU, concursos públicos e educação em geral.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ✓ Validação por múltiplas fontes
                        <br />
                        ✓ Filtragem automática de qualidade
                        <br />✓ Atualização em tempo real
                      </p>
                      <div className="pt-2 border-t border-border">
                        <p className="font-semibold text-sm text-primary">🎯 Bônus de Contribuição</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Ao clicar em "Mais notícias", você não apenas acessa conteúdo exclusivo, mas também contribui
                          para enriquecer nossa base de dados com informações valiosas que beneficiam toda a comunidade
                          educacional. Cada busca ajuda a melhorar nosso algoritmo de qualidade!
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Status Info - Mobile First */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="bg-muted/50 rounded-lg p-3 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sua contribuição:</span>
                  <span className="font-medium">
                    {userCount}/{userMaxContributions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Global hoje:</span>
                  <span>
                    {globalCount}/{maxDaily}
                  </span>
                </div>
                {remainingUsers > 0 && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 text-center">
                    Falta +{remainingUsers} usuário{remainingUsers > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={searchMoreNews}
                      disabled={isSearchingReal || (user && !canUserContribute) || isOnCooldown}
                      size="sm"
                      className={`w-full sm:w-auto bg-gradient-to-r transition-all text-sm px-4 py-2 ${
                        (user && !canUserContribute) || showLoginPrompt
                          ? "from-gray-400 to-gray-500 cursor-not-allowed"
                          : "from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      }`}
                    >
                      {isSearchingReal ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      <span className="whitespace-nowrap">
                        {showLoginPrompt
                          ? "Faça login"
                          : user && !canUserContribute
                            ? "Já contribuiu hoje"
                            : isOnCooldown
                              ? `Aguarde ${Math.ceil((SEARCH_COOLDOWN - timeSinceLastSearch) / 1000)}s`
                              : isSearchingReal
                                ? "Buscando..."
                                : "Mais notícias"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    <div className="space-y-1">
                      {showLoginPrompt ? (
                        <>
                          <p className="font-semibold text-sm">🔒 Redirecionando...</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Você será redirecionado para a página de login.
                          </p>
                        </>
                      ) : !user ? (
                        <>
                          <p className="font-semibold text-sm">🤝 Contribua com a comunidade!</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Clique para buscar mais notícias e contribuir com informações valiosas para a comunidade
                            educacional.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm">🤝 Contribua com a comunidade!</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Ao buscar mais notícias, você ajuda a enriquecer nossa plataforma com informações valiosas
                            que beneficiam todos os usuários da comunidade educacional.
                          </p>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Notícias validadas por múltiplas fontes sobre educação: ENEM, SISU, concursos públicos e muito mais.
          </p>
          {!isAdmin && !canUserContribute && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Limite atingido:</strong> Você já fez sua contribuição diária.
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                Volte amanhã para contribuir novamente.
              </p>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 w-full">
            {filtros.map((filtro) => (
              <Badge
                key={filtro}
                variant={filtroAtivo === filtro ? "default" : "outline"}
                className={`cursor-pointer transition-colors whitespace-nowrap text-xs px-3 py-1.5 ${
                  filtroAtivo === filtro
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "hover:bg-secondary hover:text-secondary-foreground"
                }`}
                onClick={() => setFiltroAtivo(filtro)}
              >
                {filtro}
              </Badge>
            ))}
          </div>
        </div>

        {/* Badge Notification */}
        {newBadge && <BadgeNotification badge={newBadge} onClose={() => setNewBadge(null)} />}

        {/* Lista de Notícias */}
        <div className="grid gap-6 w-full">
          {noticiasFiltradas.map((noticia) => (
            <Card key={noticia.id} className="hover:shadow-md transition-shadow w-full">
              <CardHeader className="pb-3">
                <div className="space-y-3">
                  {/* Categories and Tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${getCategoriaColor(noticia.categoria)} text-white text-xs`}>
                      {noticia.categoria}
                    </Badge>
                    {noticia.urgente && (
                      <Badge variant="destructive" className="text-xs">
                        Urgente
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <CardTitle className="text-base sm:text-lg leading-tight hover:text-primary cursor-pointer break-words">
                    {noticia.titulo}
                  </CardTitle>

                  {/* Description */}
                  <CardDescription className="text-sm leading-relaxed break-words">
                    {isNewsExpanded(noticia.id) && "conteudoCompleto" in noticia && noticia.conteudoCompleto ? (
                      <div className="space-y-3">
                        {/* Conteúdo sanitizado em preview seguro */}
                        <div
                          className="prose prose-sm max-w-none text-muted-foreground"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              noticia.conteudoCompleto.substring(0, 400) +
                                (noticia.conteudoCompleto.length > 400 ? "..." : ""),
                            ),
                          }}
                        />

                        {toPlainText(noticia.conteudoCompleto).length > 400 && (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => router.push(`/noticia/${noticia.id}`)}
                            className="p-0 h-auto text-primary hover:underline"
                          >
                            Continuar lendo na página completa →
                          </Button>
                        )}
                      </div>
                    ) : (
                      noticia.descricao
                    )}
                  </CardDescription>

                  {/* Sources */}
                  {"sources" in noticia && noticia.sources && (
                    <div className="text-xs text-muted-foreground break-words">
                      <strong>Fontes:</strong> {noticia.sources.map((source) => source.name).join(", ")}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Date and Time Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>{new Date(noticia.data).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{noticia.tempo}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSalvarNoticia(noticia)}
                      className={`flex-1 min-w-[100px] text-xs justify-center ${!user ? "opacity-70" : ""}`}
                    >
                      {isFavorito(noticia.id, "noticia") ? (
                        <BookmarkCheck className="h-4 w-4 mr-1 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4 mr-1" />
                      )}
                      {!user ? "Login p/ salvar" : isFavorito(noticia.id, "noticia") ? "Salvo" : "Salvar"}
                    </Button>

                    {/* Preview rápido inline */}
                    {"conteudoCompleto" in noticia && noticia.conteudoCompleto && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleNewsExpansion(noticia.id)}
                        className="flex-1 min-w-[100px] text-xs justify-center"
                      >
                        {isNewsExpanded(noticia.id) ? (
                          <>
                            <span className="mr-1">↑</span>
                            Recolher
                          </>
                        ) : (
                          <>
                            <span className="mr-1">↓</span>
                            Ler mais
                          </>
                        )}
                      </Button>
                    )}

                    {/* Link para página completa */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/noticia/${noticia.id}`)}
                      className="flex-1 min-w-[100px] text-xs justify-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver página completa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={searchMoreNews}
                  disabled={isSearchingReal || !canUserContribute || isOnCooldown}
                  className={`w-full sm:w-auto ${!canUserContribute ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSearchingReal ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Buscando fontes...
                    </>
                  ) : !canUserContribute ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 opacity-50" />
                      Já contribuiu hoje
                    </>
                  ) : isOnCooldown ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Aguarde {Math.ceil((SEARCH_COOLDOWN - timeSinceLastSearch) / 1000)}s
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Mais notícias ({remainingUsers} restantes)
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">🤝 Contribua com a comunidade!</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao buscar mais notícias, você ajuda a enriquecer nossa plataforma com informações valiosas que
                    beneficiam todos os usuários da comunidade educacional.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </main>
    </div>
  );
};

export default Noticias;
