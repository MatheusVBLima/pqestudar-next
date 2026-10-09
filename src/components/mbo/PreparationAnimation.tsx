"use client";

import { useEffect, useRef, useState } from "react";
import { Ticket, CheckCheck, Check, ChevronDown, IdCard, Folder, ShieldCheck, Pill, Briefcase, Bus, ExternalLink, Play } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MBO_BENEFITS } from "@/lib/mbo-preview";
import { useHorizontalDrag } from "./useHorizontalDrag";
import styles from "./preparation-animation.module.css";

const steps = [
  { Icon: IdCard, text: "Conferi idade, renda e CadÚnico" },
  { Icon: Folder, text: "Separei meus dados de identificação" },
  { Icon: ShieldCheck, text: "Consultei as regras no canal oficial" },
];

export default function PreparationAnimation({ requestedBenefit }: { requestedBenefit?: { id: string; request: number } | null }) {
  const [showDemo, setShowDemo] = useState(true);
  const [showHandoff, setShowHandoff] = useState(false);
  const [replay, setReplay] = useState(0);
  const [benefitId, setBenefitId] = useState(MBO_BENEFITS[0].id);
  const [checks, setChecks] = useState<Record<string, number[]>>({});
  const benefit = MBO_BENEFITS.find((item) => item.id === benefitId) ?? MBO_BENEFITS[0];
  const checked = checks[benefit.id] ?? [];
  const complete = checked.length === benefit.steps.length;
  const progress = benefit.steps.length ? checked.length / benefit.steps.length : 0;

  useEffect(() => {
    if (!requestedBenefit || !MBO_BENEFITS.some((item) => item.id === requestedBenefit.id)) return;
    setBenefitId(requestedBenefit.id);
    setShowDemo(false);
    setShowHandoff(false);
  }, [requestedBenefit]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setShowDemo(false);
  }, []);

  useEffect(() => {
    if (!showDemo) return;
    const timer = window.setTimeout(() => { setShowDemo(false); setShowHandoff(true); }, 9000);
    return () => window.clearTimeout(timer);
  }, [showDemo, replay]);

  useEffect(() => {
    if (!showHandoff) return;
    const timer = window.setTimeout(() => setShowHandoff(false), 1600);
    return () => window.clearTimeout(timer);
  }, [showHandoff]);

  function toggle(index: number) {
    setChecks((current) => {
      const selected = current[benefit.id] ?? [];
      return { ...current, [benefit.id]: selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index] };
    });
  }

  return <div className={styles.experience}>
    <div className={styles.toolbar}><span role="status">{showDemo ? "Veja como funciona" : showHandoff ? "" : "Agora é a sua vez"}</span><div><button type="button" onClick={() => { setShowHandoff(false); setReplay((current) => current + 1); setShowDemo(true); }}><Play size={15} aria-hidden="true"/>{showDemo ? "Reiniciar demonstração" : "Rever demonstração"}</button>{showDemo && <button type="button" onClick={() => { setShowDemo(false); setShowHandoff(true); }}>Usar checklist</button>}</div></div>
    {showDemo ? <PreparationDemo key={replay}/> : showHandoff ? <div className={styles.handoff} role="status"><span>Sua vez</span><p>Escolha um benefício e prepare seu próximo passo.</p></div> : <div className={`${styles.demo} ${styles.live}`}>
      <div className={styles.scene}>
        <div className={styles.progress}>
          <div className={styles.ring} role="progressbar" aria-label="Preparação pessoal" aria-valuemin={0} aria-valuemax={benefit.steps.length} aria-valuenow={checked.length}>
            <svg viewBox="0 0 240 240" className={styles.ringSvg} aria-hidden="true"><circle className={styles.track} cx="120" cy="120" r="105"/><circle className={styles.fill} cx="120" cy="120" r="105" pathLength="100" style={{ strokeDashoffset:100 - progress * 100, stroke:complete ? "#6fd8a8" : "#e052e0", filter:"none" }}/></svg>
            <div className={styles.center} aria-hidden="true"><div className={styles.liveSymbol}>{complete ? <CheckCheck size={40}/> : <Ticket size={40}/>}</div><div className={styles.liveNumber} data-complete={complete}><b>{checked.length}</b><small>/ {benefit.steps.length}</small></div></div>
          </div>
          <div className={styles.liveStatus} aria-live="polite">{complete ? "Checklist concluído" : checked.length ? "Faltam conferências" : "Vamos começar?"}</div>
          <small className={styles.disclaimer}>Preparação pessoal, não confirmação de elegibilidade ou aprovação.</small>
        </div>
        <div className={styles.checklist}>
          <div className={styles.label}>Quero me preparar para</div>
          <Select value={benefit.id} onValueChange={setBenefitId}><SelectTrigger aria-label="Benefício do checklist"><SelectValue/></SelectTrigger><SelectContent>{MBO_BENEFITS.map((item)=><SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select>
          <div className={styles.rows}>{benefit.steps.map((step,index)=><label key={`${benefit.id}-${index}`} className={styles.liveRow} data-checked={checked.includes(index)}><input type="checkbox" checked={checked.includes(index)} onChange={()=>toggle(index)}/><span>{step}</span></label>)}</div>
          <a className={styles.link} href={benefit.source} target="_blank" rel="noopener noreferrer">Consultar o canal oficial <ExternalLink size={19} aria-hidden="true"/></a>
          <p className={styles.visitNote}>Suas marcações valem para esta visita.</p>
        </div>
      </div>
    </div>}
  </div>;
}

function PreparationDemo() {
  const demoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Preserve the select and first-click timing (26% of the 13s source).
    // Compress only the remaining sequence so the demonstration ends at 9s.
    const openingMs = 3380;
    const remainingRate = (13000 - openingMs) / (9000 - openingMs);
    const timer = window.setTimeout(() => {
      demoRef.current?.getAnimations({ subtree: true }).forEach((animation) => {
        animation.updatePlaybackRate(remainingRate);
      });
    }, openingMs);
    return () => window.clearTimeout(timer);
  }, []);
  const drag = useHorizontalDrag();
  return <div ref={demoRef} className={styles.demo} {...drag} role="img" aria-label="Demonstração animada do checklist do ID Jovem: seleção do benefício, conferência de critérios, organização de documentos e consulta ao canal oficial. O progresso vai de zero a três. Preparação pessoal não confirma elegibilidade nem aprovação.">
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.progress}>
        <div className={styles.ring}>
          <svg viewBox="0 0 240 240" className={styles.ringSvg}><circle className={styles.track} cx="120" cy="120" r="105"/><circle className={styles.fill} cx="120" cy="120" r="105" pathLength="100"/></svg>
          <div className={styles.center}><div className={styles.symbols}><Ticket className={styles.ticket}/><CheckCheck className={styles.done}/></div><div className={styles.numbers}>{[0,1,2,3].map((number) => <div key={number} className={`${styles.number} ${styles[`number${number}`]}`}><b>{number}</b><small>/ 3</small></div>)}</div></div>
          <div className={styles.burst}/><div className={`${styles.burst} ${styles.burstTwo}`}/>
          {Array.from({length:10},(_,i)=><span key={i} className={styles.spark} style={{rotate:`${i*36}deg`}}/>)}
        </div>
        <div className={styles.status}><span className={styles.statusZero}>Vamos começar?</span><span className={styles.statusPending}>Faltam conferências</span><span className={styles.statusDone}>Checklist concluído</span></div>
        <small className={styles.disclaimer}>Preparação pessoal, não confirmação de elegibilidade ou aprovação.</small>
      </div>
      <div className={styles.checklist}>
        <div className={styles.label}>Quero me preparar para</div>
        <div className={styles.select}><Ticket size={20}/>ID Jovem<ChevronDown size={20}/></div>
        <div className={styles.dropdown}>{[{Icon:Ticket,text:"ID Jovem"},{Icon:Pill,text:"Farmácia Popular"},{Icon:Briefcase,text:"Escola do Trabalhador 4.0"},{Icon:Bus,text:"Passe Livre Todo Dia"}].map(({Icon,text},i)=><div key={text} className={i === 0 ? styles.selected : undefined}><Icon size={20}/><span>{text}</span>{i===0 && <Check size={20}/>}</div>)}</div>
        <div className={styles.rows}>{steps.map(({Icon,text},i)=><div key={text} className={`${styles.row} ${styles[`row${i}`]}`}><span className={styles.box}><Check size={20}/></span><span className={styles.rowIcon}><Icon size={22}/></span><span className={styles.rowText}>{text}</span></div>)}</div>
        <div className={styles.link}>Consultar o canal oficial <ExternalLink size={19}/></div>
      </div>
      <svg className={styles.cursor} viewBox="0 0 30 30"><path d="M3 3 L3 24 L8.5 19 L12 27 L15.2 25.6 L11.7 17.8 L19 17.8 Z" fill="#fff" stroke="#16101a" strokeWidth="1.6" strokeLinejoin="round"/></svg>
    </div>
    <span className={styles.demoLabel}>Demonstração do checklist</span>
  </div>;
}
