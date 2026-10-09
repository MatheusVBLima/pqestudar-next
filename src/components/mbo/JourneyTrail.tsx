"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./journey-trail.module.css";

const labels = ["Experimente", "Veja a diferença", "Seu próximo passo", "Conheça o Premium"];
type Point = { x: number; y: number };

export default function JourneyTrail() {
  const navRef = useRef<HTMLElement>(null);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const main = navRef.current?.parentElement;
    if (!main) return;
    const sections = Array.from(main.querySelectorAll<HTMLElement>(":scope > section")).slice(0, 4);
    sectionsRef.current = sections;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const base = main.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const nextPoints = sections.map((section) => {
        const box = section.getBoundingClientRect();
        const heading = section.querySelector<HTMLElement>("h2");
        const marker = heading?.previousElementSibling;
        const anchor = marker instanceof HTMLElement ? marker.getBoundingClientRect() : heading?.getBoundingClientRect() ?? box;
        // Stay in the empty margin, never over the section's content.
        const x = Math.max(9, Math.min(64, (box.left - base.left) / 2));
        return { x, y: anchor.top - base.top + anchor.height / 2 };
      });
      setPoints((previous) => previous.length === nextPoints.length && previous.every((point, i) => Math.abs(point.x - nextPoints[i].x) < .5 && Math.abs(point.y - nextPoints[i].y) < .5) ? previous : nextPoints);
      let current = -1;
      sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= viewportHeight * .35) current = i; });
      setActive(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(main);
    sections.forEach((section) => observer.observe(section));
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  function goTo(index: number) {
    const section = sectionsRef.current[index];
    if (!section) return;
    section.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    const heading = section.querySelector<HTMLElement>("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true });
    }
  }

  return <nav ref={navRef} className={styles.trail} aria-label="Trilha do MBO">
    <svg className={styles.lines} aria-hidden="true">{points.slice(1).map((point, i) => {
      const from = points[i];
      const middle = (from.y + point.y) / 2;
      const bend = Math.min(from.x, point.x) > 20 ? 14 : 0;
      const d = `M ${from.x} ${from.y} C ${from.x + bend} ${middle}, ${point.x - bend} ${middle}, ${point.x} ${point.y}`;
      return <g key={i}><path d={d} className={styles.path} /><path d={d} className={styles.completed} data-complete={active > i} />{active === i && <path d={d} pathLength={100} className={styles.flow} />}</g>;
    })}</svg>
    {points.map((point, i) => <button key={labels[i]} type="button" className={styles.checkpoint} style={{ left: point.x, top: point.y }} data-state={i === active ? "current" : i < active ? "visited" : "upcoming"} aria-current={i === active ? "step" : undefined} aria-label={`${i + 1}. ${labels[i]}`} title={`${String(i + 1).padStart(2, "0")} / ${labels[i]}`} onClick={() => goTo(i)}><span>{String(i + 1).padStart(2, "0")}</span></button>)}
  </nav>;
}
