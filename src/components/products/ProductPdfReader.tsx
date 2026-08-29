"use client";

import { useEffect, useState } from "react";
import { Download, Expand, ExternalLink, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductPdfReaderProps {
  title: string;
  viewerUrl: string;
  downloadUrl: string;
}

export function ProductPdfReader({ title, viewerUrl, downloadUrl }: ProductPdfReaderProps) {
  const [expanded, setExpanded] = useState(false);

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
      <header className="flex shrink-0 flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Leitor PqEstudar</p>
          <h1 className="mt-1 truncate text-xl font-bold md:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Leia na plataforma ou baixe para consultar quando quiser.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-[1.2rem] border px-4 text-sm font-medium hover:bg-accent"
            onClick={() => setExpanded((current) => !current)}
            aria-pressed={expanded}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            {expanded ? "Sair da tela cheia" : "Tela cheia"}
          </button>
          <a
            className="inline-flex h-10 items-center gap-2 rounded-[1.2rem] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
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
        <footer className="flex items-center justify-between gap-4 border-t px-5 py-4 text-sm text-muted-foreground">
          <span>Continue explorando os conteúdos do PqEstudar após a leitura.</span>
          <a href="/exclusivos" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
            Ver mais exclusivos <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </footer>
      )}
    </section>
  );
}
