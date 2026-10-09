"use client";

import { useRef, type CSSProperties } from "react";
import { Ticket, CalendarDays, FileText, MapPin, Clock, Percent, ClipboardCheck, Folder, ShieldCheck, Check, ArrowUpRight } from "lucide-react";
import { useHorizontalDrag } from "./useHorizontalDrag";
import styles from "./difference-animation.module.css";

const fragments = [
  { x: 110, y: 90, Icon: Ticket }, { x: 300, y: 40, Icon: null },
  { x: 540, y: 70, Icon: CalendarDays }, { x: 770, y: 120, Icon: FileText },
  { x: 170, y: 290, Icon: MapPin }, { x: 390, y: 330, Icon: Clock },
  { x: 620, y: 290, Icon: Percent }, { x: 800, y: 300, Icon: null },
];
const steps = [
  { label: "Confira os critérios", Icon: ClipboardCheck },
  { label: "Organize seus dados", Icon: Folder },
  { label: "Acesse a emissão oficial", Icon: ShieldCheck },
];

export default function DifferenceAnimation() {
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useHorizontalDrag();
  function replayAct(index: number) {
    rootRef.current?.getAnimations({ subtree: true }).forEach((animation) => {
      animation.currentTime = [0, 4800, 9150][index] ?? 0;
      animation.play();
    });
  }

  return <div ref={rootRef} className={styles.animation} {...drag} role="group" aria-label="Da informação solta à orientação para agir. Escolha uma etapa para rever a animação.">
    <svg className={styles.stage} viewBox="0 0 960 510" role="group" aria-label="Animação do guia ID Jovem">
      <g className={styles.scene}>
        <path className={styles.tangle} d="M146 126 C240 20 290 190 336 76 S520 170 576 106 S740 50 806 156 S700 280 656 326 S470 400 426 366 S250 300 206 326 S280 170 146 126" />
        {fragments.map(({ x, y, Icon }, i) => <g key={i} className={styles.fragment} style={{ transformOrigin: `${x + 36}px ${y + 36}px`, '--dx': `${444 - x}px`, '--dy': `${219 - y}px` } as CSSProperties}><rect x={x} y={y} width="72" height="72" rx="22" />{Icon ? <Icon x={x + 20} y={y + 20} width={32} height={32} /> : <text x={x + 36} y={y + 49} textAnchor="middle" fontSize="38">?</text>}</g>)}
        <circle className={styles.burst} cx="480" cy="255" r="125" />
        <g className={styles.card}>
          <rect x="270" y="125" width="420" height="260" rx="28" />
          <Ticket x="299" y="152" width="32" height="32" />
          <text x="346" y="175" className={styles.small}>ID JOVEM</text>
          <ArrowUpRight x="633" y="153" width="24" height="24" />
          <text x="298" y="237" className={styles.title}><tspan x="298">Cultura e viagens, com</tspan><tspan x="298" dy="34">um caminho mais claro.</tspan></text>
          {["15–29 anos", "CadÚnico", "Renda familiar"].map((label, i) => <g key={label} className={`${styles.tag} ${styles[`tag${i}`]}`}><rect x={298 + i * 119} y="309" width="110" height="38" rx="10" /><text x={353 + i * 119} y="333" textAnchor="middle">{label}</text></g>)}
        </g>
        <path className={styles.connection} d="M432 255 C484 255 480 135 528 135" pathLength="100" />
        <path className={styles.route} d="M560 135 V375" pathLength="100" />
        <circle className={styles.traveler} cx="560" cy="135" r="7" />
        {steps.map(({ label, Icon }, i) => <g key={label} className={`${styles.step} ${styles[`step${i}`]}`}><circle className={styles.node} cx="560" cy={135 + i * 120} r="32" /><Icon x="546" y={121 + i * 120} width="28" height="28" /><text x="611" y={142 + i * 120}>{label}</text><g className={styles.check}><circle cx="587" cy={160 + i * 120} r="12" /><Check x="579" y={152 + i * 120} width="16" height="16" /></g></g>)}
        {["Informação solta", "Informação organizada", "Orientação para agir"].map((label, i) => <foreignObject key={label} x={76 + i * 274} y="442" width="260" height="48" className={`${styles.tab} ${styles[`tab${i}`]}`}><button type="button" className={styles.actButton} onClick={() => replayAct(i)} aria-label={`Rever etapa ${i + 1}: ${label}`}><span>0{i + 1}</span>{label}</button></foreignObject>)}
      </g>
    </svg>
    <div className={styles.mobile} aria-hidden="true"><span>DA DESCOBERTA À AÇÃO</span><div className={styles.mobileCard}><Ticket size={26}/><strong>ID Jovem</strong><p>Cultura e viagens, com um caminho mais claro.</p><small>15–29 anos · CadÚnico · Renda familiar</small></div>{steps.map(({label, Icon}, i) => <div className={styles.mobileStep} key={label}><Icon size={22}/><span>{label}</span><Check size={17}/><small>0{i + 1}</small></div>)}</div>
  </div>;
}
