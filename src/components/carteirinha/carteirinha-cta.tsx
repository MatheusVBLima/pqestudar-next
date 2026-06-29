"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { cn } from "@/lib/utils";

interface CarteirinhaCtaProps {
  href: string;
  kind: "digital" | "fisica";
  source: string;
  children: ReactNode;
  className?: string;
  showExternalIcon?: boolean;
}

export function CarteirinhaCta({
  href,
  kind,
  source,
  children,
  className,
  showExternalIcon = true,
}: CarteirinhaCtaProps) {
  const { track } = useAnalyticsTracker();

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => {
        track({
          event_name: "carteirinha_checkout_click",
          path: "/carteirinha",
          meta: { kind, source, destination: href },
          allowAnonymous: true,
        });
      }}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {children}
      {showExternalIcon && <ExternalLink className="h-4 w-4" aria-hidden="true" />}
    </a>
  );
}
