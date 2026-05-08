"use client";

import { Navbar } from "@/components/layout/navbar-next";
import { Footer } from "@/components/layout/footer-next";

export function PublicShellNext({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden w-full">
      <Navbar />
      <div className="flex-1 flex flex-col pt-16">{children}</div>
      <Footer />
    </div>
  );
}

