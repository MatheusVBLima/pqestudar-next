"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/layout/PageHero";
import { FinalCtaSectionNext } from "@/components/sections/final-cta-section-next";
import { renderHighlightedTitle } from "@/lib/highlight-title";
import { usePageSettings } from "@/hooks/usePageSettings";
import {
  ArrowRight,
  Wrench,
  BookOpen,
  FileText,
  Package,
  Eye,
  Target,
  LayoutGrid,
  Unlock,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export default function SobrePqEstudarNext() {
  const { headerTitle, headerDescription } = usePageSettings("/sobre-pqestudar");

  return (
    <>
      <PageHero title={headerTitle} description={headerDescription} />

      <section className="py-16 md:py-24">
        <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-4xl md:whitespace-nowrap">
              {renderHighlightedTitle("O problema não é falta de informação. É excesso de **ruído**.")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-3xl">
              Estudar, buscar oportunidades e encontrar ferramentas úteis ficou
              mais difícil do que deveria. O que você precisa está espalhado, mal
              organizado e muitas vezes mal explicado.
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                "Informação solta demais e difícil de comparar",
                "Páginas confusas e cheias de distrações",
                "Links importantes 'perdidos' no meio do conteúdo",
                "Oportunidades sem contexto e sem organização",
                "Dúvida constante sobre o que realmente vale a pena",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                  <span className="text-base leading-relaxed">{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-8 text-base font-medium text-foreground">
              O PqEstudar existe para reduzir esse atrito — e deixar o caminho
              mais direto.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-4xl">
              {renderHighlightedTitle("O que é o **PqEstudar**")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-3xl">
              O PqEstudar é um hub prático para quem quer estudar com mais
              organização. Aqui você encontra ferramentas úteis, concursos e
              oportunidades, conteúdos aplicáveis e produtos digitais — reunidos
              em um só lugar para economizar tempo e facilitar decisões.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { icon: Wrench, title: "Ferramentas", desc: "Recursos para estudar, produzir e se organizar", href: "/ferramentas", cta: "Explorar ferramentas" },
                { icon: BookOpen, title: "Concursos", desc: "Informações reunidas e mais fáceis de acompanhar", href: "/concursos", cta: "Ver oportunidades" },
                { icon: FileText, title: "Conteúdos", desc: "Guias e atalhos práticos, sem teoria solta", href: "/breve", cta: "Acessar conteúdos" },
                { icon: Package, title: "Exclusivos", desc: "Materiais criados para acelerar seu progresso", href: "/exclusivos", cta: "Conhecer exclusivos" },
              ] as const).map((c) => (
                <Link key={c.title} href={c.href} className="group">
                  <Card className="border-border/40 h-full transition-colors group-hover:border-primary/40">
                    <CardContent className="p-5 flex flex-col gap-3 h-full">
                      <c.icon className="h-6 w-6 text-primary" />
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{c.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                      <div className="mt-auto pt-3">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                          {c.cta}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 max-w-4xl">
              {renderHighlightedTitle("Como fazemos nossa **curadoria**")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-3xl">
              O PqEstudar é uma plataforma independente de curadoria educacional.
              Selecionamos e organizamos recursos que possam ajudar estudantes e
              profissionais a tomar decisões com mais clareza.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: CheckCircle2,
                  title: "Critérios de seleção",
                  desc: "Consideramos utilidade, confiabilidade, acessibilidade, relevância e clareza das informações.",
                },
                {
                  icon: ShieldCheck,
                  title: "Responsabilidade editorial",
                  desc: "As escolhas e avaliações são feitas pelo PqEstudar. Relações comerciais ou links afiliados são identificados quando aplicável.",
                },
                {
                  icon: RefreshCw,
                  title: "Revisão e correções",
                  desc: "As informações são revisadas periodicamente, mas podem mudar. Correções podem ser enviadas pelo nosso canal de contato.",
                },
              ].map((item) => (
                <Card key={item.title} className="border-border/40 h-full">
                  <CardContent className="p-6 flex flex-col gap-3">
                    <item.icon className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Encontrou uma informação incorreta ou desatualizada? Escreva para{" "}
              <a
                href="mailto:pqestudar.suporte@gmail.com"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                pqestudar.suporte@gmail.com
              </a>
              .
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
          >
            <div className="grid lg:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  {renderHighlightedTitle('Por que "**PqEstudar**"?')}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  &quot;PqEstudar&quot; é a pergunta que organiza tudo aqui dentro. Não é
                  sobre estudar por estudar — é sobre entender o motivo e escolher
                  melhor o caminho. Quando você sabe por que está estudando, fica
                  mais fácil filtrar o que importa, encontrar oportunidades e
                  evoluir com mais direção.
                </p>
                <p className="mt-6 text-sm font-medium text-foreground/80">
                  Por isso o PqEstudar funciona como um hub: menos dispersão, mais
                  direção.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Clareza", text: "Estudar com um objetivo reduz ruído e acelera decisões." },
                  { label: "Oportunidades", text: "Concursos e recursos ficam mais fáceis de acompanhar e comparar." },
                  { label: "Habilidades úteis", text: "Ferramentas e conteúdos práticos para aplicar no dia a dia." },
                ].map((b) => (
                  <div key={b.label} className="flex gap-3">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <span className="font-semibold text-foreground">{b.label}:</span>{" "}
                      <span className="text-muted-foreground">{b.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10 max-w-4xl">
              {renderHighlightedTitle("Como o PqEstudar ajuda na **prática**")}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Wrench, title: "Ferramentas úteis", desc: "Descubra recursos para estudar, produzir e se organizar melhor — sem perder tempo testando coisa que não entrega." },
                { icon: BookOpen, title: "Concursos e oportunidades", desc: "Encontre informações reunidas de forma mais clara para acompanhar o que importa e reduzir confusão." },
                { icon: FileText, title: "Conteúdo aplicável", desc: "Menos teoria solta e mais utilidade real: guias rápidos, atalhos e conteúdos práticos para usar no dia a dia." },
                { icon: LayoutGrid, title: "Organização em um só lugar", desc: "Tudo pensado para reduzir o tempo perdido pulando entre sites e para facilitar suas escolhas." },
              ].map((c) => (
                <Card key={c.title} className="border-border/40">
                  <CardContent className="p-6 flex flex-col gap-3">
                    <c.icon className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-lg">{c.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 max-w-4xl">
              {renderHighlightedTitle("O que **guia** o projeto")}
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-3xl">
              A plataforma é construída com um foco simples: entregar utilidade
              com clareza.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Eye, title: "Clareza antes de volume", desc: "Menos excesso, mais direção" },
                { icon: Target, title: "Utilidade antes de modinha", desc: "Conteúdo e recursos que resolvem" },
                { icon: LayoutGrid, title: "Organização antes de excesso", desc: "Navegação e curadoria para facilitar" },
                { icon: Unlock, title: "Acesso antes de complicação", desc: "Direto ao ponto, sem barreira desnecessária" },
              ].map((p) => (
                <Card key={p.title} className="border-border/40">
                  <CardContent className="p-5 flex items-start gap-4">
                    <p.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-base">{p.title}</h3>
                      <p className="text-sm text-muted-foreground">{p.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mt-8 text-sm text-muted-foreground/70 italic">
              Se algo não ajuda o usuário a decidir mais rápido, não entra.
            </p>
          </motion.div>
        </div>
      </section>

      <FinalCtaSectionNext />
    </>
  );
}
