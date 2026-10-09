"use client";

import { useEffect, useId, useRef, useState, type CSSProperties as ReactCSSProperties } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Bus, GraduationCap, MapPin, Pill, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MBO_BENEFITS, type MboBenefit } from "@/lib/mbo-preview";
import { brazilOutline } from "./brazil-outline";
import styles from "./benefits-explorer.module.css";

type CSSProperties = ReactCSSProperties & { "--category"?: string; "--arrow-x"?: string };

const categories: Record<string, string> = {
  "Cultura e transporte": "#e052e0", "Saúde": "#6fd8a8", "Educação e trabalho": "#7aa7ff",
};
const regions: Record<string, { name: string; city: string; lon: number; lat: number }> = {
  BR: { name: "Todo o Brasil", city: "Abrangência nacional", lon: -47.93, lat: -15.78 },
  CE: { name: "Ceará", city: "Fortaleza", lon: -38.54, lat: -3.73 },
  SP: { name: "São Paulo", city: "São Paulo", lon: -46.63, lat: -23.55 },
  RJ: { name: "Rio de Janeiro", city: "Rio de Janeiro", lon: -43.17, lat: -22.91 },
  DF: { name: "Distrito Federal", city: "Brasília", lon: -47.93, lat: -15.78 },
  BA: { name: "Bahia", city: "Salvador", lon: -38.51, lat: -12.97 },
  PE: { name: "Pernambuco", city: "Recife", lon: -34.88, lat: -8.05 },
  AM: { name: "Amazonas", city: "Manaus", lon: -60.02, lat: -3.12 },
  RS: { name: "Rio Grande do Sul", city: "Porto Alegre", lon: -51.23, lat: -30.03 },
};
const icons = { culture: Ticket, hero: Pill, education: GraduationCap, transport: Bus };
const colorStyle = (category: string): CSSProperties => ({ "--category": categories[category] } as CSSProperties);
const tagline = (benefit: MboBenefit) => benefit.city ? `Exemplo municipal de ${benefit.city}` : "Programa nacional · inclui sua região";
const project = (lon: number, lat: number) => ({ x: (lon + 74) * 9.66 + 7, y: (5.5 - lat) * 10 + 3 });

