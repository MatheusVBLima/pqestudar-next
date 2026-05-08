import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Perguntas Frequentes | PqEstudar",
  description:
    "Encontre respostas para as dúvidas mais comuns sobre cursos, certificados, inscrição e funcionamento da plataforma PqEstudar.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    id: "item-1",
    question: "Como faço para me inscrever em um curso?",
    answer:
      "Para se inscrever em um curso, navegue até a página 'Explorar Cursos', escolha o curso desejado e clique em 'Inscrever-se'. Você precisará criar uma conta se ainda não tiver uma.",
  },
  {
    id: "item-2",
    question: "Os cursos têm certificado?",
    answer:
      "Sim! Todos os nossos cursos oferecem certificado de conclusão. O certificado é emitido automaticamente quando você completa 100% do conteúdo do curso e passa na avaliação final.",
  },
  {
    id: "item-3",
    question: "Posso acessar os cursos pelo celular?",
    answer:
      "Sim, nossa plataforma é totalmente responsiva e otimizada para dispositivos móveis. Você pode acessar e estudar seus cursos a qualquer hora, em qualquer lugar.",
  },
  {
    id: "item-4",
    question: "Qual é a política de reembolso?",
    answer:
      "Oferecemos garantia de 30 dias. Se não ficar satisfeito com o curso, pode solicitar reembolso total dentro deste período através do nosso suporte.",
  },
  {
    id: "item-5",
    question: "Por quanto tempo tenho acesso ao curso?",
    answer:
      "Após a inscrição, você tem acesso vitalício ao curso. Pode revisitar o conteúdo quantas vezes quiser, no seu próprio ritmo.",
  },
  {
    id: "item-6",
    question: "Os cursos são ao vivo ou gravados?",
    answer:
      "A maioria dos nossos cursos são pré-gravados, permitindo que você estude no seu próprio ritmo. Alguns cursos especiais podem incluir sessões ao vivo com os instrutores.",
  },
  {
    id: "item-7",
    question: "Como funciona o sistema de ranking?",
    answer:
      "Nosso sistema de gamificação recompensa seu engajamento com pontos. Você ganha pontos completando lições, fazendo exercícios e participando da comunidade. Veja seu ranking na página 'Ranking da Comunidade'.",
  },
  {
    id: "item-8",
    question: "Posso baixar o conteúdo para estudar offline?",
    answer:
      "Alguns materiais como PDFs e exercícios podem ser baixados. O conteúdo em vídeo está disponível apenas online para proteger os direitos autorais dos instrutores.",
  },
  {
    id: "item-9",
    question: "Como entro em contato com o suporte?",
    answer:
      "Você pode acessar nosso suporte através da página 'Suporte' no menu principal, ou enviar um e-mail para suporte@pqestudar.com. Nossa equipe responde em até 24 horas.",
  },
  {
    id: "item-10",
    question: "Existe algum pré-requisito para os cursos?",
    answer:
      "Os pré-requisitos variam por curso e são claramente indicados na página de cada curso. Cursos básicos geralmente não têm pré-requisitos, enquanto cursos avançados podem exigir conhecimento prévio.",
  },
];

export default function FAQPage() {
  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <HelpCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Perguntas Frequentes</h1>
          <p className="text-xl text-muted-foreground">
            Encontre respostas para as dúvidas mais comuns sobre nossa plataforma
          </p>
        </div>

        <div className="mb-8">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border border-border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-medium text-lg">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Ainda tem dúvidas?</h2>
          <p className="text-muted-foreground mb-6">
            Nossa equipe de suporte está sempre pronta para ajudar você
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contato"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
            >
              Entre em Contato
            </a>
            <a
              href="mailto:suporte@pqestudar.com"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Enviar E-mail
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
