"use client";

import { useEffect } from "react";

type DragState = {
  active: boolean;
  moved: boolean;
  startX: number;
  startY: number;
  candidates: Array<{
    element: HTMLElement;
    scrollLeft: number;
    scrollTop: number;
  }>;
};

const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "summary",
  "[contenteditable='true']",
  "[draggable='true']",
  "[role='button']",
  "[role='slider']",
  "[role='textbox']",
  "[data-no-drag-scroll]",
].join(",");

function isScrollable(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const canScrollX = /(auto|scroll|overlay)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
  const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
  return canScrollX || canScrollY;
}

function collectScrollCandidates(target: Element) {
  const candidates: HTMLElement[] = [];
  let current: Element | null = target;
  while (current && current !== document.documentElement) {
    if (current instanceof HTMLElement && isScrollable(current)) candidates.push(current);
    current = current.parentElement;
  }
  const root = document.scrollingElement;
  if (root instanceof HTMLElement && !candidates.includes(root)) candidates.push(root);
  return candidates;
}

function canMove(element: HTMLElement, axis: "x" | "y") {
  return axis === "x"
    ? element.scrollWidth > element.clientWidth + 1
    : element.scrollHeight > element.clientHeight + 1;
}

export function GlobalDragScroll() {
  useEffect(() => {
    const drag: DragState = {
      active: false,
      moved: false,
      startX: 0,
      startY: 0,
      candidates: [],
    };
    let suppressNextClick = false;
    let clickResetTimer: number | null = null;

    const stopDrag = () => {
      if (!drag.active) return;
      drag.active = false;
      suppressNextClick = drag.moved;
      if (clickResetTimer) window.clearTimeout(clickResetTimer);
      clickResetTimer = window.setTimeout(() => {
        suppressNextClick = false;
        clickResetTimer = null;
      }, 150);
      document.documentElement.classList.remove("is-drag-scrolling");
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest(INTERACTIVE_SELECTOR)) return;

      const candidates = collectScrollCandidates(target);
      if (!candidates.length) return;
      drag.active = true;
      drag.moved = false;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.candidates = candidates.map((element) => ({
        element,
        scrollLeft: element.scrollLeft,
        scrollTop: element.scrollTop,
      }));
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!drag.active) return;
      const totalX = event.clientX - drag.startX;
      const totalY = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(totalX, totalY) < 6) return;

      drag.moved = true;
      document.documentElement.classList.add("is-drag-scrolling");
      window.getSelection()?.removeAllRanges();

      const primaryAxis: "x" | "y" = Math.abs(totalX) > Math.abs(totalY) ? "x" : "y";
      const target =
        drag.candidates.find((candidate) => canMove(candidate.element, primaryAxis)) || drag.candidates[0];
      target.element.scrollLeft = target.scrollLeft - totalX;
      target.element.scrollTop = target.scrollTop - totalY;
      event.preventDefault();
    };

    const handleClick = (event: MouseEvent) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    window.addEventListener("blur", stopDrag);
    window.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      window.removeEventListener("blur", stopDrag);
      window.removeEventListener("click", handleClick, { capture: true });
      if (clickResetTimer) window.clearTimeout(clickResetTimer);
      document.documentElement.classList.remove("is-drag-scrolling");
    };
  }, []);

  return null;
}
