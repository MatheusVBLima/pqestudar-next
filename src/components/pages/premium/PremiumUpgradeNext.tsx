"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Lock, CheckCircle, ArrowRight } from "lucide-react";

export default function PremiumUpgradeNext() {
  const { user } = useAuth();
  const { subscription, getPlanName } = useSubscription();

  const benefits = [
    "Acesso a cursos gratuitos exclusivos",
    "Vagas de emprego selecionadas",
    "Benefícios exclusivos para assinantes",
    "Curadorias especiais de conteúdo",
    "Salvar itens para ver depois",
  ];

  return (
    <main className="flex-1 container max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold mb-4">
          {subscription ? "Sua assinatura expirou" : "Acesso exclusivo para assinantes"}
        </h1>

        <p className="text-muted-foreground max-w-lg mx-auto">
          {subscription
            ? `Seu plano ${getPlanName()} não está mais ativo. Renove para continuar acessando o conteúdo premium.`
            : "A Área Premium oferece conteúdo exclusivo para impulsionar sua carreira."}
        </p>
      </div>

      <Card className="mb-8 overflow-hidden">
        <CardContent className="grid gap-8 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Crown className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Benefícios Premium</CardTitle>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Tudo em um só lugar para estudar melhor, acompanhar oportunidades e aproveitar vantagens exclusivas.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-sm leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-4">
        <Button size="lg" className="w-full max-w-sm" asChild>
          <a href="https://pqestudar.com/assinar" target="_blank" rel="noopener noreferrer">
            Quero assinar agora
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <p>Já tem um código de acesso?</p>
          <Link href="/premium/resgatar" className="text-primary hover:underline">
            Resgatar código
          </Link>
        </div>

        {!user && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            <p>Já é assinante?</p>
            <Link href="/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
