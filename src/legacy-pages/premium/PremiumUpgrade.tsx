"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Crown, Lock, CheckCircle, ArrowRight } from 'lucide-react';

const PremiumUpgrade = () => {
  const { user } = useAuth();
  const { subscription, getPlanName } = useSubscription();

  const benefits = [
    'Acesso a cursos gratuitos exclusivos',
    'Vagas de emprego selecionadas',
    'Atualizações semanais com novidades',
    'Curadorias especiais de conteúdo',
    'Salvar itens para ver depois',
  ];

  return (
    <main className="flex-1 container max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">
          {subscription ? 'Sua assinatura expirou' : 'Acesso exclusivo para assinantes'}
        </h1>
        
        <p className="text-muted-foreground max-w-lg mx-auto">
          {subscription 
            ? `Seu plano ${getPlanName()} não está mais ativo. Renove para continuar acessando o conteúdo premium.`
            : 'A Área Premium oferece conteúdo exclusivo para impulsionar sua carreira.'
          }
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader className="text-center pb-2">
          <Crown className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle>Benefícios Premium</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>{benefit}</span>
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
};

export default PremiumUpgrade;