export default function BenefitsExplorer({ onOpen }: { onOpen: (benefit: MboBenefit) => void }) {
  const [uf, setUf] = useState("BR");
  const [category, setCategory] = useState("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 400, height: 410 });
  const [calloutHeight, setCalloutHeight] = useState(180);
  const calloutRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLDivElement>());
  const id = useId().replace(/:/g, "");
  const visible = MBO_BENEFITS.filter((benefit) => category === "Todos" || benefit.category === category);
  const selected = visible.find((benefit) => benefit.id === selectedId);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.min(entry.contentRect.width, entry.contentRect.height * 400 / 410));
      setSize({ width, height: width * 410 / 400 });
    });
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const callout = calloutRef.current;
    if (!callout) return;
    const observer = new ResizeObserver(() => setCalloutHeight(callout.offsetHeight));
    observer.observe(callout);
    return () => observer.disconnect();
  }, [selectedId, uf]);

  function selectBenefit(benefitId: string | null) {
    setSelectedId(benefitId);
    const list = listRef.current;
    const row = benefitId ? rows.current.get(benefitId) : null;
    if (!list || !row) return;
    const listBox = list.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    const delta = rowBox.top < listBox.top ? rowBox.top - listBox.top : rowBox.bottom > listBox.bottom ? rowBox.bottom - listBox.bottom : 0;
    if (delta) list.scrollBy({ top: delta, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  const groups = new Map<string, { x: number; y: number; items: MboBenefit[] }>();
  visible.forEach((benefit) => {
    const region = benefit.city ? regions.CE : regions[uf];
    const key = `${region.lon},${region.lat}`;
    const group = groups.get(key) ?? { ...project(region.lon, region.lat), items: [] };
    group.items.push(benefit);
    groups.set(key, group);
  });
  const pins = [...groups.values()].flatMap((group) => {
    const ax = group.x / 400 * size.width;
    const ay = group.y / 410 * size.height;
    const total = (group.items.length - 1) * 46;
    const start = Math.max(26, Math.min(ax - total / 2, size.width - 26 - total));
    return group.items.map((benefit, index) => ({ benefit, ax, ay, x: start + index * 46, y: ay > 80 ? ay - 46 : ay + 46, vx: group.x, vy: group.y }));
  });
  const activePin = pins.find((pin) => pin.benefit.id === selectedId);
  const calloutWidth = Math.min(244, size.width - 12);
  const calloutAbove = activePin ? activePin.y - 30 - calloutHeight > 6 && activePin.ay > 80 : false;
  const calloutLeft = activePin ? Math.max(6, Math.min(activePin.x - calloutWidth / 2, size.width - calloutWidth - 6)) : 0;
  const calloutTop = activePin ? Math.max(6, Math.min(calloutAbove ? activePin.y - 30 - calloutHeight : Math.max(activePin.ay, activePin.y) + 30, size.height - calloutHeight - 6)) : 0;

  return <div className={styles.panel} aria-label="Explorar benefícios">
    <div className={styles.filters}>
      <div className={styles.field}><label htmlFor={`${id}-uf`}>Estado</label><Select value={uf} onValueChange={setUf}><SelectTrigger id={`${id}-uf`} className={styles.select}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(regions).map(([value, region]) => <SelectItem key={value} value={value}>{region.name}</SelectItem>)}</SelectContent></Select></div>
      <div className={styles.field}><label htmlFor={`${id}-city`}>Cidade</label><Select value={regions[uf].city} disabled={uf === "BR"}><SelectTrigger id={`${id}-city`} className={styles.select}><SelectValue /></SelectTrigger><SelectContent><SelectItem value={regions[uf].city}>{regions[uf].city}</SelectItem></SelectContent></Select></div>
      <div className={styles.sample}><Sparkles size={24} aria-hidden="true" /><div>Uma amostra do MBO<small>4 exemplos para explorar</small></div></div>
      <div className={styles.chips} role="group" aria-label="Filtrar por interesse">{["Todos", ...Object.keys(categories)].map((item) => <button type="button" key={item} style={colorStyle(item)} aria-pressed={category === item} onClick={() => { setCategory(item); if (selected && item !== "Todos" && selected.category !== item) setSelectedId(null); }}>{item !== "Todos" && <i aria-hidden="true" />}{item}</button>)}</div>
    </div>
    <div className={styles.body}>
      <div className={styles.mapColumn}>
        <div className={styles.cover} aria-live="polite"><i aria-hidden="true" /><span>{selected ? tagline(selected) : "Abrangência dos exemplos"}</span></div>
        <div className={styles.mapSlot} ref={slotRef}>
          <div className={styles.map} style={size} onClick={(event) => { if (!(event.target as Element).closest("button, [data-callout]")) selectBenefit(null); }}>
            <svg className={styles.mapSvg} viewBox="0 0 400 410" aria-hidden="true">
              <defs><pattern id={`${id}-dots`} width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="rgba(255,255,255,.08)" /></pattern><clipPath id={`${id}-land`}><path d={brazilOutline} transform="matrix(1.073333 0 0 1.111111 -2.66 -2)" /></clipPath></defs>
              <rect width="400" height="410" fill={`url(#${id}-dots)`} />
              <path className={styles.land} data-coverage={selected ? selected.city ? "local" : "national" : undefined} d={brazilOutline} transform="matrix(1.073333 0 0 1.111111 -2.66 -2)" />
              {activePin && selected && (selected.city ? <circle key={`${selected.id}-${uf}`} className={styles.ring} r="16" cx={activePin.vx} cy={activePin.vy} /> : <g clipPath={`url(#${id}-land)`}><circle key={`${selected.id}-${uf}`} className={styles.wave} r="30" cx={activePin.vx} cy={activePin.vy} /></g>)}
            </svg>
            <svg className={styles.leaders} viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">{pins.map((pin) => <line key={pin.benefit.id} x1={pin.ax} y1={pin.ay} x2={pin.x} y2={pin.y + (pin.ay > 80 ? 20 : -20)} />)}</svg>
            {[...groups.values()].map((group) => <span key={`${group.x}-${group.y}`} className={styles.anchor} style={{ left: group.x / 400 * size.width, top: group.y / 410 * size.height }} />)}
            {pins.map((pin, index) => {
              const Icon = icons[pin.benefit.image as keyof typeof icons] ?? Ticket;
              return <button type="button" key={pin.benefit.id} className={styles.pin} style={{ ...colorStyle(pin.benefit.category), left: pin.x, top: pin.y, animationDelay: `${index * .08}s` }} data-selected={selectedId === pin.benefit.id} data-dimmed={!!selected && selectedId !== pin.benefit.id} aria-pressed={selectedId === pin.benefit.id} aria-label={`${pin.benefit.title} — ver no mapa`} onClick={() => selectedId === pin.benefit.id ? onOpen(pin.benefit) : selectBenefit(pin.benefit.id)}><Icon size={19} aria-hidden="true" /></button>;
            })}
            {selected && activePin && <div ref={calloutRef} key={`${selected.id}-${uf}`} className={styles.callout} data-callout data-above={calloutAbove} style={{ ...colorStyle(selected.category), width: calloutWidth, left: calloutLeft, top: calloutTop, "--arrow-x": `${Math.max(18, Math.min((calloutAbove ? activePin.x : activePin.ax) - calloutLeft, calloutWidth - 18))}px` } as CSSProperties}>
              <div className={styles.kicker}>{selected.scope} · {selected.category}</div><h4>{selected.title}</h4><p>{tagline(selected)}</p><button type="button" onClick={() => onOpen(selected)}>Abrir benefício <ArrowRight size={16} aria-hidden="true" /></button>
            </div>}
            {!selected && <div className={styles.hint}>Toque num pin ou escolha um benefício</div>}
          </div>
        </div>
        <div className={styles.mapFooter}><div><h3>Do nacional ao local.</h3><p>Área de cobertura, não postos de atendimento.</p></div><span><MapPin size={24} aria-hidden="true" /></span></div>
      </div>
      <div className={styles.list} ref={listRef} aria-label="Benefícios">
        {visible.map((benefit) => <div key={benefit.id} ref={(node) => { if (node) rows.current.set(benefit.id, node); else rows.current.delete(benefit.id); }} className={styles.row} style={colorStyle(benefit.category)} data-selected={selectedId === benefit.id}>
          <button type="button" className={styles.rowSelect} aria-pressed={selectedId === benefit.id} onClick={() => selectBenefit(benefit.id)}>
            <span className={styles.thumb}><Image src={`/images/premium/${benefit.image}.webp`} alt="" fill sizes="70px" /></span>
            <span className={styles.rowCopy}><span className={styles.meta}>{benefit.scope} · {benefit.category}</span><strong>{benefit.title}</strong><span className={styles.description}>{benefit.summary}</span><span className={styles.tagline}>{tagline(benefit)}</span></span>
          </button>
          <button type="button" className={styles.open} aria-label={`Abrir ${benefit.title}`} onClick={() => { selectBenefit(benefit.id); onOpen(benefit); }}><ArrowUpRight size={20} aria-hidden="true" /></button>
        </div>)}
      </div>
    </div>
    <div className={styles.footer}><ShieldCheck size={18} aria-hidden="true" /><span>Correspondência por interesse e abrangência. Cada programa tem seus critérios de acesso.</span></div>
  </div>;
}
