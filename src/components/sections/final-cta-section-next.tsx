"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderHighlightedTitle } from "@/lib/highlight-title";

const ease = [0.16, 1, 0.3, 1] as const;
const vanishInVariants = {
  hidden: {
    opacity: 0,
    scale: 0.42,
    filter: "blur(14px)",
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.74,
      ease,
    },
  },
};

export function FinalCtaSectionNext() {
  return (
    <section className="py-16 md:py-24">
      <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={vanishInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35, margin: "0px 0px -8% 0px" }}
          className="rounded-[1.2rem] border border-border/40 bg-muted/30 p-8 md:p-14 lg:p-16 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="flex flex-col items-center gap-6 max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {renderHighlightedTitle("Encontre o próximo **recurso** certo para você")}
            </h2>
            <p className="text-muted-foreground sm:text-lg leading-relaxed">
              Ferramentas, concursos e conteúdos práticos reunidos em um só lugar para você aprender, se organizar e avançar mais rápido.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3 mt-2">
              <Link href="/ferramentas">
                <Button size="lg" className="gap-2 rounded-[1.2rem] w-full sm:w-auto">
                  <Search className="h-4 w-4" />
                  Explorar Ferramentas
                </Button>
              </Link>
              <Link href="/concursos">
                <Button size="lg" variant="outline" className="gap-2 rounded-[1.2rem] w-full sm:w-auto">
                  Ver Concursos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/guias">
                <Button size="lg" variant="outline" className="gap-2 rounded-[1.2rem] w-full sm:w-auto">
                  <BookOpen className="h-4 w-4" />
                  Ver Guias
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
