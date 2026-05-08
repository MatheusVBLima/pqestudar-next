import type { Metadata } from "next";
import { Construction } from "lucide-react";

export const metadata: Metadata = {
  title: "Em breve | PqEstudar",
  description:
    "Esta página está em construção. Em breve você terá acesso a este conteúdo no PqEstudar.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/breve" },
};

export default function BrevePage() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center py-20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Construction className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Em construção
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Estamos preparando algo útil para você. Esta página ainda não está
            pronta, mas em breve estará disponível. Volte em breve!
          </p>
        </div>
      </div>
    </section>
  );
}
