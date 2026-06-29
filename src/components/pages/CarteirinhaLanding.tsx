import {
  BadgeCheck,
  Check,
  ChevronRight,
  Clapperboard,
  FileCheck2,
  HelpCircle,
  Landmark,
  LockKeyhole,
  Music2,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TicketCheck,
  Truck,
  Volleyball,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import { CarteirinhaCta } from "@/components/carteirinha/carteirinha-cta";
import { CarteirinhaFaq } from "@/components/carteirinha/carteirinha-faq";
import { CarteirinhaLogo } from "@/components/carteirinha/carteirinha-logo";
import { CarteirinhaStickyCta } from "@/components/carteirinha/carteirinha-sticky-cta";
import { CarteirinhaThemeToggle } from "@/components/carteirinha/carteirinha-theme-toggle";

const DIGITAL_URL = "https://fesn.shop.alcaia.net/matheusdiasdnedigital";
const FISICA_URL = "https://vendas.alcaia.net/matheusdiasdnefisica";

const benefits = [
  {
    icon: Clapperboard,
    title: "Cinema",
    text: "Sessões e estreias nos cinemas participantes",
  },
  {
    icon: Music2,
    title: "Shows",
    text: "Apresentações, shows e festivais elegíveis",
  },
  {
    icon: Palette,
    title: "Teatro",
    text: "Peças, musicais e eventos culturais elegíveis",
  },
  {
    icon: Volleyball,
    title: "Esportes",
    text: "Partidas e eventos esportivos participantes",
  },
];

const eligibleCategories = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Técnico",
  "Pré-vestibular",
  "Graduação",
  "Pós-graduação",
  "EAD",
  "Cursos livres e capacitações*",
];

const testimonialDrafts = [
  {
    name: "Walter Santos",
    role: "Estudante de programação",
    title: "Mais possibilidades para aproveitar",
    text: "Com a carteirinha, fica mais fácil incluir cinema, shows e outros eventos na rotina sem pesar tanto no orçamento.",
  },
  {
    name: "Bia Casnau",
    role: "Estudante de contabilidade",
    title: "Tudo explicado com clareza",
    text: "Gostei de poder comparar as versões digital e física e entender as etapas antes de iniciar a solicitação.",
  },
  {
    name: "Marília Brasileiro",
    role: "Estudante de psicologia",
    title: "Praticidade no dia a dia",
    text: "Ter a opção digital no celular torna a apresentação do documento muito mais prática nos estabelecimentos participantes.",
  },
];

const faqs = [
  {
    question: "O PqEstudar emite a carteirinha?",
    answer:
      "Não. O PqEstudar apresenta as opções e direciona você ao ambiente do parceiro. Cadastro, pagamento, análise, emissão, suporte e entrega são realizados pela plataforma e entidade responsáveis.",
  },
  {
    question: "Quem pode solicitar?",
    answer:
      "A elegibilidade depende de matrícula regular e dos critérios verificados pela entidade emissora. Antes da compra, confira no checkout se sua modalidade de ensino é aceita.",
  },
  {
    question: "Qual é a diferença entre a versão digital e a física?",
    answer:
      "A digital é utilizada pelo celular após sua aprovação e liberação. A física é o documento impresso enviado conforme os prazos e condições informados no checkout.",
  },
  {
    question: "Quando posso começar a usar?",
    answer:
      "Somente depois que seus documentos forem analisados, sua solicitação for aprovada e a carteirinha estiver disponível. O prazo é informado pelo parceiro.",
  },
  {
    question: "O cadastro no PqEstudar comprova matrícula?",
    answer:
      "Não. O uso do PqEstudar não cria vínculo acadêmico nem substitui comprovante de matrícula emitido por uma instituição de ensino elegível.",
  },
  {
    question: "Onde consulto preço, validade, frete e documentos?",
    answer:
      "Essas condições podem mudar e são exibidas no ambiente do parceiro antes da finalização. Leia todas as informações do checkout antes de concluir a solicitação.",
  },
];

function CardMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[620px] py-6 lg:py-12 ${className}`}>
      <div className="absolute inset-x-10 top-12 h-64 rounded-full bg-primary/20 blur-[100px]" />
      <div className="relative rotate-[1.5deg] transition duration-500 hover:rotate-0 hover:scale-[1.015]">
        <Image
          src="/images/carteirinha-dne.png"
          alt="Exemplo de Documento Nacional do Estudante emitido pela FESN"
          width={1964}
          height={1209}
          className="h-auto w-full drop-shadow-[0_30px_45px_rgba(0,0,0,0.45)]"
          sizes="(max-width: 1024px) 90vw, 620px"
          priority
        />
      </div>
      <div className="relative mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Imagem ilustrativa. O documento final é emitido pelo parceiro.
      </div>
    </div>
  );
}

export default function CarteirinhaLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <CarteirinhaLogo />
          <div className="flex items-center gap-2">
            <CarteirinhaThemeToggle />
            <a
              href="#opcoes"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/15 sm:text-sm"
            >
              Ver opções <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <section className="relative border-b border-border/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(128,0,128,0.10),transparent_32%),radial-gradient(circle_at_85%_55%,rgba(168,85,247,0.10),transparent_38%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(235,71,235,0.18),transparent_32%),radial-gradient(circle_at_85%_55%,rgba(126,34,206,0.2),transparent_38%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[1.03fr_0.97fr] lg:px-10 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <BadgeCheck className="h-4 w-4" /> Documento estudantil
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl xl:text-7xl">
              Mais acesso à cultura. <span className="text-primary">Menos no ingresso.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Escolha entre a carteirinha digital ou física e solicite seu documento estudantil no ambiente do parceiro. Processo online, sujeito à análise e aprovação dos documentos.
            </p>
            <CardMockup className="mt-8 py-0 lg:hidden" />
            <div id="carteirinha-hero-actions" className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CarteirinhaCta
                href={DIGITAL_URL}
                kind="digital"
                source="hero_primary"
                className="bg-primary text-primary-foreground shadow-purple hover:bg-primary/90"
              >
                Quero a digital
              </CarteirinhaCta>
              <CarteirinhaCta
                href={FISICA_URL}
                kind="fisica"
                source="hero_secondary"
                className="border border-border bg-card/70 text-foreground hover:bg-accent"
              >
                Quero a física
              </CarteirinhaCta>
            </div>
            <div className="mt-7 flex flex-col items-start gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
              <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary" /> Checkout no parceiro</span>
              <span className="inline-flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" /> Sujeito à validação</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Escolha antes de pagar</span>
            </div>
          </div>
          <CardMockup className="hidden lg:block" />
        </div>
      </section>

      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 text-center text-sm font-semibold text-muted-foreground sm:grid-cols-3 sm:px-8 lg:px-10">
          <div className="flex items-center justify-center gap-2"><TicketCheck className="h-5 w-5 text-primary" /> Opções física e digital</div>
          <div className="flex items-center justify-center gap-2"><Smartphone className="h-5 w-5 text-primary" /> Solicitação 100% online</div>
          <div className="flex items-center justify-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Emissão pela entidade parceira</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Aproveite mais</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Uma carteirinha, diferentes experiências</h2>
          <p className="mt-4 text-muted-foreground">A meia-entrada se aplica aos eventos e estabelecimentos elegíveis, conforme regras legais e validação do documento.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-[1.4rem] border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:border-primary/25 hover:bg-accent/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{title}</h3>
              <p className="mt-2 text-3xl font-black tracking-tight text-primary">50% off<span className="align-top text-sm">*</span></p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          * Meia-entrada de 50% em eventos elegíveis, conforme a legislação aplicável e as regras do organizador.
        </p>
      </section>

      <section className="border-y border-border/70 bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Quem pode solicitar?</h2>
            <p className="mt-4 text-muted-foreground">
              A carteirinha é destinada a estudantes com matrícula válida, conforme os critérios da entidade emissora.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {eligibleCategories.map((category) => (
              <div
                key={category}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-background px-5 py-4 text-sm font-semibold shadow-card sm:text-base"
              >
                <Check className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{category}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border-2 border-primary/40 bg-primary/[0.06] px-5 py-5 text-center">
            <p className="font-bold">Faz curso na EV.G (Escola Virtual de Governo)?</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Confirme a elegibilidade do seu curso com a emissora antes de concluir a solicitação.
            </p>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            * Cursos livres e de capacitação, inclusive os oferecidos pela EV.G, estão sujeitos à análise e à aprovação da entidade emissora.
          </p>
        </div>
      </section>

      <section id="opcoes" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Escolha sua versão</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Qual combina mais com você?</h2>
            <p className="mt-4 text-muted-foreground">Valores, documentos, prazos e demais condições são apresentados no site parceiro.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <article className="relative flex flex-col rounded-[1.6rem] border border-primary/35 bg-gradient-to-b from-primary/[0.11] to-card p-7 shadow-purple sm:p-8">
              <div className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary-foreground">Mais rápida</div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Smartphone className="h-6 w-6" /></div>
              <h3 className="mt-6 text-2xl font-black">Carteirinha digital</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Para quem prefere ter o documento no celular depois da aprovação e liberação.</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground/75">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Uso pelo smartphone</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Sem espera de entrega física</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Condições exibidas antes do pagamento</li>
              </ul>
              <CarteirinhaCta href={DIGITAL_URL} kind="digital" source="plan_card" className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Ver condições da digital
              </CarteirinhaCta>
            </article>

            <article className="flex flex-col rounded-[1.6rem] border border-border bg-card p-7 shadow-card sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><WalletCards className="h-6 w-6" /></div>
              <h3 className="mt-6 text-2xl font-black">Carteirinha física</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Para quem gosta de levar o documento na carteira e apresentar a versão impressa.</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground/75">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Documento físico</li>
                <li className="flex gap-2"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Prazo e frete informados no checkout</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Condições exibidas antes do pagamento</li>
              </ul>
              <CarteirinhaCta href={FISICA_URL} kind="fisica" source="plan_card" className="mt-8 w-full border border-border bg-background text-foreground hover:bg-accent">
                Ver condições da física
              </CarteirinhaCta>
            </article>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Ao clicar, você será redirecionado para um domínio externo responsável pela oferta e finalização.</p>
        </div>
      </section>

      <section className="border-t border-border/70 bg-muted/20">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Experiências</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Estudantes que já economizam</h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonialDrafts.map((testimonial) => (
              <article
                key={testimonial.name}
                className="flex h-full flex-col rounded-[1.4rem] border border-border bg-card p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/25 sm:p-7"
              >
                <div className="flex gap-0.5 text-amber-500" aria-label="5 de 5 estrelas">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index} aria-hidden="true" className="text-lg leading-none">★</span>
                  ))}
                </div>
                <h3 className="mt-5 text-lg font-black">“{testimonial.title}”</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{testimonial.text}</p>
                <div className="mt-6 border-t border-border/70 pt-5">
                  <p className="font-bold">{testimonial.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Textos demonstrativos para validação do layout. Substitua por depoimentos autorizados antes da publicação.
          </p>
        </div>
      </section>

      <section className="border-y border-border/70 bg-background">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="rounded-[1.2rem] border border-border/40 bg-muted/30 p-6 md:p-10 lg:p-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
                Dúvidas frequentes
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Antes de solicitar, confira</h2>
              <p className="mt-3 max-w-lg text-muted-foreground">
                Respostas rápidas sobre a carteirinha estudantil e o processo de solicitação.
              </p>
            </div>
            <CarteirinhaFaq items={faqs} />
          </div>
        </div>
      </section>

      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(128,0,128,0.10),transparent_42%)] dark:bg-[radial-gradient(circle_at_50%_70%,rgba(235,71,235,0.16),transparent_42%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] border border-primary/25 bg-gradient-to-br from-primary/10 to-card px-6 py-12 text-center sm:px-12 sm:py-16">
            <Sparkles className="mx-auto h-7 w-7 text-primary" />
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Escolha sua carteirinha e confira as condições</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Você revisa os detalhes diretamente no ambiente parceiro antes de finalizar.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <CarteirinhaCta href={DIGITAL_URL} kind="digital" source="final_cta" className="bg-primary text-primary-foreground hover:bg-primary/90">Escolher digital</CarteirinhaCta>
              <CarteirinhaCta href={FISICA_URL} kind="fisica" source="final_cta" className="border border-border bg-background text-foreground hover:bg-accent">Escolher física</CarteirinhaCta>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 bg-background pb-28 pt-10 text-muted-foreground md:py-10">
        <p className="mx-auto w-full max-w-7xl px-5 text-center text-xs leading-6 sm:px-8 sm:text-sm lg:px-10">
          ©2026 PqEstudar . Emissão pela FESN .{" "}
          <a href="https://www.pqestudar.com.br" className="transition hover:text-primary hover:underline">
            www.pqestudar.com.br
          </a>
        </p>
      </footer>

      <CarteirinhaStickyCta />
    </main>
  );
}
