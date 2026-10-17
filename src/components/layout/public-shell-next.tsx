"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar-next";
import { Footer } from "@/components/layout/footer-next";
import { DiscoveryTour } from "@/components/onboarding/discovery-tour";

function shouldShowFooter(pathname: string) {
  if (pathname === "/afiliados" || pathname.startsWith("/afiliados/")) return false;
  if ((pathname === "/mbo-premium" || pathname.startsWith("/mbo-premium/"))) return false;
  if (pathname === "/pqestudar-premium") return false;
  if (pathname === "/carteirinha") return false;
  if (pathname === "/certificado-que-conta") return false;
  if (pathname === "/mapa-dos-beneficios" || pathname.startsWith("/mapa-dos-beneficios/")) return false;
  if (pathname === "/premium") return true;

  const hiddenFooterRoutes = [
    "/login",
    "/meu-perfil",
    "/meus-materiais",
    "/ranking-comunidade",
    "/salvos",
    "/ferramentas/salvos",
    "/premium/",
  ];

  return !hiddenFooterRoutes.some((route) => pathname === route || pathname.startsWith(route));
}

function shouldShowNavbar(pathname: string) {
  if (pathname === "/afiliados" || pathname.startsWith("/afiliados/")) return false;
  if ((pathname === "/mbo-premium" || pathname.startsWith("/mbo-premium/"))) return false;
  if (pathname === "/pqestudar-premium") return false;
  if (pathname === "/carteirinha") return false;
  if (pathname === "/certificado-que-conta") return false;
  if (pathname === "/mapa-dos-beneficios" || pathname.startsWith("/mapa-dos-beneficios/")) return false;

  return true;
}

export function PublicShellNext({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const showNavbar = shouldShowNavbar(pathname);
  const showFooter = shouldShowFooter(pathname);
  const isAffiliatePage = pathname === "/afiliados" || pathname.startsWith("/afiliados/");

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden w-full">
      {showNavbar && <Navbar />}
      {isAffiliatePage && (
        <header className="bg-[#141016] text-[#f6f0f8]">
          <div className="mx-auto w-full max-w-[1120px] px-[22px] py-[18px]">
            <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar ao site
            </Link>
          </div>
        </header>
      )}
      <div className={`flex-1 flex flex-col ${showNavbar ? "pt-16" : ""}`}>{children}</div>
      {showFooter && <Footer />}
      {showNavbar && (
        <Suspense fallback={null}>
          <DiscoveryTour />
        </Suspense>
      )}
    </div>
  );
}

