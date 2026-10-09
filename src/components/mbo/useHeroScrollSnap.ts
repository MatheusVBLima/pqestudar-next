"use client";

import { useEffect, useRef } from "react";

export function useHeroScrollSnap() {
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const intro = introRef.current;
    if (!intro) return;
    const sections = Array.from(intro.parentElement?.children ?? []).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && (element === intro || element.tagName === "SECTION"),
    );
    if (sections.length < 2) return;

    // Support both the document and the site's nested scrolling layout.
    let parent = intro.parentElement;
    while (parent && parent !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) break;
      parent = parent.parentElement;
    }
    const scroller = parent && parent !== document.body ? parent : null;
    const source = scroller ?? window;
    const position = () => scroller ? scroller.scrollTop : window.scrollY;
    const viewportTop = () => scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
    const viewportHeight = () => scroller ? scroller.clientHeight : window.innerHeight;
    let previous = position();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let transitioning = false;
    let unlockTimer: ReturnType<typeof setTimeout> | undefined;
    let distance = 0;

    const unlock = () => {
      transitioning = false;
      distance = 0;
      previous = position();
      clearTimeout(unlockTimer);
    };

    const nextSection = () => {
      const top = viewportTop();
      const height = viewportHeight();
      for (let index = 1; index < sections.length; index++) {
        const section = sections[index];
        if (!section.getClientRects().length) continue;
        const remaining = section.getBoundingClientRect().top - top;
        const before = sections[index - 1].getBoundingClientRect();
        // Read a tall section through its end before snapping to the next one.
        if (before.top <= top + 1 && remaining > 1 && remaining <= height) return section;
      }
      return null;
    };

    const onScroll = () => {
      const current = position();
      const delta = current - previous;
      previous = current;
      clearTimeout(timer);
      if (transitioning) return;
      if (delta <= 0) { distance = 0; return; }
      distance += delta;
      if (distance < 24 || !intro.getClientRects().length) return;
      const next = nextSection();
      if (!next) return;
      timer = setTimeout(() => {
        if (nextSection() !== next) return;
        const remaining = next.getBoundingClientRect().top - viewportTop();
        if (remaining <= 1 || remaining > viewportHeight()) return;
        transitioning = true;
        distance = 0;
        const top = position() + remaining;
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
        unlockTimer = setTimeout(unlock, 1400);
        if (scroller) scroller.scrollTo({ top, behavior });
        else window.scrollTo({ top, behavior });
      }, 140);
    };

    source.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      source.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
      clearTimeout(unlockTimer);
    };
  }, []);

  return introRef;
}
