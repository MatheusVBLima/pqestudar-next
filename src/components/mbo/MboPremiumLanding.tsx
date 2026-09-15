"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import PremiumCheckoutButton from "./PremiumCheckoutButton";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCheck, Compass, ExternalLink, Layers3, List, Map, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { filterMboBenefits, MBO_BENEFITS, MBO_REVIEWED_AT, MBO_STATES, type MboBenefit } from "@/lib/mbo-preview";
import styles from "./mbo.module.css";

type Boundary = { features: { geometry: { type: string; coordinates: number[][][][] } }[] };

function CoverageMap({ local, onFortaleza }: { local: boolean; onFortaleza: () => void }) {
  const [path, setPath] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/brasil-limite.geojson", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("boundary"); return response.json(); })
      .then((data: Boundary) => {
        const rings = data.features.flatMap(({ geometry }) => geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : geometry.coordinates as unknown as number[][][]);
        setPath(rings.map((ring) => ring.map(([lng, lat], index) => `${index ? "L" : "M"}${((lng + 75) * 9).toFixed(1)},${((6 - lat) * 9).toFixed(1)}`).join(" ") + "Z").join(" "));
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  return <div className={styles.mapCanvas}>
    <span className={styles.mapTag}><span /> Abrangência dos exemplos</span>
    <svg viewBox="0 0 440 390" role="img" aria-label="Mapa de abrangência nacional. O exemplo municipal está em Fortaleza, Ceará.">
      <defs><pattern id="mbo-grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".16" /></pattern><linearGradient id="mbo-land" x2="1" y2="1"><stop stopColor="#b453cf" stopOpacity=".42" /><stop offset="1" stopColor="#573c95" stopOpacity=".12" /></linearGradient></defs>
      <rect width="440" height="390" fill="url(#mbo-grid)" />
      <path d={path} fill="url(#mbo-land)" stroke="#ad70bd" strokeWidth="1.2" />
      {local && <g><circle cx="328.3" cy="87.8" r="16" fill="#e44ae5" opacity=".18" /><circle cx="328.3" cy="87.8" r="5" fill="#ef8af0" /><path d="M328 88L354 61H416" fill="none" stroke="#ef8af0" /><text x="351" y="51" fill="#f8eafa" fontSize="12">Fortaleza</text></g>}
    </svg>
    {!path && <p className={styles.mapStatus} role="status">{failed ? "Mapa indisponível. Explore os benefícios pela lista." : "Carregando mapa…"}</p>}
    <div className={styles.mapBottom}><div><strong>Do nacional ao local.</strong><small>Área de cobertura, não postos de atendimento.</small></div><button onClick={onFortaleza} aria-label="Explorar exemplo de Fortaleza" title="Explorar Fortaleza"><MapPin size={20} /></button></div>
  </div>;
}

export default function MboPremiumLanding() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [view, setView] = useState("list");
  const [comparison, setComparison] = useState(2);
  const [detail, setDetail] = useState<MboBenefit | null>(null);
  const focusChecklist = useRef(false);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const [preparedId, setPreparedId] = useState(MBO_BENEFITS[0].id);
  const [checks, setChecks] = useState<Record<string, number[]>>({});
  const benefits = filterMboBenefits(state, city, category);
  const prepared = MBO_BENEFITS.find((benefit) => benefit.id === preparedId)!;
  const checked = checks[preparedId] ?? [];
  const complete = checked.length === prepared.steps.length;
  const categories = [...new Set(MBO_BENEFITS.map((benefit) => benefit.category))];
  function openDetail(benefit: MboBenefit) {
    detailTrigger.current = document.activeElement as HTMLElement | null;
    setDetail(benefit);
  }
  function prepare(benefit: MboBenefit) {
    setPreparedId(benefit.id);
    focusChecklist.current = true;
    setDetail(null);
  }
  return <div className={styles.page}>
    <header className={styles.nav}><a href="/" className={styles.brand} aria-label="PqEstudar, página inicial"><span>Pq</span>Estudar <i /> <small>MBO</small></a><nav aria-label="Nesta página"><a href="#descobrir">Explorar</a><a href="#preparar">Meu próximo passo</a></nav><a className={styles.navCta} href="#premium">Conhecer o Premium <ArrowUpRight size={16} /></a></header>

    <main>
      <section className={`${styles.section} ${styles.hero}`}>
        <div><span className={styles.eyebrow}><Compass size={15} /> MAPA DOS BENEFÍCIOS OCULTOS</span><h1>Uma oportunidade<br />pode estar mais perto<br /><em>do que você imagina.</em></h1><p>Descubra benefícios, entenda as regras e encontre seu próximo passo. Experimente uma parte do MBO, agora.</p><a className={styles.primary} href="#descobrir">Explorar benefícios <ArrowDown size={18} /></a><small className={styles.heroNote}><ShieldCheck size={15} /> Amostra gratuita. Sem cadastro.</small></div>
      </section>

      <div className={styles.trustStrip}><span><Compass size={18} /> Descubra</span><ArrowRight size={15} /><span><Layers3 size={18} /> Entenda</span><ArrowRight size={15} /><span><CheckCheck size={18} /> Prepare-se</span></div>

      <section id="descobrir" className={styles.section}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>01 / EXPERIMENTE</span><h2>O que você quer<br /><em>descobrir hoje?</em></h2></div><p>Escolha um interesse e uma região.<br />Abra um benefício para entender como começar.</p></div>
        <div className={styles.explorer}>
          <div className={styles.filters}><label>Estado<select aria-label="Estado" value={state} onChange={(event) => { setState(event.target.value); setCity(""); }}><option value="">Todo o Brasil</option>{MBO_STATES.map((uf) => <option key={uf}>{uf}</option>)}</select></label><label>Cidade<select aria-label="Cidade" value={city} disabled={state !== "CE"} onChange={(event) => setCity(event.target.value)}><option value="">{state === "CE" ? "Todo o estado" : "Abrangência nacional"}</option>{state === "CE" && <option>Fortaleza</option>}</select></label><div className={styles.sampleLabel}><Sparkles size={17} /><span>Uma amostra do MBO<small>4 exemplos para explorar</small></span></div></div>
          <div className={styles.categoryRow} aria-label="Interesse"><button aria-pressed={!category} onClick={() => setCategory("")}>Todos</button>{categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className={styles.mobileViews}><button aria-pressed={view === "list"} onClick={() => setView("list")}><List size={17} /> Lista</button><button aria-pressed={view === "map"} onClick={() => setView("map")}><Map size={17} /> Mapa</button></div>
          <div className={styles.explorerBody}>
            <div className={`${styles.mapPane} ${view !== "map" ? styles.mobileHidden : ""}`}><CoverageMap local={benefits.some((benefit) => !!benefit.city)} onFortaleza={() => { setState("CE"); setCity("Fortaleza"); setCategory(""); setView("list"); }} /></div>
            <div className={`${styles.results} ${view !== "list" ? styles.mobileHidden : ""}`}><div className={styles.resultsTop} aria-live="polite"><strong>{benefits.length} {benefits.length === 1 ? "exemplo" : "exemplos"}</strong><span>{city || state || "Brasil"}</span></div>
              {benefits.map((benefit) => <button key={benefit.id} className={styles.benefitCard} onClick={() => openDetail(benefit)}><div className={styles.benefitImage}><Image src={`/images/premium/${benefit.image}.webp`} alt="" fill sizes="80px" /></div><div><small>{benefit.scope} <span>· {benefit.category}</span></small><h3>{benefit.title}</h3><p>{benefit.summary}</p><span className={styles.match}>{benefit.state ? "Exemplo municipal de Fortaleza" : "Programa nacional · inclui sua região"}</span></div><ArrowUpRight size={18} /></button>)}
              {!benefits.length && <div className={styles.empty}><Compass size={30} /><h3>Nenhum exemplo nesta seleção</h3><p>Esta amostra é pequena. Isso não significa que não existam benefícios na sua região.</p><button onClick={() => { setState(""); setCity(""); setCategory(""); }}>Ver todos os exemplos <ArrowRight size={16} /></button></div>}
            </div>
          </div><div className={styles.explorerFoot}><ShieldCheck size={16} /><span>Correspondência por interesse e abrangência. Cada programa tem seus próprios critérios de acesso.</span></div>
        </div>
      </section>

      <section id="entender" className={`${styles.section} ${styles.comparison}`}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>02 / VEJA A DIFERENÇA</span><h2>Saber que existe<br /><em>é só o começo.</em></h2></div><p>O mesmo benefício, em três formas de encontrar a informação. Toque para comparar.</p></div>
        <div className={styles.compareTabs}>{["Informação solta", "Informação organizada", "Orientação para agir"].map((label, index) => <button key={label} aria-pressed={comparison === index} onClick={() => setComparison(index)}><span>0{index + 1}</span>{label}{comparison === index && <Check size={18} />}</button>)}</div>
        <div className={styles.compareContent}>
          <div className={styles.compareVisual}>
            {comparison === 0 ? <div className={styles.scattered}><span>“Jovem pode viajar com desconto?”</span><span>Precisa ser estudante?</span><span>Onde emite? Quais documentos?</span><small>Exemplo ilustrativo de uma busca sem orientação</small></div> : <div className={styles.miniGuide}><span className={styles.miniBadge}>ID JOVEM <ArrowUpRight size={18} /></span><h3>Cultura e viagens,<br />com um caminho mais claro.</h3><div><span>15–29 anos</span><span>CadÚnico</span><span>Renda familiar</span></div>{comparison === 2 && <ol><li>Confira os critérios</li><li>Organize seus dados</li><li>Acesse a emissão oficial</li></ol>}</div>}
          </div><div className={styles.compareCopy}><span className={styles.eyebrow}>MESMO EXEMPLO. OUTRA EXPERIÊNCIA.</span><h3>{["Muitas pistas. E agora?", "As informações começam a fazer sentido.", "Você sabe o que conferir e por onde começar."][comparison]}</h3><p>{["Um nome ou uma postagem desperta a curiosidade. Mas ainda faltam contexto, critérios e uma fonte para consultar.", "Nome, público, abrangência e requisitos aparecem juntos. Fica mais fácil entender se vale investigar.", "O MBO reúne contexto, fonte oficial e próximos passos. Você organiza sua busca e confere as regras no órgão responsável."][comparison]}</p><button className={styles.textLink} onClick={() => openDetail(MBO_BENEFITS[0])}>Abrir o exemplo completo <ArrowRight size={17} /></button></div>
        </div>
      </section>

      <section id="preparar" tabIndex={-1} aria-label="Seu próximo passo" className={styles.section}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>03 / SEU PRÓXIMO PASSO</span><h2>Transforme descoberta<br /><em>em preparação.</em></h2></div><p>Marque o que você já conferiu.<br />Seu checklist vale para esta visita.</p></div>
        <div className={styles.checklist}>
          <div className={`${styles.preparation} ${complete ? styles.completed : ""}`}><span className={styles.progressIcon}>{complete ? <CheckCheck size={32} /> : <Compass size={32} />}</span><span className={styles.progressNumber}>{checked.length}<small> / {prepared.steps.length}</small></span><h3 aria-live="polite">{complete ? "Checklist concluído" : checked.length ? "Faltam conferências" : "Vamos começar?"}</h3><div className={styles.progressTrack} role="progressbar" aria-label="Preparação" aria-valuenow={checked.length} aria-valuemin={0} aria-valuemax={prepared.steps.length}><span style={{ width: `${checked.length / prepared.steps.length * 100}%` }} /></div><p>{complete ? "Tudo marcado. Agora siga as orientações do canal oficial." : "Uma conferência de cada vez. Você escolhe por onde começar."}</p><small>Preparação pessoal, não confirmação de elegibilidade ou aprovação.</small></div>
          <div className={styles.checkItems}><label>Quero me preparar para<select value={preparedId} onChange={(event) => setPreparedId(event.target.value)} aria-label="Benefício do checklist">{MBO_BENEFITS.map((benefit) => <option value={benefit.id} key={benefit.id}>{benefit.title}</option>)}</select></label>{prepared.steps.map((step, index) => <label key={`${prepared.id}-${index}`} className={styles.checkRow}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecks((current) => ({ ...current, [preparedId]: checked.includes(index) ? checked.filter((item) => item !== index) : [...checked, index] }))} /><span>{step}</span></label>)}<a className={styles.textLink} href={prepared.source} target="_blank" rel="noopener noreferrer">Consultar o canal oficial <ExternalLink size={16} /></a></div>
        </div>
      </section>

      <section id="premium" className={`${styles.section} ${styles.offer}`}>
        <div className={styles.offerLayout}>
        <div className={styles.offerIntro}><span className={styles.eyebrow}><Sparkles size={16} /> CONTINUE COM O MBO</span><h2>Sua próxima descoberta<br /><em>começa por aqui.</em></h2><p>Você experimentou uma parte do MBO. Continue explorando benefícios, regiões e caminhos para começar com o PqEstudar Premium.</p><span className={styles.offerLifetime}><CheckCheck size={18} /> Um pagamento. Acesso vitalício.</span></div>
        <div className={styles.offerCard}>
          <span className={styles.offerBadge}>PQESTUDAR PREMIUM</span>
          <div className={styles.offerProduct}><Compass size={32} /><strong>Mapa dos<br />Benefícios Ocultos</strong></div>
          <p className={styles.offerCardDescription}>Informação organizada para a sua próxima oportunidade.</p>
          <div className={styles.checkoutPrice}><span>Acesso vitalício por</span><div className={styles.checkoutOriginalPrice}>De <s>R$ 480,00</s></div><strong>R$ 59,90</strong><span>Pagamento único · sem mensalidade</span></div>
          <PremiumCheckoutButton />
          <div className={styles.offerPayment}><ShieldCheck size={17} /><span>Pagamento seguro via Mercado Pago</span></div>
          <small className={styles.offerAccess}>Acesso após a confirmação do pagamento.</small>
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
