"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    id: "faq-1",
    question: "O que é o PqEstudar e para quem ele foi feito?",
    answerText:
      "Uma plataforma gratuita que reúne ferramentas para estudar, concursos públicos e recursos educacionais num só lugar. Feita para quem quer se organizar melhor e aproveitar cada hora de estudo.",
    answer:
      "Uma plataforma gratuita que reúne ferramentas para estudar, concursos públicos e recursos educacionais num só lugar. Feita para quem quer se organizar melhor e aproveitar cada hora de estudo.",
  },
  {
    id: "faq-2",
    question: "Preciso pagar ou criar conta para usar?",
    answerText:
      "Não. Todo o conteúdo público é gratuito e acessível sem cadastro. A conta é opcional — serve para salvar seus itens favoritos e acompanhar novidades.",
    answer:
      "Não. Todo o conteúdo público é gratuito e acessível sem cadastro. A conta é opcional — serve para salvar seus itens favoritos e acompanhar novidades.",
  },
  {
    id: "faq-3",
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
    question: "O que são os Produtos do PqEstudar?",
    answerText:
      "Guias e materiais prontos para acelerar seus estudos, criados pela equipe do PqEstudar.",
    answer: (
      <>
        Guias e materiais prontos para acelerar seus estudos, criados pela equipe do PqEstudar.{" "}
        <Link href="/produtos" className="text-primary underline underline-offset-2 hover:text-primary/80">
          Ver produtos →
        </Link>
      </>
    ),
  },
  {
    id: "faq-7",
    question: "Posso salvar ferramentas e concursos para consultar depois?",
    answerText:
      "Sim. Com uma conta gratuita, você salva qualquer ferramenta ou concurso e acessa tudo na sua área de favoritos.",
    answer:
      "Sim. Com uma conta gratuita, você salva qualquer ferramenta ou concurso e acessa tudo na sua área de favoritos.",
  },
  {
    id: "faq-8",
    question: "O PqEstudar é atualizado com frequência?",
    answerText:
      "Sim. Novas ferramentas, concursos e melhorias são adicionados regularmente com base no feedback da comunidade.",
    answer:
      "Sim. Novas ferramentas, concursos e melhorias são adicionados regularmente com base no feedback da comunidade.",
  },
  {
    id: "faq-9",
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

      <div className="container mx-auto px-6">
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
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border border-border/60 rounded-xl px-5 bg-background/50"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5">
                    <span className="font-medium text-[0.95rem] leading-snug">
                      {faq.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5 text-sm">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
