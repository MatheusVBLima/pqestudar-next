"use client";

import { useEffect, useRef } from "react";
import { Layers3, Map, Compass } from "lucide-react";
import styles from "./premium-offer-animation.module.css";

/** Animate the presentation around the existing price and real checkout button. */
export default function PremiumOfferAnimation() {
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layout = introRef.current?.parentElement;
    if (!layout) return;
    layout.dataset.offerState = "waiting";
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      layout.dataset.offerState = "started";
      observer.disconnect();
    }, { threshold: 0.15 });
    observer.observe(layout);
    // Focusing the real purchase control must never leave it waiting offscreen.
    const start = () => { layout.dataset.offerState = "started"; observer.disconnect(); };
    layout.addEventListener("focusin", start);
    return () => { observer.disconnect(); layout.removeEventListener("focusin", start); };
  }, []);

  return <div ref={introRef} className={styles.intro} aria-hidden="true">
    {[{ Icon: Layers3, label: "Benefícios organizados" }, { Icon: Map, label: "Uma visão por região" }, { Icon: Compass, label: "Fontes e próximos passos" }].map(({Icon,label},index) => <div key={label} className={`${styles.tile} ${styles[`tile${index}`]}`}><Icon size={78} strokeWidth={1.4}/><strong>{label}</strong></div>)}
  </div>;
}
