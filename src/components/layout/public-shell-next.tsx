"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar-next";
import { Footer } from "@/components/layout/footer-next";
import { DiscoveryTour } from "@/components/onboarding/discovery-tour";

function shouldShowFooter(pathname: string) {
  if (pathname === "/pqestudar-premium") return false;
  if (pathname === "/carteirinha") return false;
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
  if (pathname === "/pqestudar-premium") return false;
  if (pathname === "/carteirinha") return false;
  if (pathname === "/mapa-dos-beneficios" || pathname.startsWith("/mapa-dos-beneficios/")) return false;

  return true;
}

export function PublicShellNext({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const showNavbar = shouldShowNavbar(pathname);
  const showFooter = shouldShowFooter(pathname);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden w-full">
      {showNavbar && <Navbar />}
      <div className={`flex-1 flex flex-col ${showNavbar ? "pt-16" : ""}`}>{children}</div>
      {showFooter && <Footer />}
      {showNavbar && <DiscoveryTour />}
    </div>
  );
}

