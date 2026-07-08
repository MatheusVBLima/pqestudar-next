"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  CreditCard,
  FileCheck2,
  HelpCircle,
  LockKeyhole,
  MessageCircle,
  Moon,
  ShieldCheck,
  QrCode,
  Sparkles,
  Star,
  Sun,
  TimerReset,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SalesTestimonial {
  quote: string;
  name: string;
  role?: string;
  imageUrl?: string;
}

export interface SalesOfferItem {
  title: string;
  description: string;
}

export interface SalesFaq {
  question: string;
  answer: string;
}

export interface SalesPageConfig {
  badge: string;
  title: string;
  highlightedTitle?: string;
  description: string;
  productName: string;
  productSubtitle: string;
  priceLabel: string;
  oldPriceLabel?: string;
  installmentLabel?: string;
  checkoutUrl?: string;
  stripeProductKey?: string;
  checkoutLabel: string;
  checkoutDisabledLabel?: string;
  guarantee: string;
  supportLabel?: string;
  urgency?: {
    label: string;
    minutes: number;
    storageKey?: string;
  };
  heroBullets: string[];
  testimonials: SalesTestimonial[];
  offerItems: SalesOfferItem[];
  faqs: SalesFaq[];
}

type SalesThemeMode = "dark" | "light";

const SALES_THEME_STORAGE_KEY = "pqestudar:sales-page:theme";

const salesThemeVars: Record<SalesThemeMode, CSSProperties> = {
  dark: {
    "--sales-bg": "#171417",
    "--sales-text": "#ffffff",
    "--sales-surface": "#241f25",
    "--sales-surface-strong": "#2f2431",
    "--sales-panel": "#1f1a20",
    "--sales-panel-hover": "#231d24",
    "--sales-panel-open": "#2a202c",
    "--sales-guarantee": "#2b1f2d",
    "--sales-muted": "#d4d4d8",
    "--sales-subtle": "#a1a1aa",
    "--sales-border": "rgba(255,255,255,0.10)",
    "--sales-soft": "rgba(255,255,255,0.05)",
    "--sales-mobile": "rgba(31,26,32,0.95)",
  } as CSSProperties,
  light: {
    "--sales-bg": "#f7f3f7",
    "--sales-text": "#151017",
    "--sales-surface": "#ffffff",
    "--sales-surface-strong": "#f3e8f4",
    "--sales-panel": "#ffffff",
    "--sales-panel-hover": "#f5edf6",
    "--sales-panel-open": "#f1e7f3",
    "--sales-guarantee": "#ffffff",
    "--sales-muted": "#4b4450",
    "--sales-subtle": "#706875",
    "--sales-border": "rgba(55,35,58,0.16)",
    "--sales-soft": "rgba(226,59,232,0.07)",
    "--sales-mobile": "rgba(255,255,255,0.95)",
  } as CSSProperties,
};

function getInitialSeconds(minutes: number) {
  return Math.max(0, Math.floor(minutes * 60));
}

function formatSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function UrgencyBar({ urgency }: { urgency?: SalesPageConfig["urgency"] }) {
  const [secondsLeft, setSecondsLeft] = useState(() => getInitialSeconds(urgency?.minutes ?? 15));

  useEffect(() => {
    if (!urgency) return;

    const durationMs = getInitialSeconds(urgency.minutes) * 1000;
    const storageKey =
      urgency.storageKey ??
      `pqestudar:sales-urgency:${urgency.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    const getDeadline = () => {
      const now = Date.now();
      const storedDeadline = Number(window.localStorage.getItem(storageKey));

      if (Number.isFinite(storedDeadline) && storedDeadline > now) {
        return storedDeadline;
      }

      const nextDeadline = now + durationMs;
      window.localStorage.setItem(storageKey, String(nextDeadline));
      return nextDeadline;
    };

    let deadline = getDeadline();

    const syncSecondsLeft = () => {
      const now = Date.now();

      if (deadline <= now) {
        deadline = now + durationMs;
        window.localStorage.setItem(storageKey, String(deadline));
      }

      setSecondsLeft(Math.max(0, Math.ceil((deadline - now) / 1000)));
    };

    syncSecondsLeft();
    const timer = window.setInterval(() => {
      syncSecondsLeft();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [urgency]);

  if (!urgency) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-red-300/30 bg-[#f43f3f] text-white shadow-[0_16px_40px_rgba(244,63,63,0.24)]">
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-4 text-center sm:flex-row sm:gap-4">
        <span className="text-sm font-black uppercase tracking-wide sm:text-base">
          {urgency.label}
        </span>
        <span className="hidden h-5 w-px bg-white/35 sm:block" aria-hidden="true" />
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xl font-black tabular-nums sm:text-2xl" suppressHydrationWarning>
          <TimerReset className="h-5 w-5" />
          {formatSeconds(secondsLeft)}
        </span>
      </div>
    </div>
  );
}

function CheckoutButton({
  config,
  className,
}: {
  config: SalesPageConfig;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStripeCheckout = async () => {
    if (!config.stripeProductKey || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey: config.stripeProductKey }),
      });

      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Não foi possível abrir o checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o checkout.");
      setLoading(false);
    }
  };

  const content = (
    <>
      {loading
        ? "Abrindo checkout..."
        : config.checkoutUrl || config.stripeProductKey
          ? config.checkoutLabel
          : config.checkoutDisabledLabel ?? "Checkout em breve"}
      <ArrowRight className="h-4 w-4" />
    </>
  );

  const baseClass = cn(
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(16,185,129,0.30)] transition hover:-translate-y-0.5 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70",
    !config.checkoutUrl && !config.stripeProductKey && "cursor-not-allowed opacity-85 hover:translate-y-0 hover:bg-emerald-500",
    loading && "cursor-wait opacity-85 hover:translate-y-0 hover:bg-emerald-500",
    className
  );

  if (config.stripeProductKey) {
    return (
      <div className={cn("w-full", className?.includes("w-auto") && "w-auto", className?.includes("sm:w-auto") && "sm:w-auto")}>
        <button type="button" disabled={loading} onClick={handleStripeCheckout} className={baseClass}>
          {content}
        </button>
        {errorMessage && (
          <p className="mt-2 text-center text-xs font-semibold text-red-400">{errorMessage}</p>
        )}
      </div>
    );
  }

  if (config.checkoutUrl) {
    return (
      <Link href={config.checkoutUrl} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" disabled className={baseClass}>
      {content}
    </button>
  );
}

function ProductVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-[radial-gradient(circle_at_top,rgba(226,59,232,0.34),transparent_38%),linear-gradient(135deg,#120912,#2a102d_42%,#0e0b10)] p-6 shadow-[0_24px_80px_rgba(226,59,232,0.14)]">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative flex min-h-[220px] flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
            <ShieldCheck className="h-4 w-4 text-fuchsia-200" />
            Análise antes da compra
          </div>
          <div className="flex text-yellow-300">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-4 w-4 fill-current" />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e23be8] text-white shadow-lg">
            <FileCheck2 className="h-7 w-7" />
          </div>
          <h2 className="max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">
            Certificado que Conta
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/75">
            Uma ferramenta simples para decidir se um curso ajuda no seu objetivo, currículo e rotina.
          </p>
        </div>

        <div className="grid gap-2 pt-6 sm:grid-cols-3">
          {["Objetivo", "Currículo", "Rotina"].map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white/85">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Testimonials({ testimonials }: { testimonials: SalesTestimonial[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {testimonials.map((testimonial) => (
        <article
          key={testimonial.name}
          className="flex h-full min-h-[340px] flex-col rounded-2xl border border-[var(--sales-border)] bg-[var(--sales-surface)] p-5 text-center text-[var(--sales-text)] shadow-sm"
        >
          <div className="mb-4 flex flex-col items-center justify-center gap-3">
            {testimonial.imageUrl && (
              <Image
                src={testimonial.imageUrl}
                alt={`Foto ilustrativa de ${testimonial.name}`}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-full border-2 border-fuchsia-300/30 object-cover shadow-[0_10px_24px_rgba(226,59,232,0.20)]"
              />
            )}
            <div className="flex justify-center text-yellow-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-current" />
              ))}
            </div>
          </div>
          <p className="text-lg font-black leading-snug">“{testimonial.quote}”</p>
          <p className="mt-auto pt-6 text-sm text-[var(--sales-muted)]">
            {testimonial.name}
            {testimonial.role ? ` · ${testimonial.role}` : ""}
          </p>
        </article>
      ))}
    </div>
  );
}

function OfferSummary({ config }: { config: SalesPageConfig }) {
  return (
    <aside className="lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-[var(--sales-surface)] text-[var(--sales-text)] shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
        <div className="border-b border-fuchsia-400/20 bg-[var(--sales-surface-strong)] px-5 py-4 text-center text-lg font-black text-[var(--sales-text)]">
          Compra segura
        </div>
        <div className="space-y-5 p-5">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-fuchsia-400/12 text-fuchsia-300">
              <FileCheck2 className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight">{config.productName}</h2>
              <p className="mt-1 text-sm text-[var(--sales-muted)]">{config.productSubtitle}</p>
              {config.supportLabel && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--sales-subtle)]">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {config.supportLabel}
                </p>
              )}
            </div>
          </div>

          <div className="border-y border-[var(--sales-border)] py-5">
            <p className="text-sm font-semibold text-[var(--sales-muted)]">Total</p>
            {config.installmentLabel && (
              <p className="mt-1 text-2xl font-black text-fuchsia-300">{config.installmentLabel}</p>
            )}
            <div className="mt-2 flex items-end gap-2">
              {config.oldPriceLabel && (
                <span className="text-sm text-[var(--sales-subtle)] line-through">{config.oldPriceLabel}</span>
              )}
              <span className="text-xl font-black">{config.priceLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--sales-border)] bg-[var(--sales-soft)] p-3 text-center text-xs font-semibold text-[var(--sales-muted)]">
              <QrCode className="mx-auto mb-2 h-5 w-5" />
              Pix
            </div>
            <div className="rounded-xl border border-[var(--sales-border)] bg-[var(--sales-soft)] p-3 text-center text-xs font-semibold text-[var(--sales-muted)]">
              <CreditCard className="mx-auto mb-2 h-5 w-5" />
              Cartão
            </div>
          </div>

          <CheckoutButton config={config} />

          <div className="space-y-2 text-xs text-[var(--sales-muted)]">
            <p className="flex items-center justify-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-fuchsia-300" />
              Pagamento processado em ambiente seguro
            </p>
            <p className="text-center">{config.guarantee}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function FaqList({ faqs }: { faqs: SalesFaq[] }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className="group overflow-hidden rounded-2xl border border-[var(--sales-border)] bg-[var(--sales-panel)] text-[var(--sales-text)] transition-all duration-300 hover:border-fuchsia-300/25 hover:bg-[var(--sales-panel-hover)] open:border-fuchsia-300/35 open:bg-[var(--sales-panel-open)]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold hover:no-underline sm:px-6">
            <span className="leading-snug">{faq.question}</span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-200 transition group-open:rotate-12 group-open:bg-fuchsia-300/15">
              <HelpCircle className="h-3.5 w-3.5" />
            </span>
          </summary>
          <div className="px-5 pb-5 sm:px-6">
            <div className="rounded-xl border border-fuchsia-300/10 bg-[var(--sales-soft)] p-4 text-sm leading-relaxed text-[var(--sales-muted)]">
              {faq.answer}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

export function ProductSalesPage({ config }: { config: SalesPageConfig }) {
  const valueStack = useMemo(() => config.offerItems.slice(0, 6), [config.offerItems]);
  const [themeMode, setThemeMode] = useState<SalesThemeMode>("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(SALES_THEME_STORAGE_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeMode(storedTheme);
    }
  }, []);

  const toggleThemeMode = () => {
    setThemeMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(SALES_THEME_STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <main
      className="min-h-screen bg-[var(--sales-bg)] text-[var(--sales-text)] transition-colors duration-300"
      style={salesThemeVars[themeMode]}
    >
      <button
        type="button"
        onClick={toggleThemeMode}
        className="fixed right-4 top-4 z-50 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--sales-border)] bg-[var(--sales-surface)] px-3 text-xs font-black text-[var(--sales-text)] shadow-[0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:border-fuchsia-300/35 hover:bg-[var(--sales-panel-hover)] sm:right-6 sm:top-6"
        aria-label={themeMode === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        {themeMode === "dark" ? <Sun className="h-4 w-4 text-yellow-300" /> : <Moon className="h-4 w-4 text-fuchsia-400" />}
        <span className="hidden sm:inline">{themeMode === "dark" ? "Modo claro" : "Modo escuro"}</span>
      </button>

      <section className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
        <div className="space-y-5">
          <UrgencyBar urgency={config.urgency} />

          <ProductVisual />

          <section className="rounded-2xl border border-[var(--sales-border)] bg-[var(--sales-surface)] p-6 shadow-sm">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-fuchsia-400/12 px-3 py-1 text-xs font-black uppercase text-fuchsia-300">
              <BadgeCheck className="h-4 w-4" />
              {config.badge}
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
              {config.title}
              {config.highlightedTitle && <span className="text-fuchsia-300"> {config.highlightedTitle}</span>}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--sales-muted)]">{config.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {config.heroBullets.map((bullet) => (
                <div key={bullet} className="flex gap-3 rounded-xl border border-[var(--sales-border)] bg-[var(--sales-soft)] p-3 text-sm text-[var(--sales-text)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <CheckoutButton config={config} className="sm:w-auto" />
              <p className="text-sm text-[var(--sales-muted)]">
                Pix ou cartão. Acesso liberado após confirmação do pagamento.
              </p>
            </div>
          </section>

          <Testimonials testimonials={config.testimonials} />

          <section className="rounded-2xl border border-[var(--sales-border)] bg-[var(--sales-surface)] p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-300" />
              <h2 className="text-2xl font-black">O que você recebe</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {valueStack.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-xl border border-[var(--sales-border)] bg-[var(--sales-soft)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:bg-emerald-400/12 hover:shadow-[0_18px_38px_rgba(16,185,129,0.10)]"
                >
                  <h3 className="font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--sales-muted)] transition-colors duration-300 group-hover:text-emerald-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-fuchsia-400/30 bg-[var(--sales-guarantee)] p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Image
                src="/images/garantia-7-dias.png"
                alt="Selo de garantia de 7 dias"
                width={104}
                height={104}
                className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_12px_26px_rgba(245,158,11,0.22)] sm:h-28 sm:w-28"
              />
              <div>
                <h2 className="text-2xl font-black">Garantia de 7 dias</h2>
                <p className="mt-1 text-[var(--sales-muted)]">{config.guarantee}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--sales-border)] bg-[var(--sales-surface)] p-6 shadow-sm md:p-7">
            <div className="mb-5 flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-fuchsia-300" />
              <h2 className="text-2xl font-black">Perguntas frequentes</h2>
            </div>
            <FaqList faqs={config.faqs} />
          </section>
        </div>

        <OfferSummary config={config} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--sales-border)] bg-[var(--sales-mobile)] p-3 shadow-[0_-12px_30px_rgba(0,0,0,0.18)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--sales-muted)]">{config.productName}</p>
            <p className="font-black text-fuchsia-300">{config.priceLabel}</p>
          </div>
          <CheckoutButton config={config} className="min-h-10 w-auto px-4 py-2 text-xs" />
        </div>
      </div>
    </main>
  );
}
