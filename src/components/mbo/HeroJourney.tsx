"use client";
import { useHorizontalDrag } from "./useHorizontalDrag";
import Image from "next/image";
import { Check, ArrowUpRight, Ticket } from "lucide-react";
import { brazilOutline } from "./brazil-outline";
import styles from "./hero-journey.module.css";
export default function HeroJourney() {
 const drag = useHorizontalDrag();
 return <div className={styles.journey} {...drag} style={{ touchAction: "pan-y", userSelect: "none", cursor: "grab" }} onDragStart={(event) => event.preventDefault()} role="group" aria-label="Descubra o ID Jovem e prepare seu próximo passo. Arraste para rever a animação.">
 <div className={styles.art} aria-hidden="true">
 <svg className={styles.map} viewBox="0 0 440 390"><path d={brazilOutline}/><circle cx="328" cy="88" r="6"/><circle cx="230" cy="205" r="4"/><circle cx="272" cy="276" r="5"/><circle cx="160" cy="123" r="4"/></svg>
 <div className={styles.beacon}/>
 <div className={styles.benefit}><div className={styles.photo}><Image src="/images/premium/culture.webp" alt="" fill sizes="(max-width:760px) 220px, 280px"/><span><Ticket size={13}/> Cultura e transporte</span></div><div className={styles.benefitTitle}><div><small>PROGRAMA NACIONAL</small><strong>ID Jovem</strong></div><ArrowUpRight size={22}/></div></div>
 <div className={styles.checklist}><strong>Meu próximo passo</strong>{["Conferir critérios","Separar documentos","Acessar o canal oficial"].map((text,i)=><div className={styles.row} key={text}><span className={styles.tick} style={{animationDelay:`${i*.7}s`}}><Check size={13}/></span>{text}</div>)}</div>
 <span className={styles.mapLabel}>BRASIL / POSSIBILIDADES PERTO DE VOCÊ</span>
 </div><div className={styles.footer}><div className={styles.steps} aria-label="Descubra, entenda e prepare-se"><span className={styles.stepDiscover}>Descubra</span><span className={styles.stepArrow} aria-hidden="true">→</span><span className={styles.stepUnderstand}>Entenda</span><span className={styles.stepArrow} aria-hidden="true">→</span><span className={styles.stepPrepare}>Prepare-se</span></div></div></div>;
}
