import type { Metadata } from "next";
import { ProductSalesPage, type SalesPageConfig } from "@/components/sales/ProductSalesPage";

export const metadata: Metadata = {
  title: "Certificado que Conta | Analise cursos antes de se inscrever",
  description:
    "Descubra se um curso vale a pena para seu objetivo, currículo, rotina e possível aproveitamento como horas complementares.",
  alternates: { canonical: "/certificado-que-conta" },
  openGraph: {
    title: "Certificado que Conta | PqEstudar",
    description:
      "Uma ferramenta para analisar cursos antes de investir tempo ou dinheiro.",
    url: "/certificado-que-conta",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const certificadoQueContaSalesPage: SalesPageConfig = {
  badge: "Ferramenta digital do PqEstudar",
  title: "Antes de começar um curso, descubra se ele realmente",
  highlightedTitle: "vale a pena para você",
  description:
    "O Certificado que Conta analisa se um curso combina com seu objetivo, cabe na sua rotina, fortalece seu currículo e pode ajudar como horas complementares.",
  productName: "Certificado que Conta",
  productSubtitle: "Acesso à ferramenta de análise de cursos",
  priceLabel: "R$ 19,90",
  oldPriceLabel: "R$ 49,90",
  installmentLabel: "Pagamento seguro via Stripe",
  stripeProductKey: "certificado-que-conta",
  checkoutLabel: "Comprar agora",
  checkoutDisabledLabel: "Checkout indisponível",
  guarantee:
    "Você poderá testar por 7 dias. Se a ferramenta não fizer sentido para sua rotina, solicite reembolso dentro do prazo.",
  supportLabel: "Suporte pelo PqEstudar",
  urgency: {
    label: "Oferta de lançamento por tempo limitado",
    minutes: 24 * 60,
    storageKey: "pqestudar:certificado-que-conta:offer-deadline",
  },
  heroBullets: [
    "Avalia se o curso ajuda no seu objetivo principal.",
    "Mostra pontos de atenção antes de você se inscrever.",
    "Sugere como apresentar o curso no currículo e LinkedIn.",
    "Ajuda a verificar se pode servir como horas complementares.",
  ],
  testimonials: [
    {
      quote: "Eu quase comecei um curso só pelo certificado. A análise me mostrou o que precisava confirmar antes.",
      name: "Amanda R.",
      role: "Recife - PE",
      imageUrl: "/images/testimonial-amanda.svg",
    },
    {
      quote: "Gostei porque não enrola. Ele mostra se o curso ajuda no objetivo e o que eu preciso conferir.",
      name: "Lucas M.",
      role: "Fortaleza - CE",
      imageUrl: "/images/testimonial-lucas.svg",
    },
    {
      quote: "A parte de currículo e LinkedIn economiza tempo. Já saio sabendo como explicar melhor o curso.",
      name: "Renata P.",
      role: "São Paulo - SP",
      imageUrl: "/images/testimonial-renata.svg",
    },
  ],
  offerItems: [
    {
      title: "Análise do objetivo",
      description:
        "Veja se o curso combina com o que você quer alcançar: horas complementares, currículo, oportunidade, mudança de área ou portfólio.",
    },
    {
      title: "Leitura da rotina",
      description:
        "Entenda se a carga horária e o prazo fazem sentido com o tempo que você tem disponível por semana.",
    },
    {
      title: "Pontos favoráveis e alertas",
      description:
        "Receba uma visão escaneável do que parece bom e do que precisa de atenção antes de decidir.",
    },
    {
      title: "Checklist de confirmação",
      description:
        "Marque o que falta verificar, como regras da faculdade, validade do certificado e detalhes do conteúdo.",
    },
    {
      title: "Texto para currículo",
      description:
        "Tenha uma sugestão pronta para transformar o curso em uma descrição profissional mais clara.",
    },
    {
      title: "Texto para LinkedIn",
      description:
        "Receba uma sugestão simples para apresentar o aprendizado sem parecer genérico ou exagerado.",
    },
  ],
  faqs: [
    {
      question: "Isso garante que minha faculdade vai aceitar o certificado?",
      answer:
        "Não. A decisão final é sempre da instituição. A ferramenta ajuda você a identificar o que verificar antes de contar com o curso como horas complementares.",
    },
    {
      question: "Preciso já ter escolhido um curso?",
      answer:
        "Sim. A ferramenta funciona melhor quando você informa nome, carga horária, preço, conteúdo e regras do certificado.",
    },
    {
      question: "A ferramenta substitui orientação da faculdade?",
      answer:
        "Não. Ela organiza sua decisão e mostra pontos importantes, mas você ainda deve conferir regras oficiais com sua coordenação ou secretaria.",
    },
    {
      question: "Vou poder salvar minhas análises?",
      answer:
        "Sim. A proposta é manter suas análises salvas na sua conta para consultar depois.",
    },
  ],
};

export default function CertificadoQueContaSalesPage() {
  return <ProductSalesPage config={certificadoQueContaSalesPage} />;
}
