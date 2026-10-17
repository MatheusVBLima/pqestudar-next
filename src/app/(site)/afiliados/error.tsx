"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AffiliatesError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-6 py-20 text-center" role="alert">
      <h1 className="text-2xl font-semibold">Não foi possível carregar Afiliados</h1>
      <p className="mt-3 text-muted-foreground">Ocorreu uma falha ao carregar a página ou verificar sua sessão. Tente novamente.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => unstable_retry()}>Tentar novamente</Button>
        <Button variant="outline" asChild><Link href="/">Voltar ao início</Link></Button>
      </div>
    </section>
  );
}
