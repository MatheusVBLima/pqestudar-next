"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  HelpCircle,
  Mail,
  RefreshCw,
  ShoppingBag,
  Trophy,
  UserRound,
  Vote,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const faqs = [
  {
    id: "faq-1",
    eyebrow: "Plataforma",
    icon: BookOpen,
    question: "O que é o PqEstudar e para quem ele foi feito?",
    answerText:
      "Uma plataforma gratuita que reúne ferramentas para estudar, concursos públicos e recursos educacionais num só lugar. Feita para quem quer se organizar melhor e aproveitar cada hora de estudo.",
    answer:
      "Uma plataforma gratuita que reúne ferramentas para estudar, concursos públicos e recursos educacionais num só lugar. Feita para quem quer se organizar melhor e aproveitar cada hora de estudo.",
  },
  {
    id: "faq-2",
    eyebrow: "Acesso",
    icon: UserRound,
    question: "Preciso pagar ou criar conta para usar?",
    answerText:
      "Não. Todo o conteúdo público é gratuito e acessível sem cadastro. A conta é opcional — serve para salvar seus itens favoritos e acompanhar novidades.",
    answer:
      "Não. Todo o conteúdo público é gratuito e acessível sem cadastro. A conta é opcional — serve para salvar seus itens favoritos e acompanhar novidades.",
  },
  {
    id: "faq-3",
    eyebrow: "Ferramentas",
    icon: Wrench,
    question: "Que tipo de ferramentas para estudos estão disponíveis?",
    answerText:
      "Ferramentas de produtividade, organização e aprendizado, filtradas por categoria. Você acessa direto, sem intermediários.",
    answer: (
      <>
        Ferramentas de produtividade, organização e aprendizado, filtradas por categoria. Você acessa direto, sem intermediários.{" "}
        <Link href="/ferramentas" className="text-primary underline underline-offset-2 hover:text-primary/80">
          Explorar ferramentas →
        </Link>
      </>
    ),
  },
  {
    id: "faq-4",
    eyebrow: "Concursos",
    icon: Trophy,
    question: "Como acompanho concursos públicos abertos pelo PqEstudar?",
    answerText:
      "A seção de concursos reúne oportunidades com filtros por área, escolaridade e situação. Cada concurso tem página própria com detalhes e link para o edital.",
    answer: (
      <>
        A seção de concursos reúne oportunidades com filtros por área, escolaridade e situação. Cada concurso tem página própria com detalhes e link para o edital.{" "}
        <Link href="/concursos" className="text-primary underline underline-offset-2 hover:text-primary/80">
          Ver concursos →
        </Link>
      </>
    ),
  },
  {
    id: "faq-5",
    eyebrow: "Comunidade",
    icon: Vote,
    question: "O que posso fazer na página de Votações?",
    answerText:
      "Sugerir funcionalidades e votar nas que mais importam para você. É assim que a comunidade ajuda a decidir o que será desenvolvido.",
    answer: (
      <>
        Sugerir funcionalidades e votar nas que mais importam para você. É assim que a comunidade ajuda a decidir o que será desenvolvido.{" "}
        <Link href="/votacoes" className="text-primary underline underline-offset-2 hover:text-primary/80">
          Participar das votações →
        </Link>
      </>
    ),
  },
  {
    id: "faq-6",
    eyebrow: "Exclusivos",
    icon: ShoppingBag,
    question: "O que são os Exclusivos do PqEstudar?",
    answerText:
      "Guias e materiais prontos para acelerar seus estudos, criados pela equipe do PqEstudar.",
    answer: (
      <>
        Guias e materiais prontos para acelerar seus estudos, criados pela equipe do PqEstudar.{" "}
        <Link href="/exclusivos" className="text-primary underline underline-offset-2 hover:text-primary/80">
          Ver produtos →
        </Link>
      </>
    ),
  },
  {
    id: "faq-7",
    eyebrow: "Favoritos",
    icon: Bookmark,
    question: "Posso salvar ferramentas e concursos para consultar depois?",
    answerText:
      "Sim. Com uma conta gratuita, você salva qualquer ferramenta ou concurso e acessa tudo na sua área de favoritos.",
    answer:
      "Sim. Com uma conta gratuita, você salva qualquer ferramenta ou concurso e acessa tudo na sua área de favoritos.",
  },
  {
    id: "faq-8",
    eyebrow: "Novidades",
    icon: RefreshCw,
    question: "O PqEstudar é atualizado com frequência?",
    answerText:
      "Sim. Novas ferramentas, concursos e melhorias são adicionados regularmente com base no feedback da comunidade.",
    answer:
      "Sim. Novas ferramentas, concursos e melhorias são adicionados regularmente com base no feedback da comunidade.",
  },
  {
    id: "faq-9",
    eyebrow: "Contato",
    icon: Mail,
    question: "Como entro em contato se tiver uma dúvida?",
    answerText:
      "Por e-mail em pqestudar.suporte@gmail.com.",
    answer: (
      <>
        Por e-mail em{" "}
        <a
          href="mailto:pqestudar.suporte@gmail.com"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          pqestudar.suporte@gmail.com
        </a>
        .
      </>
    ),
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answerText,
    },
  })),
};

const ease = [0.16, 1, 0.3, 1] as const;

export function HomeFaqSectionNext() {
  return (
    <section className="pt-0 pb-16 md:pb-24">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
        <Separator className="mb-14 md:mb-20 bg-border/50" />

        <div className="rounded-[1.2rem] border border-border/40 bg-muted/30 p-6 md:p-10 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10"
          >
            <div>
              <Badge variant="secondary" className="mb-4 text-xs">
                <HelpCircle className="h-3 w-3 mr-1" />
                Dúvidas frequentes
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Perguntas Frequentes
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg">
                Respostas rápidas sobre como usar o PqEstudar.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <Accordion
              type="single"
              collapsible
              className="w-full space-y-3"
            >
              {faqs.map((faq) => {
                const Icon = faq.icon;

                return (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    className={cn(
                      "group overflow-hidden rounded-xl border border-border/60 bg-background/60 px-0 shadow-sm transition-all duration-300",
                      "hover:border-primary/25 hover:bg-background hover:shadow-md",
                      "data-[state=open]:border-primary/35 data-[state=open]:bg-primary/[0.035]",
                      "data-[state=open]:shadow-[0_18px_55px_-34px_hsl(var(--primary)/0.65)]",
                    )}
                  >
                    <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
                      <span className="flex min-w-0 items-center gap-4 pr-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/60 text-muted-foreground transition-colors group-data-[state=open]:border-primary/25 group-data-[state=open]:bg-primary/10 group-data-[state=open]:text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors group-data-[state=open]:text-primary">
                            {faq.eyebrow}
                          </span>
                          <span className="block text-[0.95rem] font-semibold leading-snug text-foreground">
                            {faq.question}
                          </span>
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 pt-0 sm:px-6">
                      <div className="rounded-lg border border-primary/10 bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground shadow-sm sm:ml-14">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Resposta rápida
                        </div>
                        <div className="[&_a]:font-semibold">{faq.answer}</div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <div className="mt-5 flex flex-col gap-4 rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Ainda ficou com dúvida?
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mande sua pergunta e a gente te ajuda pelo suporte.
                  </p>
                </div>
              </div>
              <Link
                href="mailto:pqestudar.suporte@gmail.com"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Falar com suporte
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
