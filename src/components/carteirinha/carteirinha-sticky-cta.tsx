"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export function CarteirinhaStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const actions = document.getElementById("carteirinha-hero-actions");
        const options = document.getElementById("opcoes");

        if (!actions || !options) return;

        const actionsPassed = actions.getBoundingClientRect().bottom < 64;
        const optionsReached = options.getBoundingClientRect().top < window.innerHeight * 0.82;
        setVisible(actionsPassed && !optionsReached);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 p-3 backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none md:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <a
        href="#opcoes"
        tabIndex={visible ? 0 : -1}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-primary-foreground shadow-lg"
      >
        Escolher minha carteirinha <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );
}
