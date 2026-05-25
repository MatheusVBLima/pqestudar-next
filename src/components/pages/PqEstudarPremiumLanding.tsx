"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  Gift,
  GraduationCap,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  X,
} from "lucide-react";

const CHECKOUT_URL = "https://pay.cakto.com.br/acmn9pr_678659";

function getCountdownToMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);

  const totalSeconds = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0"));
}

const painItems = [
  "Voce salva dezenas de cursos e nunca sabe qual comecar.",
  "Perde inscricoes, prazos e beneficios porque tudo fica espalhado.",
  "Gasta tempo procurando oportunidade e termina sem agir.",
  "Ve vagas boas quando ja fecharam ou quando faltam poucas horas.",
  "Tem vontade de melhorar de vida, mas falta um mapa pratico.",
];

const trustCards = [
  [
    "Acesso 3 em 1",
    "Beneficios, Vagas e Cursos em uma unica assinatura premium.",
  ],
  [
    "+150 Oportunidades",
    "Acesso imediato a +100 cursos curados e 50 beneficios exclusivos do governo.",
  ],
  [
    "Ecossistema Completo",
    "Tudo o que voce precisa: Educacao, Empregabilidade e Direitos em um so painel.",
  ],
  [
    "Curadoria Premium",
    "Esqueca as buscas confusas. Selecionamos apenas o que e real e funciona para voce.",
  ],
  [
    "Guia para Download",
    "Alem da plataforma, baixe o guia completo em PDF para consultar offline ou imprimir quando quiser.",
  ],
  [
    "Garantia Total",
    "Acesso livre por 7 dias. Sua satisfacao e nossa prioridade ou seu dinheiro de volta.",
  ],
];

const sectionDividerClass =
  "relative overflow-hidden border-b border-border after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.35),hsl(var(--border)),hsl(var(--primary)/0.35),transparent)] after:shadow-[0_0_18px_hsl(var(--primary)/0.18)]";
const sectionDarkClass = "bg-[linear-gradient(180deg,#080808_0%,#0b0b0b_46%,#050505_100%)]";
const sectionAltClass = "bg-[linear-gradient(180deg,#050505_0%,#090909_42%,#050505_100%)]";

const modules = [
  {
    icon: Gift,
    title: "Beneficios",
    description: "Programas, auxilios, descontos e oportunidades pouco divulgadas, com resumo pratico e proximo passo.",
  },
  {
    icon: BookOpen,
    title: "Cursos",
    description: "Cursos gratuitos e pagos selecionados por utilidade real, area, aplicacao e potencial de carreira.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Vagas",
    description: "Vagas, programas, estagios e chamadas que fazem sentido para quem esta estudando ou migrando de carreira.",
  },
  {
    icon: GraduationCap,
    title: "Rotas de Estudo",
    description: "Sequencias simples para sair do excesso de informacao e saber o que fazer primeiro.",
  },
  {
    icon: TicketPercent,
    title: "Achados e Cupons",
    description: "Ferramentas, acessos e vantagens que podem economizar dinheiro ou acelerar sua organizacao.",
  },
  {
    icon: Sparkles,
    title: "Atualizacoes",
    description: "Novidades reunidas em curadorias curtas para voce nao precisar garimpar a internet todo dia.",
  },
];

const testimonials = [
  {
    quote:
      "Eu entrava em varios sites e terminava perdida. Com o Premium, comecei pelos beneficios e ja encontrei duas oportunidades que nem sabia que existiam.",
    name: "Marina C.",
    city: "Campinas - SP",
  },
  {
    quote:
      "O valor esta em cortar caminho. A curadoria me poupou horas procurando curso bom e vaga com prazo aberto.",
    name: "Rafael M.",
    city: "Belo Horizonte - MG",
  },
  {
    quote:
      "Usei primeiro pelo mapa de beneficios, mas fiquei pelos cursos e vagas. E simples, direto e sempre tem algo novo para olhar.",
    name: "Bianca S.",
    city: "Recife - PE",
  },
];

