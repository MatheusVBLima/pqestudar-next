"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  ScrollText,
  ShoppingBag,
  Sparkles,
  Vote,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pqe_discovery_tour_v2";
const TOOL_VISITS_KEY = "pqe_discovery_tool_visits_v1";
const PROMPT_DELAY_MS = 2_000;
const DISCOVERY_MOBILE_MENU_EVENT = "pqe:discovery-mobile-menu";

type TourState = "idle" | "prompt" | "tour";
type StoredState = "dismissed" | "completed";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardPosition {
  top: number;
  left: number;
  arrowLeft: number;
  placement: "top" | "bottom";
}

const STEPS = [
  {
    eyebrow: "1 de 6 · Ferramentas",
    title: "Seu ponto de partida",
    description:
      "Explore recursos organizados para estudar, produzir e resolver tarefas com mais praticidade.",
    href: "/ferramentas",
    targetLabel: "ferramentas",
    icon: Wrench,
  },
  {
    eyebrow: "2 de 6 · Concursos",
    title: "Acompanhe oportunidades sem se perder",
    description:
      "Encontre oportunidades com filtros por área, escolaridade e situação, além dos detalhes e editais.",
    href: "/concursos",
    targetLabel: "concursos",
    icon: ScrollText,
  },
  {
    eyebrow: "3 de 6 · Guias",
    title: "Transforme informação em um caminho",
    description:
      "Encontre explicações e próximos passos para aplicar melhor as ferramentas e avançar nos estudos.",
    href: "/guias",
    targetLabel: "guias",
    icon: BookOpen,
  },
  {
    eyebrow: "4 de 6 · Exclusivos",
    title: "Acesse materiais criados para avançar",
    description:
      "Conheça guias e recursos prontos, desenvolvidos pela equipe do PqEstudar para acelerar seu progresso.",
    href: "/exclusivos",
    targetLabel: "exclusivos",
    icon: ShoppingBag,
  },
  {
    eyebrow: "5 de 6 · Votações",
    title: "Ajude a escolher o que vem depois",
    description:
      "Sugira funcionalidades e vote nas ideias mais importantes. A comunidade participa das próximas decisões.",
    href: "/votacoes",
    targetLabel: "votações",
    icon: Vote,
  },
  {
    eyebrow: "6 de 6 · Seu próximo passo",
    title: "O PqEstudar vai além do catálogo",
    description:
      "Agora você conhece o menu completo. Escolha a área que mais combina com o que precisa neste momento.",
    href: null,
    targetLabel: null,
    icon: Sparkles,
  },
] as const;

function readStoredState(): StoredState | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) as StoredState | null;
  } catch {
    return null;
  }
}

function writeStoredState(value: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // The tour remains usable when storage is blocked.
  }
}

function registerToolVisit(pathname: string): number {
  const slug = pathname.split("/").filter(Boolean)[1];
  if (!slug) return 0;

  try {
    const stored = window.localStorage.getItem(TOOL_VISITS_KEY);
    const visits = stored ? (JSON.parse(stored) as string[]) : [];
    const uniqueVisits = Array.from(new Set([...visits, slug])).slice(-10);
    window.localStorage.setItem(TOOL_VISITS_KEY, JSON.stringify(uniqueVisits));
    return uniqueVisits.length;
  } catch {
    return 0;
  }
}

function isToolDetailPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 2 && parts[0] === "ferramentas" && parts[1] !== "salvos";
}

