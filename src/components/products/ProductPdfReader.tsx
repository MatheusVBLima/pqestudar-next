"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Expand, ExternalLink, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";

interface ProductPdfReaderProps {
  title: string;
  viewerUrl: string;
  downloadUrl: string;
  productId: string;
  productSlug: string;
}

export function ProductPdfReader({ title, viewerUrl, downloadUrl, productId, productSlug }: ProductPdfReaderProps) {
  const [expanded, setExpanded] = useState(false);
  const { track, analyticsReady } = useAnalyticsTracker();
  const openedRef = useRef(false);

  useEffect(() => {
    if (!analyticsReady || openedRef.current) return;
    openedRef.current = true;
    void track({
      event_name: "exclusive_detail_open",
      entity_type: "product",
      entity_id: productId,
      meta: { product_slug: productSlug, product_title: title },
      allowAnonymous: true,
    });

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void track({
        event_name: "exclusive_read_heartbeat",
        entity_type: "product",
        entity_id: productId,
        meta: { product_slug: productSlug, read_seconds_increment: 15 },
        allowAnonymous: true,
      });
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [analyticsReady, productId, productSlug, title, track]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  return (
    <section
      className={cn(
        "overflow-hidden border bg-card shadow-sm",
        expanded
          ? "fixed inset-0 z-[100] flex h-dvh w-screen flex-col rounded-none"
          : "rounded-[1.2rem]",
      )}
      aria-label={`Leitor de PDF: ${title}`}
    >
      <header className="flex shrink-0 flex-col gap-4 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Leitor PqEstudar</p>
          <h1 className="mt-1 line-clamp-2 text-xl font-bold sm:truncate md:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Leia na plataforma ou baixe para consultar quando quiser.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <button
            type="button"
            className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-[1.2rem] border px-3 text-sm font-medium hover:bg-accent sm:px-4"
            onClick={() => setExpanded((current) => !current)}
            aria-pressed={expanded}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            {expanded ? "Reduzir" : "Tela cheia"}
          </button>
          <a
            className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-[1.2rem] bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:px-4"
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => void track({
              event_name: "exclusive_download_click",
              entity_type: "product",
              entity_id: productId,
              meta: { product_slug: productSlug, product_title: title },
              allowAnonymous: true,
            })}
          >
            <Download className="h-4 w-4" /> Baixar PDF
          </a>
        </div>
      </header>

      <div className={cn("min-h-0 bg-muted/40 p-2 sm:p-4", expanded && "flex-1")}>
        <iframe
          key={expanded ? "expanded" : "embedded"}
          title={`PDF — ${title}`}
          src={viewerUrl}
          className={cn(
            "w-full rounded-xl border bg-background",
            expanded ? "h-full min-h-0" : "h-[calc(100dvh-15rem)] min-h-[620px]",
          )}
        />
      </div>

      {!expanded && (
        <footer className="flex flex-col items-start gap-2 border-t px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <span>Continue explorando os conteúdos do PqEstudar após a leitura.</span>
          <a href="/exclusivos" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
            Ver mais exclusivos <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </footer>
      )}
    </section>
  );
}
