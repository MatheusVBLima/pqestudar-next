"use client";

import { useRef, useState } from "react";
import BenefitsExplorer from "./BenefitsExplorer";
import PremiumCheckoutButton from "./PremiumCheckoutButton";
import PaymentMethods from "./PaymentMethods";
import MboLogo from "./MboLogo";
import HeroJourney from "./HeroJourney";
import OpportunityDisplay from "./OpportunityDisplay";
import JourneyTrail from "./JourneyTrail";
import DifferenceAnimation from "./DifferenceAnimation";
import PreparationAnimation from "./PreparationAnimation";
import PremiumOfferAnimation from "./PremiumOfferAnimation";
import { useHeroScrollSnap } from "./useHeroScrollSnap";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCheck, Compass, ExternalLink, Layers3, Map, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MBO_BENEFITS, MBO_REVIEWED_AT, type MboBenefit } from "@/lib/mbo-preview";
import styles from "./mbo.module.css";

export default function MboPremiumLanding() {
  const introRef = useHeroScrollSnap();
  const [comparison, setComparison] = useState(2);
  const [detail, setDetail] = useState<MboBenefit | null>(null);
  const focusChecklist = useRef(false);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const [requestedBenefit, setRequestedBenefit] = useState<{ id: string; request: number } | null>(null);
  function openDetail(benefit: MboBenefit) {
    detailTrigger.current = document.activeElement as HTMLElement | null;
    setDetail(benefit);
  }
  function prepare(benefit: MboBenefit) {
    setRequestedBenefit((current) => ({ id: benefit.id, request: (current?.request ?? 0) + 1 }));
    focusChecklist.current = true;
    setDetail(null);
  }
  return <div className={styles.page}
    onPointerDownCapture={(event) => { event.currentTarget.dataset.input = "pointer"; }}
    onKeyDownCapture={(event) => { event.currentTarget.dataset.input = "keyboard"; }}
  >
    <header className={styles.nav}><a href="/" className={styles.brand} aria-label="PqEstudar e MBO, página inicial"><span>Pq</span>Estudar <i aria-hidden="true" /> <MboLogo compact /></a><a className={styles.navCta} href="#premium">Conhecer o Premium <ArrowUpRight size={16} /></a></header>

    <main style={{ position: "relative" }}>
      <JourneyTrail />
      <div className={styles.intro} ref={introRef}>
      <section className={`${styles.section} ${styles.hero}`}>
        <div><span className={styles.eyebrow}><Compass size={15} /> MAPA DOS BENEFÍCIOS OCULTOS</span><h1>Uma oportunidade<br />pode estar mais perto<br /><em>do que você imagina.</em></h1><p>Descubra benefícios, entenda as regras e encontre seu próximo passo. Experimente uma parte do MBO, agora.</p><a className={styles.primary} href="#descobrir">Explorar benefícios <ArrowDown size={18} /></a><small className={styles.heroNote}><ShieldCheck size={15} /> Amostra gratuita. Sem cadastro.</small></div>
        <HeroJourney />
      </section>

      <OpportunityDisplay />

      </div>

      <section id="descobrir" className={styles.section}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>01 / EXPERIMENTE</span><h2>O que você quer <em>descobrir hoje?</em></h2></div><p>Escolha um interesse e uma região.<br />Abra um benefício para entender como começar.</p></div>
        <BenefitsExplorer onOpen={openDetail} />
      </section>

      <section id="entender" className={`${styles.section} ${styles.comparison}`}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>02 / VEJA A DIFERENÇA</span><h2>Saber que existe <em>é só o começo.</em></h2></div><p>O mesmo benefício, em três formas de encontrar a informação. Toque para comparar.</p></div>
        <div className={styles.compareTabs}>{["Informação solta", "Informação organizada", "Orientação para agir"].map((label, index) => <button key={label} aria-pressed={comparison === index} onClick={() => setComparison(index)}><span>0{index + 1}</span>{label}{comparison === index && <Check size={18} />}</button>)}</div>
        <div className={styles.compareContent}>
          <div className={styles.compareVisual}>
          <DifferenceAnimation />
          </div><div className={styles.compareCopy}><span className={styles.eyebrow}>MESMO EXEMPLO. OUTRA EXPERIÊNCIA.</span><h3>{["Muitas pistas. E agora?", "As informações começam a fazer sentido.", "Você sabe o que conferir e por onde começar."][comparison]}</h3><p>{["Um nome ou uma postagem desperta a curiosidade. Mas ainda faltam contexto, critérios e uma fonte para consultar.", "Nome, público, abrangência e requisitos aparecem juntos. Fica mais fácil entender se vale investigar.", "O MBO reúne contexto, fonte oficial e próximos passos. Você organiza sua busca e confere as regras no órgão responsável."][comparison]}</p><button className={styles.textLink} onClick={() => openDetail(MBO_BENEFITS[0])}>Abrir o exemplo completo <ArrowRight size={17} /></button></div>
        </div>
      </section>

      <section id="preparar" tabIndex={-1} aria-label="Seu próximo passo" className={styles.section}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>03 / SEU PRÓXIMO PASSO</span><h2>Transforme descoberta <em>em preparação.</em></h2></div><p>Marque o que você já conferiu.<br />Seu checklist vale para esta visita.</p></div>
        <div className={styles.checklist}>
          <PreparationAnimation requestedBenefit={requestedBenefit} />
        </div>
      </section>

      <section id="premium" className={`${styles.section} ${styles.offer}`}>
      <div className={styles.offerLayout}>
        <PremiumOfferAnimation />
        <div className={styles.offerIntro}><span className={styles.eyebrow}><Sparkles size={16} /> CONTINUE COM O MBO</span><h2>Sua próxima descoberta<br /><em>começa por aqui.</em></h2><p>Você experimentou uma parte do MBO. Continue explorando benefícios, regiões e caminhos para começar com o PqEstudar Premium.</p><span className={styles.offerLifetime}><CheckCheck size={18} /> Um pagamento. Acesso vitalício.</span></div>
        <div className={styles.offerCard}>
          <span className={styles.offerBadge}>PQESTUDAR PREMIUM</span>
          <div className={styles.offerProduct}><MboLogo /></div>
          <div className={styles.checkoutPrice}>
            <div className={styles.checkoutOriginalPrice}>De <s>R$ 480,00</s></div>
            <div className={styles.installmentPrice}><span>por 11x de</span><strong>R$ 6,57</strong></div>
            <span className={styles.cashPrice}>ou <b>R$ 59,90</b> à vista</span>
          </div>
          <PremiumCheckoutButton />
          <PaymentMethods />
          <div className={styles.offerPayment}><ShieldCheck size={17} /><span>Pagamento seguro via Mercado Pago</span></div>
          <small className={styles.offerAccess}>Pagamento Vitalício | Acesso imediato após a compra</small>
        </div>
        <div className={styles.offerFeatures}>{[{ icon: Layers3, title: "Benefícios organizados", text: "Explore a biblioteca e encontre informações reunidas por benefício." }, { icon: Map, title: "Uma visão por região", text: "Consulte a abrangência dos programas no mapa da área Premium." }, { icon: Compass, title: "Fontes e próximos passos", text: "Entenda o contexto e encontre os canais responsáveis pelo atendimento." }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={25} /><h3>{title}</h3><p>{text}</p></div>)}</div>
        </div><small className={styles.offerNote}>Você contrata a curadoria do PqEstudar. Os benefícios públicos seguem as regras dos órgãos responsáveis e não exigem a compra do MBO.</small>
      </section>
      <section className={`${styles.section} ${styles.faq}`}><h2>Antes de continuar</h2><Accordion.Root type="multiple">{[["O MBO garante que eu receba um benefício?", "Não. O MBO ajuda a descobrir e organizar informações. A análise, os critérios e a concessão pertencem ao órgão responsável por cada programa."], ["Preciso pagar para solicitar os benefícios públicos?", "A compra do MBO não é requisito para acessar benefícios públicos. Você pode consultar as fontes oficiais diretamente; o Premium oferece a curadoria e a organização das informações."], ["Esses são todos os benefícios disponíveis?", "Não. Esta página apresenta quatro exemplos para experimentar a navegação. A ausência de um resultado na amostra não significa ausência de programas na sua cidade."], ["O checklist envia meus dados para algum órgão?", "Não. Ele é uma ferramenta de organização durante esta visita. Nenhuma solicitação é enviada, e as marcações são apagadas ao recarregar a página."]].map(([title, answer]) => <Accordion.Item key={title} value={title} className={styles.faqItem}><Accordion.Header><Accordion.Trigger className={styles.faqTrigger}>{title}<span aria-hidden="true">+</span></Accordion.Trigger></Accordion.Header><Accordion.Content className={styles.faqContent}><p>{answer}</p></Accordion.Content></Accordion.Item>)}</Accordion.Root></section>
    </main>
    <footer className={styles.footer}><a href="/" className={styles.brand}><span>Pq</span>Estudar</a><p>Informação que abre caminhos.</p><div><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a></div></footer>

    <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}><DialogContent className={styles.detail} onCloseAutoFocus={(event) => {
      event.preventDefault();
      if (!focusChecklist.current) {
        detailTrigger.current?.focus({ preventScroll: true });
        return;
      }
      focusChecklist.current = false;
      const section = document.getElementById("preparar");
      section?.focus({ preventScroll: true });
      section?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }}>
      {detail && <><span className={styles.eyebrow}>{detail.scope} / {detail.category}</span><DialogTitle className={styles.detailTitle}>{detail.title}</DialogTitle><DialogDescription className={styles.detailDescription}>{detail.summary}</DialogDescription><h3>O que conferir</h3><ul>{detail.requirements.map((item) => <li key={item}><Check size={17} />{item}</li>)}</ul><a href={detail.source} className={styles.source} target="_blank" rel="noopener noreferrer"><ShieldCheck size={19} /><span>Consultar a fonte oficial<small>Consulta editorial: {MBO_REVIEWED_AT}</small></span><ExternalLink size={17} /></a><button className={styles.primary} onClick={() => prepare(detail)}>Montar meu checklist <ArrowRight size={17} /></button><small>Confira as regras completas e atualizadas no canal oficial.</small></>}
    </DialogContent></Dialog>
  </div>;
}
