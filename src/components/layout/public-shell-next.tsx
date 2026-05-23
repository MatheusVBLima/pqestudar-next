"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar-next";
import { Footer } from "@/components/layout/footer-next";

function shouldShowFooter(pathname: string) {
  if (pathname === "/premium") return true;

  const hiddenFooterRoutes = [
    "/assine",
    "/login",
    "/meu-perfil",
    "/meus-materiais",
    "/ranking-comunidade",
    "/ferramentas/salvos",
    "/premium/",
  ];

  return !hiddenFooterRoutes.some((route) => pathname === route || pathname.startsWith(route));
}

export function PublicShellNext({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const showFooter = shouldShowFooter(pathname);

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden w-full">
      <Navbar />
      <div className="flex-1 flex flex-col pt-16">{children}</div>
      {showFooter && <Footer />}
    </div>
  );
}

