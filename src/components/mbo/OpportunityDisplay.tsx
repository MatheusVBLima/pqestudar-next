"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Ticket, Bus } from "lucide-react";
import { useHorizontalDrag } from "./useHorizontalDrag";
import styles from "./opportunity-display.module.css";

const opportunities = [
  { title: "Uma viagem pagando menos.", emphasis: "pagando menos.", detail: "Conheça benefícios de transporte.", icon: Bus },
  { title: "Um novo conhecimento, sem pagar pelo curso.", emphasis: "sem pagar pelo curso.", detail: "Explore oportunidades de qualificação.", icon: GraduationCap },
  { title: "Mais cultura na sua rotina.", emphasis: "na sua rotina.", detail: "Descubra possibilidades de meia-entrada.", icon: Ticket },
];

export default function OpportunityDisplay() {
  const [active, setActive] = useState(0);
  const drag = useHorizontalDrag((direction) => setActive((current) => (current + direction + opportunities.length) % opportunities.length));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (hovered || focused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % opportunities.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [active, hovered, focused, reducedMotion]);

  return <section className={styles.display} aria-label="Oportunidades para explorar" {...drag} style={{ touchAction: "pan-y", userSelect: "none", cursor: "grab" }}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className={styles.inner}>
      <div className={styles.messages} aria-live="off">
        {opportunities.map(({ title, emphasis, icon: Icon }, index) => <div key={title} className={styles.message} data-active={index === active} aria-hidden={index !== active}>
          <span className={styles.icon}><Icon size={30} strokeWidth={2.25} aria-hidden="true" /></span>
          <div><strong>{title.slice(0, -emphasis.length)}<em>{emphasis}</em></strong></div>
        </div>)}
      </div>
      <div className={styles.controls}>
        <div className={styles.dots} role="group" aria-label="Escolher oportunidade">{opportunities.map(({ title }, index) => <button type="button" key={title} aria-label={title} aria-pressed={active === index} onClick={() => setActive(index)}><span /></button>)}</div>
      </div>
    </div>
  </section>;
}
