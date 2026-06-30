"use client";

import {
  Shield,
  Search,
  Printer,
  Link2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  Cookie,
  Settings,
  Building2,
  List,
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { usePageSettings } from "@/hooks/usePageSettings";
import { useLegalPage } from "@/hooks/useLegalSections";
import { useLegalVersionHistory } from "@/hooks/useLegalVersionHistory";
import { sanitizeHtml, safeHighlight } from "@/lib/utils";

const cookiesData = [
  {
    categoria: "Essenciais",
    descricao: "Necessários para o funcionamento básico e segurança da plataforma",
    cookies: [
      { nome: "cookieConsent", finalidade: "Armazena suas preferências de consentimento de cookies", duracao: "365 dias", provedor: "PqEstudar" },
      { nome: "session_id", finalidade: "Mantém sua sessão de login ativa", duracao: "Sessão", provedor: "PqEstudar" },
      { nome: "_csrf", finalidade: "Proteção contra ataques CSRF", duracao: "Sessão", provedor: "PqEstudar" },
    ],
  },
  {
    categoria: "Desempenho e Análise",
    descricao: "Ajudam a entender como os visitantes usam o site para melhorias",
    cookies: [
      { nome: "_ga", finalidade: "Google Analytics - Distingue usuários", duracao: "2 anos", provedor: "Google" },
      { nome: "_ga_*", finalidade: "Google Analytics - Mantém estado da sessão", duracao: "2 anos", provedor: "Google" },
      { nome: "_gid", finalidade: "Google Analytics - Distingue usuários", duracao: "24 horas", provedor: "Google" },
    ],
  },
  {
    categoria: "Funcionais",
    descricao: "Lembram suas preferências e configurações personalizadas",
    cookies: [
      { nome: "theme_preference", finalidade: "Armazena sua preferência de tema (claro/escuro)", duracao: "365 dias", provedor: "PqEstudar" },
      { nome: "lang_preference", finalidade: "Armazena sua preferência de idioma", duracao: "365 dias", provedor: "PqEstudar" },
    ],
  },
  {
    categoria: "Marketing",
    descricao: "Permitem exibir, limitar, medir e, com consentimento, personalizar anúncios",
    cookies: [
      { nome: "__gads / __gpi", finalidade: "Exibição, limitação de frequência e medição de anúncios", duracao: "Definida pelo Google", provedor: "Google AdSense" },
      { nome: "IDE e similares", finalidade: "Entrega e medição de publicidade em domínios do Google ou DoubleClick", duracao: "Definida pelo Google", provedor: "Google / DoubleClick" },
      { nome: "utm_*", finalidade: "Rastreamento de campanhas de marketing", duracao: "30 dias", provedor: "PqEstudar" },
    ],
  },
];

const ADSENSE_POLICY_UPDATED_AT = "2026-06-30T00:00:00-03:00";

export default function PrivacidadeNext() {
  const pathname = usePathname();
  const ps = usePageSettings("/privacidade");
  const { document: doc, sections, isLoading, error } = useLegalPage("/privacidade");
  const latestUpdatedAt =
    [ADSENSE_POLICY_UPDATED_AT, doc?.updated_at, ...sections.map((section) => section.updated_at)]
      .filter((date): date is string => Boolean(date))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
  const { data: legalVersionHistory = [] } = useLegalVersionHistory("/privacidade", latestUpdatedAt);

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("");
  const [showCookiePreferences, setShowCookiePreferences] = useState(false);
  const [expandedCookieCategories, setExpandedCookieCategories] = useState<string[]>([]);
  const [showMobileTOC, setShowMobileTOC] = useState(false);
  const { toast } = useToast();
  const { consentData, acceptAll, acceptNecessaryOnly, updatePreferences } = useCookieConsent();

  const updatedAt = latestUpdatedAt
    ? new Date(latestUpdatedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const [cookiePrefs, setCookiePrefs] = useState({
    necessary: true,
    analytics: consentData?.preferences?.analytics || false,
    functional: consentData?.preferences?.functional || false,
    marketing: consentData?.preferences?.marketing || false,
  });

  useEffect(() => {
    if (sections.length === 0) return;
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetBottom = offsetTop + element.offsetHeight;
          if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
            if (activeSection !== section.id) setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection, sections]);

  const handleExpandAll = () => {
    setExpandedItems(sections.map((s) => s.id));
    toast({ title: "Todas as seções expandidas" });
  };

  const handleCollapseAll = () => {
    setExpandedItems([]);
    toast({ title: "Todas as seções recolhidas" });
  };

  const handlePrint = () => {
    if (doc?.pdf_url) {
      window.open(doc.pdf_url, "_blank");
    } else {
      window.print();
    }
  };

  const handleCopyLink = (sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "O link da seção foi copiado para a área de transferência." });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredSections = sections.filter(
    (section) =>
      searchTerm === "" ||
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const highlightText = (text: string) => {
    if (!text) return "";
    return safeHighlight(text, searchTerm);
  };

  const handleAcceptAllCookies = () => {
    acceptAll();
    setCookiePrefs({ necessary: true, analytics: true, functional: true, marketing: true });
    setShowCookiePreferences(false);
    toast({ title: "Preferências salvas", description: "Todos os cookies foram aceitos." });
  };

  const handleRejectNonEssential = () => {
    acceptNecessaryOnly();
    setCookiePrefs({ necessary: true, analytics: false, functional: false, marketing: false });
    setShowCookiePreferences(false);
    toast({ title: "Preferências salvas", description: "Apenas cookies essenciais foram aceitos." });
  };

  const handleSaveCookiePreferences = () => {
    updatePreferences({
      necessary: true,
      analytics: cookiePrefs.analytics,
      functional: cookiePrefs.functional,
      marketing: cookiePrefs.marketing,
    });
    setShowCookiePreferences(false);
    toast({ title: "Preferências salvas", description: "Suas preferências de cookies foram atualizadas." });
  };

  const handleDownloadPDF = () => {
    if (doc?.pdf_url) {
      window.open(doc.pdf_url, "_blank");
    } else {
      toast({ title: "Funcionalidade em breve", description: "O download em PDF estará disponível em breve." });
    }
  };

  if (error) {
    console.error("[Privacidade] Erro ao carregar dados:", error);
  }

  if (pathname !== "/privacidade") return null;

  return (
    <div className="flex-1 flex flex-col">
      <PageHero
        title="Política de **Privacidade**"
        description={ps.headerDescription}
        isLoading={ps.isLoading}
        badge={
          <Badge variant="secondary" className="mb-4">
            <Shield className="w-3 h-3 mr-1" />
            Última atualização: {updatedAt}
          </Badge>
        }
      />

      <main className="flex-1 w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            <aside className="hidden lg:block">
              <Skeleton className="h-64 w-full rounded-xl" />
            </aside>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            <div className="lg:hidden mb-6">
              <Button
                onClick={() => setShowMobileTOC(!showMobileTOC)}
                variant="outline"
                className="w-full justify-between"
              >
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span>Índice de Conteúdo</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMobileTOC ? "rotate-180" : ""}`} />
              </Button>
              {showMobileTOC && (
                <Card className="mt-2 p-4">
                  <nav className="space-y-2">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => {
                          scrollToSection(section.id);
                          setShowMobileTOC(false);
                        }}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          activeSection === section.id
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </nav>
                </Card>
              )}
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Índice
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                          activeSection === section.id
                            ? "bg-primary text-primary-foreground font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </aside>

            <div className="space-y-8">
              <Card className="shadow-lg border-2">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Navegação e Ferramentas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar na política..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleExpandAll} className="w-full sm:w-auto justify-start sm:justify-center">
                      <ChevronDown className="h-4 w-4 mr-1" />
                      <span>Expandir Tudo</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCollapseAll} className="w-full sm:w-auto justify-start sm:justify-center">
                      <ChevronUp className="h-4 w-4 mr-1" />
                      <span>Recolher Tudo</span>
                    </Button>
                    {doc?.pdf_url ? (
                      <Button variant="outline" size="sm" onClick={handlePrint} className="w-full sm:w-auto justify-start sm:justify-center">
                        <Printer className="h-4 w-4 mr-1" />
                        <span>Imprimir/PDF</span>
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-full sm:w-auto">
                            <Button variant="outline" size="sm" disabled className="w-full sm:w-auto justify-start sm:justify-center">
                              <Printer className="h-4 w-4 mr-1" />
                              <span>Imprimir/PDF</span>
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>PDF não configurado</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </CardContent>
              </Card>

              {sections.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Conteúdo em atualização. Volte em breve.</p>
                </div>
              ) : (
                <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-4">
                  {filteredSections.map((section) => (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AccordionItem
                        value={section.id}
                        id={section.id}
                        className="border-2 rounded-2xl shadow-md px-4 sm:px-6 bg-card"
                      >
                        <AccordionTrigger className="text-base sm:text-lg font-semibold hover:no-underline py-4 sm:py-6">
                          <div className="flex items-center justify-between w-full pr-2 sm:pr-4 gap-2">
                            <span
                              className="text-left break-words flex-1"
                              dangerouslySetInnerHTML={{ __html: highlightText(section.title || "") }}
                            />
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label="Copiar link"
                              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(section.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter" && e.key !== " ") return;
                                e.preventDefault();
                                e.stopPropagation();
                                handleCopyLink(section.id);
                              }}
                            >
                              <Link2 className="h-4 w-4" />
                              <span className="sr-only">Copiar link</span>
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-4 sm:pb-6 pt-2 leading-relaxed [&>div]:break-words">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content || "") }} />
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              )}

              <Card id="publicidade-google-adsense" className="shadow-lg border-2 scroll-mt-24">
                <Accordion type="single" collapsible>
                  <AccordionItem value="google-adsense" className="border-0">
                    <AccordionTrigger className="px-6 py-5 hover:no-underline sm:px-8 sm:py-6">
                      <div className="flex flex-col items-start gap-1 text-left">
                        <span className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                          <Shield className="h-6 w-6" />
                          Publicidade e Google AdSense
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Como dados e tecnologias de publicidade podem ser utilizados no PqEstudar
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 px-6 pb-6 text-sm leading-relaxed text-muted-foreground sm:px-8 sm:text-base">
                  <p>
                    O PqEstudar pode exibir anúncios fornecidos pelo Google AdSense. Fornecedores terceiros,
                    incluindo o Google, podem inserir ou ler cookies no seu navegador e utilizar web beacons,
                    endereço IP ou outros identificadores em consequência da exibição de anúncios neste site.
                  </p>
                  <p>
                    O Google e seus parceiros usam cookies de publicidade para exibir, limitar a frequência,
                    medir e combater fraudes em anúncios. Quando você autoriza cookies de marketing, essas
                    tecnologias também podem ser usadas para personalizar anúncios com base em visitas ao
                    PqEstudar e a outros sites. Sem essa autorização, os anúncios podem ser contextuais ou não
                    personalizados, conforme as configurações e exigências aplicáveis.
                  </p>
                  <p>
                    Dados relacionados à navegação e à interação com anúncios podem ser compartilhados com o
                    Google para essas finalidades. Não enviamos ao Google, para personalização de anúncios,
                    informações que identifiquem você diretamente, como nome ou endereço de e-mail.
                  </p>
                  <p>
                    Saiba mais sobre{" "}
                    <a
                      href="https://business.safety.google/privacy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      como o Google usa dados em sites e aplicativos de parceiros
                    </a>
                    {" "}e consulte a{" "}
                    <a
                      href="https://policies.google.com/privacy?hl=pt-BR"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      Política de Privacidade do Google
                    </a>
                    .
                  </p>
                  <p>
                    Você pode desativar a personalização de anúncios nas{" "}
                    <a
                      href="https://adssettings.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      Configurações de anúncios do Google
                    </a>
                    {" "}e alterar sua escolha para cookies de marketing a qualquer momento nas{" "}
                    <a href="/configuracoes-cookies" className="font-medium text-primary underline underline-offset-4">
                      Configurações de Cookies do PqEstudar
                    </a>
                    .
                  </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <Card className="shadow-lg border-2">
                <Accordion type="single" collapsible>
                  <AccordionItem value="tabela-cookies" className="border-0">
                    <AccordionTrigger className="px-6 py-5 hover:no-underline sm:px-8 sm:py-6">
                      <div className="flex flex-col items-start gap-1 text-left">
                        <span className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                          <Cookie className="h-6 w-6" />
                          Tabela Detalhada de Cookies
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Clique para consultar os cookies utilizados por categoria
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="space-y-6 px-6 pb-6 pt-0 sm:px-8">
                  <Accordion
                    type="multiple"
                    value={expandedCookieCategories}
                    onValueChange={setExpandedCookieCategories}
                    className="space-y-3"
                  >
                    {cookiesData.map((category, idx) => (
                      <AccordionItem key={idx} value={category.categoria} className="border-2 rounded-xl overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
                          <div className="flex items-center gap-3 flex-1 text-left pr-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm sm:text-base break-words">
                                  {category.categoria}
                                </span>
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  {category.cookies.length} {category.cookies.length === 1 ? "cookie" : "cookies"}
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                                {category.descricao}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-3 bg-card/50">
                          <div className="hidden md:block overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Finalidade</TableHead>
                                  <TableHead>Duração</TableHead>
                                  <TableHead>Provedor</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {category.cookies.map((cookie, cIdx) => (
                                  <TableRow key={cIdx}>
                                    <TableCell className="font-mono text-sm">{cookie.nome}</TableCell>
                                    <TableCell>{cookie.finalidade}</TableCell>
                                    <TableCell>{cookie.duracao}</TableCell>
                                    <TableCell>{cookie.provedor}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="md:hidden space-y-3">
                            {category.cookies.map((cookie, cIdx) => (
                              <Card key={cIdx} className="p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm font-semibold break-all">{cookie.nome}</span>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">{cookie.duracao}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground break-words">{cookie.finalidade}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3 flex-shrink-0" />
                                  <span className="break-words">{cookie.provedor}</span>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <div className="mt-6 text-center">
                    <Dialog open={showCookiePreferences} onOpenChange={setShowCookiePreferences}>
                      <DialogTrigger asChild>
                        <Button variant="premium" size="lg" className="w-full sm:w-auto">
                          <Settings className="h-5 w-5 mr-2" />
                          Gerenciar Preferências de Cookies
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Cookie className="h-6 w-6" />
                            Centro de Preferências de Cookies
                          </DialogTitle>
                          <DialogDescription>Gerencie suas preferências de cookies por categoria</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                              <div className="space-y-1 flex-1">
                                <Label htmlFor="necessary" className="text-base font-semibold">Cookies Essenciais</Label>
                                <p className="text-sm text-muted-foreground">Necessários para o funcionamento básico do site. Sempre ativos.</p>
                              </div>
                              <Switch id="necessary" checked={true} disabled />
                            </div>
                            <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                              <div className="space-y-1 flex-1">
                                <Label htmlFor="analytics" className="text-base font-semibold">Cookies de Análise</Label>
                                <p className="text-sm text-muted-foreground">Nos ajudam a entender como você usa o site.</p>
                              </div>
                              <Switch id="analytics" checked={cookiePrefs.analytics} onCheckedChange={(checked) => setCookiePrefs((prev) => ({ ...prev, analytics: checked }))} />
                            </div>
                            <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                              <div className="space-y-1 flex-1">
                                <Label htmlFor="functional" className="text-base font-semibold">Cookies Funcionais</Label>
                                <p className="text-sm text-muted-foreground">Permitem funcionalidades avançadas e personalização.</p>
                              </div>
                              <Switch id="functional" checked={cookiePrefs.functional} onCheckedChange={(checked) => setCookiePrefs((prev) => ({ ...prev, functional: checked }))} />
                            </div>
                            <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                              <div className="space-y-1 flex-1">
                                <Label htmlFor="marketing" className="text-base font-semibold">Cookies de Marketing</Label>
                                <p className="text-sm text-muted-foreground">Usados para exibir anúncios relevantes.</p>
                              </div>
                              <Switch id="marketing" checked={cookiePrefs.marketing} onCheckedChange={(checked) => setCookiePrefs((prev) => ({ ...prev, marketing: checked }))} />
                            </div>
                          </div>
                          <Separator />
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button variant="success" className="flex-1" onClick={handleAcceptAllCookies}>Aceitar Todos</Button>
                            <Button variant="outline" className="flex-1" onClick={handleRejectNonEssential}>Apenas Essenciais</Button>
                            <Button variant="premium" className="flex-1" onClick={handleSaveCookiePreferences}>Salvar Preferências</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                      </CardContent>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <Card className="shadow-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <Accordion type="single" collapsible>
                  <AccordionItem value="direitos-lgpd" className="border-0">
                    <AccordionTrigger className="px-6 py-5 hover:no-underline sm:px-8 sm:py-6">
                      <div className="flex flex-col items-start gap-1 text-left">
                        <span className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                          <Shield className="h-6 w-6" />
                          Seus Direitos (LGPD)
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          Você tem direitos garantidos pela Lei Geral de Proteção de Dados
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <CardContent className="space-y-4 px-6 pb-6 pt-0 sm:px-8">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start h-auto py-3">
                      <Eye className="h-5 w-5 mr-2 shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold">Acessar Dados</div>
                        <div className="text-xs text-muted-foreground">Veja seus dados armazenados</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3">
                      <Edit className="h-5 w-5 mr-2 shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold">Corrigir Dados</div>
                        <div className="text-xs text-muted-foreground">Atualize informações incorretas</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3">
                      <Trash2 className="h-5 w-5 mr-2 shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold">Excluir/Revogar</div>
                        <div className="text-xs text-muted-foreground">Remova seus dados</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto py-3" onClick={handleDownloadPDF}>
                      <Download className="h-5 w-5 mr-2 shrink-0" />
                      <div className="text-left">
                        <div className="font-semibold">Baixar PDF</div>
                        <div className="text-xs text-muted-foreground">Salve esta política</div>
                      </div>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Para exercer seus direitos, entre em contato: <strong>privacidade@pqestudar.com</strong>
                  </p>
                      </CardContent>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>

              <Card className="shadow-lg border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Histórico de Versões
                  </CardTitle>
                  <CardDescription>Acompanhe as mudanças em nossa política ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {legalVersionHistory.map((version, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-3 w-3 rounded-full ${idx === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          {idx < legalVersionHistory.length - 1 && <div className="w-0.5 h-full bg-muted-foreground/20 mt-1" />}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={version.isCurrent ? "default" : "secondary"} className="text-xs">{version.date}</Badge>
                            {version.isCurrent && <Badge className="bg-emerald-600 text-white">Atual</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{version.changes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-2 bg-gradient-to-br from-accent/10 to-background">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl">Entre em Contato</CardTitle>
                  <CardDescription>Dúvidas sobre privacidade? Nossa equipe está pronta para ajudar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      E-mail
                    </h4>
                    <a href="mailto:privacidade@pqestudar.com" className="text-primary hover:underline break-all font-medium">
                      privacidade@pqestudar.com
                    </a>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" asChild className="flex-1 justify-start sm:justify-center">
                      <a href="/termos">
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Termos de Uso
                      </a>
                    </Button>
                    <Button variant="outline" asChild className="flex-1 justify-start sm:justify-center">
                      <a href="/configuracoes-cookies">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurações de Cookies
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
