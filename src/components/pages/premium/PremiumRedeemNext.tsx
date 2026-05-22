"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";
import { Ticket, Loader2, CheckCircle } from "lucide-react";

export default function PremiumRedeemNext() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { redeemToken, isActive } = useSubscription();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      toast({
        title: "Token obrigatório",
        description: "Digite o código de acesso para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para resgatar um código.",
        variant: "destructive",
      });
      router.push("/login?from=/premium/resgatar");
      return;
    }

    setLoading(true);

    try {
      const normalizedToken = token.trim().toUpperCase();
      const result = await redeemToken(normalizedToken);

      if (result.success) {
        setSuccess(true);
        toast({ title: "Sucesso!", description: result.message });

        setTimeout(() => {
          router.push("/premium");
        }, 2000);
      } else {
        toast({
          title: "Erro ao resgatar",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && user && isActive()) {
    return (
      <div className="flex-1 bg-background flex flex-col">
        <main className="flex-1 container max-w-lg mx-auto px-4 py-12">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle>Você já é assinante!</CardTitle>
              <CardDescription>
                Sua assinatura está ativa. Aproveite o conteúdo premium.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push("/premium")}>Ir para Área Premium</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex-1 bg-background flex flex-col">
        <main className="flex-1 container max-w-lg mx-auto px-4 py-12">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle>Assinatura ativada!</CardTitle>
              <CardDescription>Redirecionando para a Área Premium...</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex flex-col">
      <main className="flex-1 container max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mx-auto mb-2">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Resgatar código de acesso</CardTitle>
            <CardDescription>
              Digite o código que você recebeu após a compra para ativar sua assinatura.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Cole seu código aqui"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                  className="text-center font-mono"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !token.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Ativar assinatura"
                )}
              </Button>
            </form>

            {!user && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Você precisará fazer login para resgatar o código.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
