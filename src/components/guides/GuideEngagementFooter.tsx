"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Share2, Facebook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GuideCommentsDrawer } from "./GuideCommentsDrawer";

interface Props {
  guideId: string;
  guideTitle: string;
}

const FacebookIcon = Facebook;
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.34 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export function GuideEngagementFooter({ guideId, guideTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("guide_comments")
      .select("id", { count: "exact", head: true })
      .eq("guide_id", guideId)
      .eq("status", "approved")
      .then(({ count }) => {
        if (!cancelled) setCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [guideId, open]);

  const url = typeof window !== "undefined" ? window.location.href : "";
  const text = guideTitle;

  const shareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=500",
    );
  };
  const shareX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer,width=600,height=500",
    );
  };
  const shareWhatsapp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const shareNative = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      const el = document.createElement("div");
      el.textContent = "Link copiado";
      el.className =
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-foreground text-background px-4 py-2 rounded-full text-sm shadow-card";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    } catch {
      /* noop */
    }
  };

  const commentLabel =
    count === null
      ? "Dúvidas dos leitores"
      : count === 0
        ? "Tirar dúvida sobre o guia"
        : `Dúvidas dos leitores (${count})`;

  return (
    <section className="mt-12 pt-6 border-t border-border">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="rounded-full w-full sm:w-auto"
          aria-label="Abrir comentários"
        >
          <MessageCircle className="h-4 w-4" />
          {commentLabel}
        </Button>

        <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground hidden sm:inline mr-1">
            Compartilhar
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={shareFacebook}
            aria-label="Compartilhar no Facebook"
          >
            <FacebookIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={shareX}
            aria-label="Compartilhar no X"
          >
            <XIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={shareWhatsapp}
            aria-label="Compartilhar no WhatsApp"
          >
            <WhatsAppIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={shareNative}
            aria-label="Mais opções de compartilhamento"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GuideCommentsDrawer
        open={open}
        onOpenChange={setOpen}
        guideId={guideId}
        guideTitle={guideTitle}
      />
    </section>
  );
}
