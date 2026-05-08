"use client";

import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FileText,
  Search,
  ChevronUp,
  ChevronDown,
  Printer,
  Link2,
  AlertTriangle,
  Mail,
  Shield,
  Cookie,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHero } from "@/components/layout/PageHero";
import { toast } from "@/hooks/use-toast";
import { cn, sanitizeHtml } from "@/lib/utils";
import { usePageSettings } from "@/hooks/usePageSettings";
import { useLegalPage } from "@/hooks/useLegalSections";

export default function TermosNext() {
  const ps = usePageSettings("/termos");
  const { document: doc, sections, isLoading, error } = useLegalPage("/termos");

  const updatedAt = doc?.updated_at
    ? new Date(doc.updated_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const filteredSections = sections.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const url = `${window.location.origin}/termos#${sectionId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "Link da seção copiado para a área de transferência." });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (error) {
    console.error("[Termos] Erro ao carregar dados:", error);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHero
        title={ps.headerTitle}
        description={ps.headerDescription}
        isLoading={ps.isLoading}
        badge={
          <Badge variant="secondary" className="mb-4">
            <FileText className="w-3 h-3 mr-1" />
            Última atualização: {updatedAt}
          </Badge>
        }
      />

      <main className="flex-1 container mx-auto px-6 py-10">
        {isLoading ? (
          <div className="grid lg:grid-cols-[300px,1fr] gap-8 lg:gap-12">
            <aside className="hidden lg:block">
              <Skeleton className="h-64 w-full rounded-xl" />
            </aside>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Conteúdo em atualização. Volte em breve.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[300px,1fr] gap-8 lg:gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start hidden lg:block">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Índice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <nav className="space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-all hover:bg-accent",
                          activeSection === section.id
                            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {section.title}
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </aside>

            <div className="space-y-8" ref={contentRef}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar nos termos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleExpandAll} className="gap-2">
                    <ChevronDown className="w-4 h-4" />
                    Expandir Tudo
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCollapseAll} className="gap-2">
                    <ChevronUp className="w-4 h-4" />
                    Recolher Tudo
                  </Button>
                  {doc?.pdf_url ? (
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                      <Printer className="w-4 h-4" />
                      Imprimir/PDF
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="outline" size="sm" disabled className="gap-2">
                            <Printer className="w-4 h-4" />
                            Imprimir/PDF
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>PDF não configurado</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-l-4 border-l-primary bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">Aviso Importante</h3>
                        <p className="text-sm text-muted-foreground">
                          Ao utilizar nossos serviços, você concorda integralmente com estes termos. Leia com atenção
                          as seções que definem suas responsabilidades e direitos.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Accordion
                  type="multiple"
                  value={expandedItems}
                  onValueChange={setExpandedItems}
                  className="space-y-4"
                >
                  {filteredSections.map((section, index) => (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <AccordionItem
                        value={section.id}
                        id={section.id}
                        className="border-2 rounded-2xl px-6 scroll-mt-24"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-6">
                          <div className="flex items-start justify-between w-full pr-4">
                            <span className="font-semibold text-lg">{section.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(section.id);
                              }}
                              className="shrink-0 gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Link2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed pb-6 pt-2">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }} />
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="border-2 bg-gradient-to-br from-primary/5 to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Ainda tem dúvidas?
                    </CardTitle>
                    <CardDescription>Nossa equipe está pronta para ajudar você.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button asChild className="gap-2">
                        <a href="mailto:pqestudar.suporte@gmail.com">
                          <Mail className="w-4 h-4" />
                          Entrar em Contato
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="gap-2">
                        <a href="/privacidade">
                          <Shield className="w-4 h-4" />
                          Política de Privacidade
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="gap-2">
                        <a href="/configuracoes-cookies">
                          <Cookie className="w-4 h-4" />
                          Configurações de Cookies
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
