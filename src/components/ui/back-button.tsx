"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  /** Where to go if there is no internal history to go back to. */
  fallbackPath: string;
  /** Label rendered when falling back (e.g. "Premium", "Concursos"). Capitalized via CSS. */
  fallbackLabel?: string;
}

/**
 * Contextual back button: uses router.back() when the previous page is internal,
 * otherwise navigates to fallbackPath. Renders "Voltar" when going back to
 * history, or "Voltar para {fallbackLabel}" when going to fallback.
 */
export function BackButton({ fallbackPath, fallbackLabel = "Voltar" }: BackButtonProps) {
  const router = useRouter();
  const [hasInternalHistory, setHasInternalHistory] = useState(false);

  useEffect(() => {
    const currentHost = window.location.host;
    const referrer = document.referrer;
    setHasInternalHistory(referrer.includes(currentHost) && window.history.length > 1);
  }, []);

  const handleClick = () => {
    if (hasInternalHistory) {
      router.back();
      return;
    }
    router.push(fallbackPath);
  };

  const label = hasInternalHistory ? "Voltar" : fallbackLabel;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="-ml-2 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="capitalize">{label}</span>
    </Button>
  );
}
