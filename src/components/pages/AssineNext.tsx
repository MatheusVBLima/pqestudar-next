"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

export default function AssineNext() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira seu email para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!consent) {
      toast({
        title: "Consentimento necessário",
        description: "Por favor, aceite os termos para prosseguir.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source") || undefined;
      const utmMedium = urlParams.get("utm_medium") || undefined;
      const utmCampaign = urlParams.get("utm_campaign") || undefined;
      const utmContent = urlParams.get("utm_content") || undefined;
      const utmTerm = urlParams.get("utm_term") || undefined;
      const pageSlug = "assine";

      const { data, error } = await supabase.functions.invoke("subscribe-newsletter-brevo", {
        body: {
          email,
          consent,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          pageSlug,
        },
      });

      if (error) {
        console.error("Newsletter signup error:", error);
        throw error;
      }

      if (data?.alreadySubscribed) {
        toast({
          title: "Você já está cadastrado(a) 👍",
          description: "Confira sua caixa de entrada e spam. Verifique se recebeu nossos e-mails.",
        });
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast({
        title: "Cadastro realizado!",
        description: "Confira seu e-mail para acessar os hacks e ferramentas exclusivas.",
      });

      setTimeout(() => {
        setEmail("");
        setConsent(false);
        setIsSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Newsletter signup error:", error);
      toast({
        title: "Não foi possível concluir agora",
        description: "Tente novamente em alguns instantes. Se o erro persistir, fale conosco.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-background to-background/95 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="mb-8 md:mb-12">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            PqEstudar?
          </span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <Card className="rounded-2xl shadow-lg border-border/50">
          <CardContent className="p-6 sm:p-8 md:p-10">
            {isSuccess ? (
              <div className="text-center space-y-4 py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="flex justify-center"
                >
                  <CheckCircle className="h-16 w-16 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground">Cadastro realizado!</h2>
                <p className="text-muted-foreground">
                  Confira seu e-mail para acessar os hacks e ferramentas exclusivas.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-tight">
                    Receba os Hacks e Ferramentas Secretas que Viralizaram.
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    Junte-se a mais de 500 mil pessoas e tenha acesso em primeira mão aos benefícios,
                    truques de sistema e IAs que eu só compartilho por e-mail.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked as boolean)}
                      required
                      className="mt-0.5"
                    />
                    <Label htmlFor="consent" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">
                      Concordo em receber emails com hacks, ferramentas e conteúdos exclusivos.
                      Usaremos estes dados para gerenciar sua conta e comunicação.{" "}
                      <a
                        href="/privacidade"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Política de Privacidade
                      </a>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Enviando..." : "Quero Receber os Hacks"}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Seus dados estão seguros e você pode cancelar a qualquer momento</span>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
}
