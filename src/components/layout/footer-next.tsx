"use client";

import Link from "next/link";
import { Instagram, Youtube, Facebook } from "lucide-react";
import { useNavConfig } from "@/hooks/useNavConfig";

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.276 3.24-.953 1.16-2.333 1.77-4.1 1.817-1.308-.035-2.397-.46-3.236-1.266-.869-.836-1.33-1.97-1.336-3.285.012-1.86.758-3.228 2.157-3.955.986-.513 2.234-.755 3.72-.72 1.073.025 2.036.16 2.876.402l.006-.058c-.095-1.247-.435-2.129-1.01-2.622-.622-.533-1.565-.801-2.804-.798l-.038.001c-.936.01-1.741.232-2.391.66-.587.387-1 .917-1.227 1.573l-1.96-.6c.325-.924.905-1.69 1.724-2.279.955-.687 2.138-1.04 3.512-1.06l.041-.001h.014c1.81 0 3.231.508 4.222 1.51.893.903 1.37 2.15 1.49 3.722.535.228 1.025.503 1.466.825 1.237.906 2.126 2.174 2.57 3.674.515 1.74.367 3.732-.832 5.37-1.722 2.352-4.452 3.088-7.573 3.116ZM10.4 16.428c.024.855.29 1.53.793 2.012.513.492 1.217.745 2.092.752 1.195-.03 2.123-.422 2.76-1.166.517-.604.875-1.44 1.063-2.484-.77-.32-1.703-.5-2.82-.524-1.07-.023-1.985.116-2.7.41-.95.388-1.2 1.052-1.188 1Zm0 0" />
  </svg>
);

const socialLinks = [
  { icon: Instagram, url: "https://www.instagram.com/pqestudar/", label: "Instagram" },
  { icon: Youtube, url: "https://www.youtube.com/@mdias-ofc", label: "YouTube" },
  { icon: Facebook, url: "https://www.facebook.com/mdias.ofc", label: "Facebook" },
  { icon: ThreadsIcon, url: "https://www.threads.com/@mdias.ofc", label: "Threads" },
];

const allNavLinks = [
  { label: "Exclusivos", to: "/exclusivos" },
  { label: "Sobre", to: "/sobre-pqestudar" },
  { label: "Privacidade", to: "/privacidade" },
  { label: "Termos", to: "/termos" },
  { label: "Cookies", to: "/configuracoes-cookies" },
];

const navLinksTop = [
  { label: "Exclusivos", to: "/exclusivos" },
  { label: "Sobre", to: "/sobre-pqestudar" },
];

const navLinksBottom = [
  { label: "Privacidade", to: "/privacidade" },
  { label: "Termos", to: "/termos" },
  { label: "Cookies", to: "/configuracoes-cookies" },
];

export function Footer() {
  const { logos } = useNavConfig();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background shrink-0 w-full">
      <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ===== MOBILE LAYOUT (< md) ===== */}
        <div className="md:hidden flex flex-col gap-6">
          {/* Logo + Socials on same line */}
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="Ir para a página inicial">
              <img
                src={logos.light}
                alt="PqEstudar"
                width={120}
                height={36}
                className="h-8 w-auto object-contain block dark:hidden"
              />
              <img
                src={logos.dark}
                alt="PqEstudar"
                width={120}
                height={36}
                className="h-8 w-auto object-contain hidden dark:block"
              />
            </Link>
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Seguir no ${s.label}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <s.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Nav links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center">
            {allNavLinks.map((l) => (
              <Link
                key={l.to}
                href={l.to}
                className="text-sm text-foreground hover:text-primary transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-border" />

          {/* Copyright */}
          <div className="text-center text-xs text-muted-foreground leading-relaxed">
            <p>© {currentYear} PqEstudar</p>
            <p>Todos os direitos reservados</p>
          </div>
        </div>

        {/* ===== DESKTOP LAYOUT (>= md) ===== */}
        <div className="hidden md:block">
          {/* Top row: logo + socials */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" aria-label="Ir para a página inicial">
              <img
                src={logos.light}
                alt="PqEstudar"
                width={120}
                height={36}
                className="h-11 w-auto object-contain block dark:hidden"
              />
              <img
                src={logos.dark}
                alt="PqEstudar"
                width={120}
                height={36}
                className="h-11 w-auto object-contain hidden dark:block"
              />
            </Link>

            <div className="flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Seguir no ${s.label}`}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <s.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Bottom row: copyright + nav links */}
          <div className="flex items-end justify-between gap-4 pt-6">
            <div className="text-sm text-muted-foreground leading-relaxed">
              <p>© {currentYear} PqEstudar</p>
              <p>Todos os direitos reservados</p>
            </div>

            <nav className="flex flex-col items-end gap-1 text-sm">
              <div className="flex flex-wrap gap-4">
                {navLinksTop.map((l) => (
              <Link key={l.to} href={l.to} className="text-foreground hover:text-primary transition-colors">
                {l.label}
              </Link>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                {navLinksBottom.map((l) => (
                  <Link key={l.to} href={l.to} className="text-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>

      </div>
    </footer>
  );
}