const bonuses = [
  {
    title: "Roteiro de Primeira Semana",
    value: "R$ 97",
    description: "Um plano simples para entrar, escolher seus objetivos e usar o Premium sem se perder.",
  },
  {
    title: "Checklist de Beneficios",
    value: "R$ 147",
    description: "Um guia rapido para verificar o que voce pode solicitar agora e o que precisa preparar.",
  },
  {
    title: "Trilha de Cursos Essenciais",
    value: "R$ 97",
    description: "Uma selecao inicial para montar repertorio sem cair em cursos aleatorios.",
  },
  {
    title: "Monitor de Oportunidades",
    value: "R$ 197",
    description: "Modelo de rotina para acompanhar vagas, prazos e novas chamadas sem ansiedade.",
  },
];

const offerRows = [
  ["PqEstudar Premium: beneficios, cursos e vagas", "R$ 497"],
  ["Bonus 1: Roteiro de Primeira Semana", "R$ 97"],
  ["Bonus 2: Checklist de Beneficios", "R$ 147"],
  ["Bonus 3: Trilha de Cursos Essenciais", "R$ 97"],
  ["Bonus 4: Monitor de Oportunidades", "R$ 197"],
];

const faqs = [
  [
    "Isso e um curso?",
    "Nao. E uma area de curadoria continua com beneficios, cursos, vagas e caminhos praticos para voce decidir melhor onde colocar energia.",
  ],
  [
    "Qual a diferenca entre Padrao e Premium?",
    "O Padrao foca em beneficios. O Premium libera beneficios, cursos e vagas. Esta pagina apresenta a oferta Premium.",
  ],
  [
    "Como recebo o acesso?",
    "Depois da compra, voce recebe um token por email. Basta criar ou acessar sua conta no PqEstudar e resgatar o codigo.",
  ],
  [
    "Tem garantia?",
    "Sim. Voce tem 7 dias para testar. Se nao fizer sentido para voce, solicite reembolso dentro do prazo.",
  ],
  [
    "O conteudo atualiza?",
    "Sim. A proposta do Premium e justamente reunir novas oportunidades e curadorias ao longo do tempo.",
  ],
];

function CtaButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={CHECKOUT_URL}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 text-center text-sm font-black uppercase tracking-normal text-white shadow-[0_10px_22px_hsl(145_63%_20%/0.28)] transition hover:translate-y-[-1px] hover:bg-emerald-600 hover:text-white hover:shadow-[0_12px_26px_hsl(145_63%_20%/0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${className}`}
    >
      {children}
      <ArrowRight className="h-5 w-5" />
    </Link>
  );
}

function UrgencyBar() {
  const [timeLeft, setTimeLeft] = useState(() => getCountdownToMidnight());

  useEffect(() => {
    const tick = () => setTimeLeft(getCountdownToMidnight());
    tick();

    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-[hsl(0_84%_60%)] bg-[hsl(0_84%_60%)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 px-4 py-3 sm:min-h-16 sm:flex-row sm:justify-between sm:gap-3 sm:py-0">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-white sm:text-sm">
            <Clock3 className="h-4 w-4 text-white" />
            Oferta de lancamento expira em:
          </div>
          <div className="flex items-center gap-3 text-white sm:gap-4" suppressHydrationWarning>
            {timeLeft.map((value, index) => (
              <div key={index} className="flex items-center gap-3 sm:gap-4">
                <div className="min-w-10 text-center">
                  <div className="text-2xl font-black leading-none sm:text-4xl">{value}</div>
                </div>
                {index < 2 && <span className="text-2xl font-black leading-none sm:text-4xl">:</span>}
              </div>
            ))}
          </div>
          <CtaButton className="!h-7 !min-h-0 rounded-lg px-4 !py-0 text-[11px] leading-none sm:!h-9 sm:px-5 sm:text-xs [&_svg]:h-4 [&_svg]:w-4">
            Garantir acesso
          </CtaButton>
        </div>
      </div>
      <div className="h-[130px] sm:h-16" aria-hidden="true" />
    </>
  );
}

export default function PqEstudarPremiumLanding() {
  return (
    <main className="dark min-h-screen bg-[#070707] text-foreground">
      <UrgencyBar />

      <section className={`${sectionDividerClass} ${sectionDarkClass}`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-1 pt-8 text-center sm:min-h-[calc(100vh-64px)] sm:px-6 sm:pb-6 sm:pt-14 lg:pt-16">
          <div className="w-full max-w-5xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground sm:mb-7">
              <BadgeCheck className="h-4 w-4" />
              Lancamento PqEstudar Premium
            </div>
            <div className="relative mx-auto max-w-5xl">
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-[115%] max-w-4xl -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.42),hsl(var(--primary)/0.22)_38%,transparent_72%)] blur-2xl"
                aria-hidden="true"
              />
              <h1 className="relative mx-auto max-w-5xl text-balance text-[27px] font-black leading-tight text-white [text-shadow:0_2px_0_hsl(var(--primary)/0.55),0_0_24px_hsl(var(--primary)/0.22)] sm:text-5xl lg:text-6xl">
                Pare De Procurar Oportunidades No Escuro.
                <br />
                <span className="text-primary">Receba O Mapa Pronto.</span>
              </h1>
            </div>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-white sm:mt-6 sm:text-lg sm:leading-8">
              Uma area premium com beneficios, cursos e vagas selecionadas para quem quer estudar melhor,
              economizar tempo e avancar sem depender de sorte no feed.
            </p>
          </div>

          <div className="relative mt-5 w-full max-w-4xl sm:mt-10">
            <div
              className="pointer-events-none absolute inset-x-4 -bottom-5 top-1/3 rounded-[1.2rem] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.28),hsl(var(--primary)/0.14)_42%,transparent_72%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[1rem] border border-primary/55 bg-[#111111] shadow-[0_18px_38px_hsl(var(--primary)/0.16)] sm:min-h-[420px]">
              <div className="flex w-full flex-col items-center gap-5 px-4 text-center sm:gap-7 sm:px-6">
                <p className="max-w-[18rem] text-xl font-black leading-tight text-foreground sm:max-w-none sm:text-3xl">
                  Veja como o Premium organiza beneficios, cursos e vagas em um so lugar
                </p>
                <div className="flex flex-col items-center justify-center gap-3 text-sm text-foreground sm:flex-row sm:gap-5 sm:text-base">
                  <span className="inline-flex items-center gap-2 font-black sm:gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-card sm:h-12 sm:w-12">
                      <Play className="ml-1 h-5 w-5 fill-primary text-primary sm:h-6 sm:w-6" />
                    </span>
                    Continuar assistindo?
                  </span>
                  <span className="inline-flex items-center gap-2 font-black sm:gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-card sm:h-12 sm:w-12">
                      <Clock3 className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                    </span>
                    Assistir do inicio?
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 text-center sm:mt-auto sm:pt-8">
            <p className="text-sm text-muted-foreground line-through">De R$1.735</p>
            <p className="text-lg text-foreground">por apenas</p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-16 pt-0 text-center sm:pb-20 sm:pt-10">
          <p className="text-[34px] font-black leading-tight text-foreground sm:text-5xl">
            12x de <span className="text-emerald-400">R$39,00</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">ou R$397 à vista</p>
          <CtaButton className="mt-6 w-full max-w-md text-base">Quero entrar no Premium agora</CtaButton>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              Acesso imediato
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              7 dias de garantia
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-primary" />
              Bonus incluidos
            </span>
          </div>
        </div>
      </section>

      <section className={`${sectionDividerClass} ${sectionDarkClass} px-4 py-20`}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">Voce se identifica?</span>
            <h2 className="mt-7 text-3xl font-black leading-tight sm:text-4xl">Eu sei exatamente o que acontece.</h2>
          </div>
          <div className="space-y-6 text-lg leading-8 text-slate-200">
            <p>
              Voce abre abas, salva links, recebe indicacoes, pesquisa cursos, olha vagas e pensa:
              <strong className="text-white"> por onde eu comeco?</strong>
            </p>
            <p>
              Enquanto isso, prazos passam, oportunidades somem e voce fica com a sensacao de que esta sempre
              chegando tarde.
            </p>
          </div>
          <div className="mt-8 rounded-[1.2rem] border border-border bg-card p-6 shadow-card">
            <p className="mb-5 text-sm font-semibold text-slate-400">Voce ja tentou...</p>
            <div className="space-y-4">
              {painItems.map((item) => (
                <div key={item} className="flex gap-3 text-slate-200">
                  <X className="mt-1 h-5 w-5 shrink-0 text-destructive" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 text-center text-xl font-black">
            Nao e falta de esforco. <span className="text-primary">Falta um filtro confiavel.</span>
          </p>
          <div className="mt-8 text-center">
            <CtaButton>Quero o filtro pronto</CtaButton>
          </div>
        </div>
      </section>

      <section className={`${sectionDividerClass} ${sectionAltClass} px-4 py-20`}>
        <div className="mx-auto max-w-4xl text-center">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">Por que confiar?</span>
          <h2 className="mt-7 text-3xl font-black sm:text-4xl">O PqEstudar ja nasceu fazendo curadoria.</h2>
          <Image
            src="/images/pqestudar-logo-premium.png"
            alt="Logo PqEstudar"
            width={112}
            height={112}
            className="mx-auto mt-6 h-20 w-20 rounded-full object-contain sm:h-24 sm:w-24"
          />
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            A plataforma reune ferramentas, concursos, guias e conteudos praticos para quem quer estudar com mais
            direcao. O Premium e a camada onde a curadoria fica mais direta, frequente e acionavel.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trustCards.map(([title, description]) => (
              <div key={title} className="flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-border bg-card px-5 py-6 text-center shadow-card sm:min-h-[170px] lg:min-h-[160px]">
                <div className="text-2xl font-black leading-tight text-primary sm:text-3xl">{title}</div>
                <div className="mt-3 max-w-sm text-sm leading-6 text-slate-300 sm:text-base">{description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${sectionDividerClass} ${sectionDarkClass} px-4 py-20`}>
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">O que voce recebe</span>
            <h2 className="mt-7 text-3xl font-black sm:text-4xl">Premium em 6 frentes praticas</h2>
            <p className="mt-4 text-slate-400">Do achado ao proximo passo. Sem garimpo infinito.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-[1.2rem] border border-border bg-card p-6 shadow-card">
                <Icon className="h-8 w-8 text-primary" />
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <CtaButton>Garantir acesso Premium</CtaButton>
          </div>
        </div>
      </section>

      <section className={`${sectionDividerClass} ${sectionAltClass} px-4 py-20`}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">Depoimentos</span>
            <h2 className="mt-7 text-3xl font-black sm:text-4xl">Quem Usa Curadoria Ganha Tempo.</h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-[1.2rem] border border-border bg-card p-6 shadow-card">
                <div className="text-primary">★★★★★</div>
                <p className="mt-5 rounded-[1rem] border border-border bg-muted/30 p-4 leading-7 text-foreground">"{item.quote}"</p>
                <p className="mt-5 font-black">{item.name}</p>
                <p className="text-sm text-slate-500">{item.city}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${sectionDividerClass} ${sectionDarkClass} px-4 py-20`}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">Bonus de lancamento</span>
            <h2 className="mt-7 text-3xl font-black sm:text-4xl">4 Bonus Para Entrar Usando, Nao Acumulando.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {bonuses.map((bonus, index) => (
              <div key={bonus.title} className={`rounded-[1.2rem] border p-6 shadow-card ${index === 3 ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                <p className="text-xs font-black uppercase text-primary">Bonus {index + 1}</p>
                <h3 className="mt-3 text-xl font-black">{bonus.title}</h3>
                <p className="mt-4 leading-7 text-slate-300">{bonus.description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-slate-500 line-through">Valor: {bonus.value}</span>
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">Gratis</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="oferta" className={`${sectionDividerClass} ${sectionAltClass} px-4 py-20`}>
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">Resumo da oferta</span>
          <h2 className="mt-7 text-3xl font-black sm:text-4xl">Tudo Que Voce Recebe Hoje</h2>
          <div className="mt-10 overflow-hidden rounded-[1.2rem] border border-border bg-card text-left shadow-card">
            {offerRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <span className="font-bold">{label}</span>
                <span className="shrink-0 text-slate-400 line-through">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-t border-emerald-500/20 bg-emerald-500/10 px-5 py-6">
              <div>
                <p className="font-black">Voce paga hoje</p>
                <p className="text-sm text-slate-400">Preco de lancamento</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-400">R$ 147</p>
                <p className="text-sm text-slate-400">ou assine o plano anual</p>
              </div>
            </div>
          </div>
          <CtaButton className="mt-8 w-full max-w-2xl">Sim, quero o PqEstudar Premium</CtaButton>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-primary" /> Acesso imediato</span>
            <span className="flex items-center gap-1"><LockKeyhole className="h-4 w-4 text-primary" /> Pagamento seguro</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-primary" /> 7 dias de garantia</span>
          </div>
        </div>
      </section>

      <section className={`${sectionDividerClass} ${sectionDarkClass} px-4 py-20`}>
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">Sua garantia</span>
          <h2 className="mt-7 text-3xl font-black sm:text-4xl">7 Dias Para Testar Sem Risco</h2>
          <div className="mt-10 rounded-[1.2rem] border border-border bg-card p-8 shadow-card">
            <Image
              src="/images/selo-garantia-7-dias.avif"
              alt="Selo de garantia de 7 dias"
              width={180}
              height={180}
              className="mx-auto h-32 w-32 object-contain sm:h-40 sm:w-40"
            />
            <h3 className="mt-6 text-2xl font-black">Garantia total por 7 dias</h3>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
              Voce entra, acessa a plataforma, explora os beneficios, cursos, vagas e o guia em PDF. Se por qualquer
              motivo achar que nao e para voce, tudo bem. Mande uma mensagem para o suporte dentro de 7 dias e
              devolvemos 100% do seu dinheiro, sem burocracia.
            </p>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
              A ultima coisa que a gente quer e te prender em algo que nao faz sentido para sua rotina. Teste com
              calma. Se nao curtir, pega seu dinheiro de volta. Mas a ideia e que voce perceba rapido o valor de ter
              oportunidades reais reunidas em um so lugar.
            </p>
          </div>
        </div>
      </section>

      <section className={`${sectionDividerClass} ${sectionAltClass} px-4 py-20`}>
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">FAQ</span>
            <h2 className="mt-7 text-3xl font-black sm:text-4xl">Perguntas Frequentes</h2>
          </div>
          <div className="mt-10 overflow-hidden rounded-[1.2rem] border border-border shadow-card">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group border-b border-border bg-card last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-black">
                  {question}
                  <ChevronDown className="h-5 w-5 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 leading-7 text-slate-300">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={`${sectionDarkClass} px-4 py-20`}>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="rounded-[1.2rem] border border-destructive/30 bg-destructive/10 p-7 shadow-card">
            <X className="h-10 w-10 text-[#ff6b78]" />
            <h3 className="mt-5 text-2xl font-black text-[#ff6b78]">Continuar como esta</h3>
            <ul className="mt-6 space-y-4 text-slate-200">
              <li>Fecha a pagina e volta para os links soltos.</li>
              <li>Continua dependendo do algoritmo para achar oportunidade.</li>
              <li>Perde prazos por falta de um lugar central.</li>
            </ul>
          </div>
          <div className="rounded-[1.2rem] border border-emerald-500/40 bg-emerald-500/10 p-7 shadow-card">
            <Check className="h-10 w-10 text-emerald-300" />
            <h3 className="mt-5 text-2xl font-black text-emerald-400">Entrar no Premium</h3>
            <ul className="mt-6 space-y-4 text-slate-100">
              <li>Recebe token por email e ativa sua conta.</li>
              <li>Acessa beneficios, cursos e vagas em uma area organizada.</li>
              <li>Consulta novas curadorias sem comecar do zero.</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 text-center">
          <CtaButton>Eu escolho entrar agora</CtaButton>
          <p className="mt-6 text-sm text-slate-500">PqEstudar Premium © 2026. Resultados dependem de uso, disponibilidade e prazos de cada oportunidade.</p>
        </div>
      </section>
    </main>
  );
}