export function DiscoveryTour() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { track } = useAnalyticsTracker();
  const { consentData } = useCookieConsent();
  const prefersReducedMotion = useReducedMotion();
  const [state, setState] = useState<TourState>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const forcedMode = searchParams?.get("tour");
  const step = STEPS[stepIndex];

  const finish = useCallback(
    (result: StoredState, source: string) => {
      if (forcedMode !== "1") writeStoredState(result);
      setState("idle");
      track({
        event_name: result === "completed" ? "discovery_tour_completed" : "discovery_tour_dismissed",
        path: pathname,
        meta: { source, step: stepIndex + 1 },
        allowAnonymous: true,
      });
    },
    [forcedMode, pathname, stepIndex, track],
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const shouldOpen = !isDesktop && state === "tour" && step.targetLabel !== null;
    window.dispatchEvent(
      new CustomEvent(DISCOVERY_MOBILE_MENU_EVENT, {
        detail: { open: shouldOpen, locked: shouldOpen },
      }),
    );
  }, [isDesktop, state, step.targetLabel]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent(DISCOVERY_MOBILE_MENU_EVENT, {
          detail: { open: false, locked: false },
        }),
      );
    };
  }, []);

  useEffect(() => {
    if (forcedMode === "reset") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(TOOL_VISITS_KEY);
      setState("idle");
      return;
    }

    if (forcedMode === "1") {
      const timer = window.setTimeout(() => setState("prompt"), 350);
      return () => window.clearTimeout(timer);
    }

    // Avoid stacking onboarding on top of the first-visit cookie decision.
    if (!consentData.hasConsented || !isToolDetailPath(pathname) || readStoredState()) return;

    const visitCount = registerToolVisit(pathname);
    if (visitCount < 2) return;

    const showPrompt = () => {
      if (readStoredState()) return;
      setState("prompt");
      track({
        event_name: "discovery_tour_prompted",
        path: pathname,
        meta: { trigger: "second_distinct_tool", distinct_tool_visits: visitCount },
        allowAnonymous: true,
      });
    };

    const timer = window.setTimeout(showPrompt, PROMPT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [consentData.hasConsented, forcedMode, pathname, track]);

  useEffect(() => {
    if (state !== "tour" || !step.targetLabel) {
      setSpotlight(null);
      return;
    }

    const updateSpotlight = () => {
      const targetByLabel = Array.from(
        document.querySelectorAll<HTMLElement>("[data-discovery-label]"),
      ).find((element) => {
        if (element.dataset.discoveryLabel !== step.targetLabel) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const targetByHref = step.href
        ? Array.from(
            document.querySelectorAll<HTMLElement>(`[data-discovery-href="${step.href}"]`),
          ).find((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
        : null;
      const target = targetByLabel ?? targetByHref;
      if (!target) {
        setSpotlight(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const padding = 6;
      setSpotlight({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    };

    updateSpotlight();
    const observer = new MutationObserver(updateSpotlight);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [isDesktop, state, step.href, step.targetLabel]);

  useEffect(() => {
    if (state === "idle") return;
    if (state === "tour") primaryButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish("dismissed", "escape");
      if (state === "tour" && event.key === "ArrowRight" && stepIndex < STEPS.length - 1) {
        setStepIndex((current) => current + 1);
      }
      if (state === "tour" && event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((current) => current - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish, state, stepIndex]);

  const cardPosition = useMemo<CardPosition | undefined>(() => {
    if (!isDesktop || !spotlight || stepIndex === STEPS.length - 1) return undefined;
    const cardWidth = 360;
    const estimatedCardHeight = 310;
    const viewportPadding = 16;
    const gap = 16;
    const targetCenter = spotlight.left + spotlight.width / 2;
    const left = Math.max(
      viewportPadding,
      Math.min(targetCenter - cardWidth / 2, window.innerWidth - cardWidth - viewportPadding),
    );
    const fitsBelow = spotlight.top + spotlight.height + gap + estimatedCardHeight <= window.innerHeight;
    const placement = fitsBelow ? "bottom" : "top";
    const top = placement === "bottom"
      ? spotlight.top + spotlight.height + gap
      : Math.max(viewportPadding, spotlight.top - estimatedCardHeight - gap);

    return {
      top,
      left,
      arrowLeft: Math.max(22, Math.min(targetCenter - left, cardWidth - 22)),
      placement,
    };
  }, [isDesktop, spotlight, stepIndex]);

  if (state === "idle") return null;

  if (state === "prompt") {
    return (
      <motion.aside
        className="fixed bottom-4 left-4 right-4 z-[70] ml-auto max-w-sm rounded-[1.2rem] border border-primary/25 bg-background/95 p-5 shadow-2xl backdrop-blur md:bottom-6 md:right-6 md:left-auto"
        aria-labelledby="discovery-prompt-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={() => finish("dismissed", "prompt_close")}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fechar apresentação"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-2 flex items-center gap-3 pr-6">
          <div className="relative h-9 w-9 shrink-0">
            {!prefersReducedMotion && (
              <motion.span
                className="pointer-events-none absolute inset-0 rounded-full border border-primary/50"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: [0, 0.65, 0], scale: [0.85, 1, 1.8] }}
                transition={{ duration: 0.8, delay: 0.32, ease: "easeOut" }}
                aria-hidden="true"
              />
            )}
            <motion.div
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.1, 1] }}
              transition={{ duration: 0.55, delay: 0.35, ease: "easeOut" }}
            >
              <Compass className="h-4 w-4" />
            </motion.div>
          </div>
          <h2 id="discovery-prompt-title" className="text-lg font-bold">
            Há mais para explorar
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Você já explorou algumas ferramentas. Quer conhecer todo o menu do PqEstudar em menos de 1 minuto?
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Button
            ref={primaryButtonRef}
            size="sm"
            className="rounded-full"
            onClick={() => {
              setStepIndex(0);
              setState("tour");
              track({
                event_name: "discovery_tour_started",
                path: pathname,
                meta: { source: forcedMode === "1" ? "forced_preview" : "tool_detail" },
                allowAnonymous: true,
              });
            }}
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Explorar agora
          </Button>
          <Button variant="ghost" size="sm" onClick={() => finish("dismissed", "prompt_later") }>
            Agora não
          </Button>
        </div>
      </motion.aside>
    );
  }

  const StepIcon = step.icon;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="discovery-title">
      {spotlight && !isLast ? (
        <div
          className="pointer-events-none fixed rounded-[1rem] border-2 border-primary bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.68)] transition-all duration-300"
          style={spotlight}
          aria-hidden="true"
        />
      ) : (
        <div className="absolute inset-0 bg-black/65" aria-hidden="true" />
      )}

      <section
        className={cn(
          "fixed z-[90] w-[calc(100%_-_2rem)] rounded-[1.2rem] border bg-background p-5 shadow-2xl",
          isLast ? "max-w-[380px] md:max-w-[560px]" : "max-w-[360px]",
          !cardPosition && "bottom-4 left-4 right-4 mx-auto md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
        )}
        style={cardPosition ? { top: cardPosition.top, left: cardPosition.left } : undefined}
      >
        {cardPosition && (
          <span
            className={cn(
              "absolute h-3 w-3 rotate-45 border bg-background",
              cardPosition.placement === "bottom"
                ? "-top-1.5 border-b-0 border-r-0"
                : "-bottom-1.5 border-l-0 border-t-0",
            )}
            style={{ left: cardPosition.arrowLeft - 6 }}
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          onClick={() => finish("dismissed", "tour_close")}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Encerrar apresentação"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <StepIcon className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{step.eyebrow}</p>
        <h2 id="discovery-title" className="mt-1 pr-5 text-xl font-bold leading-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>

        {isLast && (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              ["Concursos", "/concursos"],
              ["Guias", "/guias"],
              ["Exclusivos", "/exclusivos"],
              ["Votações", "/votacoes"],
            ].map(([label, destination]) => (
              <Button
                key={destination}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  if (forcedMode !== "1") writeStoredState("completed");
                  track({
                    event_name: "discovery_tour_destination_click",
                    path: pathname,
                    meta: { destination },
                    allowAnonymous: true,
                  });
                  router.push(destination);
                  setState("idle");
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1" aria-label={`Etapa ${stepIndex + 1} de ${STEPS.length}`}>
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={cn("h-1.5 rounded-full transition-all", index === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30")}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStepIndex((current) => current - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            )}
            {isLast ? (
              <Button ref={primaryButtonRef} size="sm" className="rounded-full" onClick={() => finish("completed", "finish_button") }>
                Concluir
              </Button>
            ) : (
              <Button ref={primaryButtonRef} size="sm" className="rounded-full" onClick={() => setStepIndex((current) => current + 1)}>
                Avançar <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
