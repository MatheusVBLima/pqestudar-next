"use client";

import {
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  HelpCircle,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { useState } from "react";

type Faq = {
  question: string;
  answer: string;
};

export function CarteirinhaFaq({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const itemMeta = [
    { eyebrow: "Emissão", icon: HelpCircle },
    { eyebrow: "Elegibilidade", icon: UserCheck },
    { eyebrow: "Modalidades", icon: Smartphone },
    { eyebrow: "Liberação", icon: Clock3 },
    { eyebrow: "Comprovação", icon: GraduationCap },
    { eyebrow: "Condições", icon: CircleDollarSign },
  ];

  return (
    <div className="mt-10 w-full space-y-3">
      {items.map((faq, index) => {
        const isOpen = openIndex === index;
        const panelId = `carteirinha-faq-panel-${index}`;
        const buttonId = `carteirinha-faq-button-${index}`;
        const meta = itemMeta[index] ?? itemMeta[0];
        const Icon = meta.icon;

        return (
          <div
            key={faq.question}
            data-state={isOpen ? "open" : "closed"}
            className={`group overflow-hidden rounded-xl border bg-background/60 shadow-sm transition-all duration-300 ${
              isOpen
                ? "border-primary/35 bg-primary/[0.035] shadow-[0_18px_55px_-34px_hsl(var(--primary)/0.65)]"
                : "border-border/60 hover:border-primary/25 hover:bg-background hover:shadow-md"
            }`}
          >
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left outline-none transition-colors duration-200 focus-visible:bg-primary/[0.06] sm:px-6"
              >
                <span className="flex min-w-0 items-center gap-4 pr-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      isOpen
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border/70 bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                        isOpen ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {meta.eyebrow}
                    </span>
                    <span className="block text-[0.95rem] font-semibold leading-snug text-foreground">
                      {faq.question}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`shrink-0 text-muted-foreground transition-transform duration-300 ease-out ${isOpen ? "rotate-180 text-primary" : ""}`}
                >
                  <ChevronDown className="h-4 w-4" />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-[400ms] ease-out motion-reduce:transition-none ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 pt-0 sm:px-6">
                  <div className="rounded-lg border border-primary/10 bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground shadow-sm sm:ml-14">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resposta rápida
                    </div>
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
