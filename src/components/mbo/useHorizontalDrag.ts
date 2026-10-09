"use client";

import { useRef, type PointerEvent } from "react";

/** Horizontal gestures preserve native vertical scrolling on touch screens. */
export function useHorizontalDrag(onStep?: (direction: number) => void) {
  const gesture = useRef<{
    x: number; y: number; active: boolean;
    animations: { animation: Animation; time: number; running: boolean }[];
  } | null>(null);

  function finish(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = gesture.current;
    if (!current) return;
    if (current.active) {
      if (!cancelled && Math.abs(event.clientX - current.x) >= 40) {
        onStep?.(event.clientX < current.x ? 1 : -1);
      }
      current.animations.forEach(({ animation, running }) => { if (running) animation.play(); });
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }
    gesture.current = null;
  }

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest("button,a")) return;
      gesture.current = { x: event.clientX, y: event.clientY, active: false, animations: [] };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.active) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return; }
        if (Math.abs(dx) < 10) return;
        current.active = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        if (!onStep) {
          current.animations = event.currentTarget.getAnimations({ subtree: true }).map((animation) => ({ animation, time: Number(animation.currentTime ?? 0), running: animation.playState === "running" }));
          current.animations.forEach(({ animation }) => animation.pause());
        }
      }
      current.animations.forEach(({ animation, time }) => {
        // Keep negative offsets in the previous cycle, rather than before its start.
        const duration = Number(animation.effect?.getTiming().duration) || 10000;
        animation.currentTime = ((time - dx * 25) % duration + duration) % duration;
      });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => finish(event, true),
  };
}
