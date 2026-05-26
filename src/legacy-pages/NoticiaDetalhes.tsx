"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Clock, Share2, Bookmark, BookmarkCheck, ExternalLink, Eye } from "lucide-react";
import NewsStorageService from "@/services/news-storage";
import useFavoritos from "@/hooks/useFavoritos";
import { useToast } from "@/hooks/use-toast";

// no topo
import { sanitizeHtml, escapeHtml } from "@/lib/utils";

type FonteNoticia = string | { nome: string; url: string };

interface NoticiaView {
  id: string | number;
  titulo: string;
  descricao: string;
  categoria: string;
  data: string;
  tempo: string;
  urgente?: boolean;
  imagem?: string;
  autor?: string;
  visualizacoes?: number;
  conteudoCompleto?: string;
  conteudo?: string;
  tags?: string[];
  fontes?: FonteNoticia[];
}

const NoticiaDetalhes = () => {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const { adicionarFavorito, removerFavorito, isFavorito } = useFavoritos();
  const { toast } = useToast();

  const generateFallbackContent = (news: NoticiaView) => {
    return `
      <p class="mb-4">${news.descricao}</p>
      <h3 class="text-xl font-semibold mb-3 text-foreground">Informações Detalhadas</h3>
      <p class="mb-4">Esta notícia traz informações importantes sobre ${news.categoria.toLowerCase()} que podem impactar estudantes e profissionais da educação.</p>
      <p class="mb-4">Fique atento aos prazos e procedimentos mencionados para não perder oportunidades importantes em sua jornada educacional.</p>
      <h3 class="text-xl font-semibold mb-3 text-foreground">Próximos Passos</h3>
      <p class="mb-4">Recomendamos que você:</p>
      <ul class="list-disc ml-6 mb-4">
        <li>Acompanhe os canais oficiais para atualizações</li>
        <li>Organize sua documentação necessária</li>
        <li>Marque as datas importantes em seu calendário</li>
        <li>Busque orientação adicional se necessário</li>
      </ul>
    `;
  };

  // Static data for fallback (existing news)
  const staticNoticias = useMemo(() => ({
    "1": {
      id: 1,
      titulo: "Resultado do ENEM 2024 será divulgado em janeiro",
      descricao:
        "O Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (Inep) confirmou que as notas individuais do ENEM 2024 serão disponibilizadas no final de janeiro.",
      categoria: "ENEM",
      data: "2025-01-15",
      tempo: "há 2 dias",
      urgente: true,
      imagem: "/placeholder.svg",
      autor: "Ministério da Educação",
      visualizacoes: 15420,
      conteudoCompleto: `
        <p class="mb-4 text-lg leading-relaxed">O Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (Inep) confirmou que as notas individuais do Exame Nacional do Ensino Médio (ENEM) 2024 serão disponibilizadas na Página do Participante no final de janeiro de 2025.</p>
        
        <h3 class="text-2xl font-bold mb-4 mt-8 text-foreground">Cronograma de Divulgação</h3>
        
        <p class="mb-4 leading-relaxed">Segundo o cronograma oficial, os resultados estarão disponíveis a partir do dia <strong>27 de janeiro de 2025, às 10h</strong> (horário de Brasília). Os participantes poderão acessar suas notas através do portal oficial do Inep, utilizando CPF e senha cadastrada.</p>
        
        <h3 class="text-2xl font-bold mb-4 mt-8 text-foreground">Como Acessar o Resultado</h3>
        
        <p class="mb-3 leading-relaxed">Para consultar o resultado, siga os seguintes passos:</p>
        <ul class="list-disc ml-6 mb-6 space-y-2">
          <li class="leading-relaxed">Acesse o <strong>site oficial do Inep</strong></li>
          <li class="leading-relaxed">Faça login na <strong>Página do Participante</strong></li>
          <li class="leading-relaxed">Insira seu <strong>CPF e senha</strong> cadastrados</li>
          <li class="leading-relaxed">Clique em <strong>"Resultado do ENEM 2024"</strong></li>
        </ul>
        
        <h3 class="text-2xl font-bold mb-4 mt-8 text-foreground">Próximos Passos: Use sua Nota</h3>
        
        <p class="mb-3 leading-relaxed">Com o resultado em mãos, os estudantes poderão se inscrever em diversos programas de acesso ao ensino superior:</p>
        <ul class="list-disc ml-6 mb-6 space-y-2">
          <li class="leading-relaxed"><strong>SISU</strong> - Sistema de Seleção Unificada para universidades públicas</li>
          <li class="leading-relaxed"><strong>ProUni</strong> - Programa Universidade para Todos para bolsas em instituições privadas</li>
          <li class="leading-relaxed"><strong>FIES</strong> - Fundo de Financiamento Estudantil</li>
        </ul>
        
        <p class="mb-6 leading-relaxed bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 p-4 rounded">
          <strong>Fique Atento:</strong> As inscrições para o SISU 2025 começam em fevereiro, logo após a divulgação das notas. É importante que os candidatos fiquem atentos aos prazos e documentos necessários.
        </p>
        
        <h3 class="text-2xl font-bold mb-4 mt-8 text-foreground">Dicas Importantes</h3>
        
        <p class="mb-3 leading-relaxed">O Inep recomenda que os participantes:</p>
        <ul class="list-disc ml-6 mb-6 space-y-2">
          <li class="leading-relaxed">Mantenham seus <strong>dados atualizados</strong> na Página do Participante</li>
          <li class="leading-relaxed">Anotem suas notas para facilitar <strong>inscrições futuras</strong></li>
          <li class="leading-relaxed">Pesquisem previamente os <strong>cursos e instituições</strong> de interesse</li>
          <li class="leading-relaxed">Fiquem atentos aos <strong>cronogramas dos programas</strong> de acesso ao ensino superior</li>
        </ul>
        
        <p class="mt-6 p-4 bg-muted rounded-lg leading-relaxed">
          <strong>Precisa de Ajuda?</strong> Para mais informações, os candidatos podem acessar o site oficial do Inep ou entrar em contato com a Central de Atendimento através do telefone <strong>0800 616 161</strong>.
        </p>
      `,
      tags: ["ENEM", "Resultado", "Educação", "Ensino Superior"],
      fontes: [
        { nome: "Portal do Inep", url: "https://www.gov.br/inep" },
        { nome: "Ministério da Educação", url: "https://www.gov.br/mec" },
      ],
    },
    "2": {
      id: 2,
      titulo: "Inscrições abertas para concurso da PRF 2025",
      descricao:
        "A Polícia Rodoviária Federal oficializou a abertura das inscrições para o concurso público 2025, oferecendo 1.000 vagas.",
      categoria: "Concursos",
      data: "2025-01-10",
      tempo: "há 1 semana",
      urgente: false,
      imagem: "/placeholder.svg",
      autor: "Polícia Rodoviária Federal",
      visualizacoes: 8932,
      conteudoCompleto: `
        <p class="mb-4">A Polícia Rodoviária Federal (PRF) oficializou a abertura das inscrições para o concurso público 2025, oferecendo 1.000 vagas para o cargo de Policial Rodoviário Federal, com salário inicial de R$ 9.899,88.</p>
        
        <h3 class="text-xl font-semibold mb-3 text-foreground">Detalhes do Concurso</h3>
        
        <p class="mb-4">O concurso oferece excelentes benefícios e oportunidades de crescimento na carreira policial. As vagas estão distribuídas em todas as regiões do país, priorizando a interiorização do serviço público federal.</p>
        
        <h3 class="text-xl font-semibold mb-3 text-foreground">Requisitos para Participação</h3>
        
        <ul class="list-disc ml-6 mb-4">
          <li>Ensino superior completo em qualquer área</li>
          <li>Idade mínima de 18 anos</li>
          <li>Carteira Nacional de Habilitação categoria B</li>
          <li>Altura mínima de 1,65m para homens e 1,60m para mulheres</li>
          <li>Aptidão física e mental para o exercício do cargo</li>
        </ul>
        
        <h3 class="text-xl font-semibold mb-3 text-foreground">Etapas do Concurso</h3>
        
        <p class="mb-4">O processo seletivo será composto por:</p>
        <ol class="list-decimal ml-6 mb-4">
          <li>Prova objetiva (eliminatória e classificatória)</li>
          <li>Prova discursiva (eliminatória e classificatória)</li>
          <li>Exame de aptidão física (eliminatório)</li>
          <li>Avaliação psicológica (eliminatória)</li>
          <li>Investigação social (eliminatória)</li>
          <li>Exame médico (eliminatório)</li>
        </ol>
        
        <p class="mb-4">As inscrições podem ser realizadas até o dia 28 de fevereiro de 2025, exclusivamente pelo site da organizadora do concurso. A taxa de inscrição é de R$ 180,00.</p>
      `,
      tags: ["PRF", "Concurso Público", "Policial", "Segurança Pública"],
      fontes: [
        { nome: "Portal da PRF", url: "https://www.gov.br/prf" },
        { nome: "Edital Oficial", url: "#" },
      ],
    },
  }), []);

  const { noticia, noticiasRelacionadas } = useMemo(() => {
    if (!id) {
      return { noticia: null as NoticiaView | null, noticiasRelacionadas: [] as NoticiaView[] };
    }

    let storedNews =
      NewsStorageService.getNews(id) ??
      staticNoticias[id as keyof typeof staticNoticias];

    if (!storedNews) {
      return { noticia: null as NoticiaView | null, noticiasRelacionadas: [] as NoticiaView[] };
    }

    if ("conteudoCompleto" in storedNews && !storedNews.conteudoCompleto) {
      storedNews = {
        ...storedNews,
        conteudoCompleto: generateFallbackContent(storedNews),
        autor: storedNews.autor || "Portal de Educação",
        visualizacoes: storedNews.visualizacoes || Math.floor(Math.random() * 50000) + 1000,
        tags: storedNews.tags || [storedNews.categoria, "Educação"],
        fontes: storedNews.fontes || [{ nome: "Portal de Educação", url: "#" }],
      };
    }

    const related = (NewsStorageService.getAllNews() as NoticiaView[])
      .filter((n) => String(n.id) !== id && n.categoria === storedNews.categoria)
      .slice(0, 6);

    return {
      noticia: storedNews as NoticiaView,
      noticiasRelacionadas: related,
    };
  }, [id, staticNoticias]);

  if (!noticia) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Notícia não encontrada</h1>
          <Button onClick={() => router.push("/noticias")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Notícias
          </Button>
        </div>
      </div>
    );
  }

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

  const handleSalvarNoticia = (noticia: NoticiaView) => {
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

    const noticiaId = Number(noticia.id);
    if (!Number.isFinite(noticiaId)) {
      toast({
        title: "Erro ao salvar",
        description: "NÃ£o foi possÃ­vel identificar esta notÃ­cia.",
        variant: "destructive",
      });
      return;
    }

    const noticiaFavorito = {
      id: noticiaId,
      titulo: noticia.titulo,
      descricao: noticia.descricao,
      categoria: noticia.categoria,
      data: noticia.data,
      tipo: "noticia" as const,
    };

    if (isFavorito(noticiaId, "noticia")) {
      removerFavorito(noticiaId, "noticia");
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

  return (
    <div className="min-h-screen bg-background">
      

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Botão Voltar */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/noticias")} className="hover:bg-accent">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Notícias
          </Button>
        </div>

        {/* Header da Notícia */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={`${getCategoriaColor(noticia.categoria)} text-white`}>{noticia.categoria}</Badge>
              {noticia.urgente && <Badge variant="destructive">Urgente</Badge>}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">{noticia.titulo}</h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(noticia.data).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {noticia.tempo}
              </div>
              {noticia.visualizacoes && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {noticia.visualizacoes.toLocaleString("pt-BR")} visualizações
                </div>
              )}
              {noticia.autor && <div>Por {noticia.autor}</div>}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSalvarNoticia(noticia)}
                className={!user ? "opacity-70" : ""}
              >
                {isFavorito(Number(noticia.id), "noticia") ? (
                  <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-2" />
                )}
                {!user ? "Login p/ salvar" : isFavorito(Number(noticia.id), "noticia") ? "Salvo" : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo da Notícia */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {/* 
              SECURITY NOTE: Using dangerouslySetInnerHTML with trusted content only.
              Content is generated internally by AINewsService or validated static data.
              WARNING: If external or user-generated content is added in the future,
              implement HTML sanitization using DOMPurify to prevent XSS attacks.
            */}

            <div
              className="prose prose-lg max-w-none text-foreground ..."
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(
                  noticia.conteudoCompleto || noticia.conteudo || `<p>${escapeHtml(noticia.descricao)}</p>`,
                ),
              }}
            />
          </CardContent>
        </Card>

        {/* Tags e Fontes */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Tags - sempre exibe */}
              <div>
                <h3 className="font-semibold mb-2">Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {(noticia.tags && noticia.tags.length > 0 ? noticia.tags : [noticia.categoria, "Educação"]).map(
                    (tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ),
                  )}
                </div>
              </div>

              {noticia.fontes && noticia.fontes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Fontes:</h3>
                    <div className="space-y-2">
                      {noticia.fontes.map((fonte, index) => {
                        const fonteName = typeof fonte === "string" ? fonte : fonte.nome;
                        const fonteUrl = typeof fonte === "string" ? "#" : fonte.url;

                        return (
                          <div key={index}>
                            <a
                              href={fonteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {fonteName}
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notícias Relacionadas - mostra se tiver pelo menos 1 */}
        {noticiasRelacionadas.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Notícias Relacionadas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {noticiasRelacionadas.slice(0, 6).map((relatedNews) => (
                  <div
                    key={relatedNews.id}
                    onClick={() => router.push(`/noticia/${relatedNews.id}`)}
                    className="flex items-start gap-3 p-4 rounded-lg hover:bg-accent cursor-pointer transition-colors border border-border group"
                  >
                    <div className="flex-1">
                      <Badge className={`${getCategoriaColor(relatedNews.categoria)} text-white text-xs mb-2`}>
                        {relatedNews.categoria}
                      </Badge>
                      <h4 className="text-sm font-medium group-hover:text-primary line-clamp-2">
                        {relatedNews.titulo}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">{relatedNews.tempo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default NoticiaDetalhes;


