import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Gift, CheckCircle } from "lucide-react";

interface NewsletterFormProps {
  title?: string;
  description?: string;
  variant?: "hero" | "sidebar" | "modal" | "default";
  className?: string;
  onSuccess?: () => void;
}

export function NewsletterForm({ 
  title = "Receba Cursos Gratuitos", 
  description = "Lista exclusiva e curada com os melhores sites de cursos online com certificado gratuito",
  variant = "hero",
  className = "",
  onSuccess
}: NewsletterFormProps) {
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
      // Get UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source') || undefined;
      const utmMedium = urlParams.get('utm_medium') || undefined;
      const utmCampaign = urlParams.get('utm_campaign') || undefined;
      const utmContent = urlParams.get('utm_content') || undefined;
      const utmTerm = urlParams.get('utm_term') || undefined;
      const pageSlug = window.location.pathname === '/' ? 'homepage' : window.location.pathname.slice(1);

      // Call the Brevo newsletter integration edge function
      const { data, error } = await supabase.functions.invoke('subscribe-newsletter-brevo', {
        body: { 
          email,
          consent,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          pageSlug,
        }
      });

      if (error) {
        console.error('Newsletter signup error:', error);
        throw error;
      }

      if (data?.alreadySubscribed) {
        toast({
          title: "Você já está cadastrado(a) 👍",
          description: "Confira sua caixa de entrada e spam. Verifique se recebeu nossos e-mails.",
        });
        return;
      }
      
      setIsSuccess(true);
      toast({
        title: "Cadastro realizado!",
        description: data?.requiresConfirmation 
          ? "Verifique seu e-mail para confirmar e receber seus bônus."
          : "Tudo certo! Enviamos o e-mail de boas-vindas com seus bônus.",
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form after success
      setTimeout(() => {
        setEmail("");
        setConsent(false);
        setIsSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Newsletter signup error:', error);
      toast({
        title: "Não foi possível concluir agora",
        description: "Tente novamente em alguns instantes. Se o erro persistir, fale conosco.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`text-center space-y-4 ${className}`}>
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-primary animate-scale-in" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          Cadastro realizado!
        </h3>
        <p className="text-muted-foreground">
          Verifique seu e-mail para confirmar e receber seus bônus.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {variant !== "modal" && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gift className="h-6 w-6 text-primary" />
            <span className="bg-gradient-primary bg-clip-text text-transparent font-semibold">
              BÔNUS GRATUITO
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {title}
          </h2>
          <p className="text-muted-foreground mb-3">
            {description}
          </p>
          <p className="text-sm text-muted-foreground/80">
            Nossa equipe de especialistas selecionou a dedo os melhores recursos para você economizar tempo e ir direto ao ponto.
          </p>
        </div>
      )}

      {variant === "modal" && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🎁</span>
            <span className="text-primary font-bold text-lg">
              BÔNUS GRATUITO
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Receba Ferramentas de Resultado
          </h2>
          <p className="text-muted-foreground text-sm">
            Uma curadoria semanal das melhores ferramentas e métodos de produtividade, direto no seu e-mail.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="flex items-start space-x-2 text-sm">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked as boolean)}
            required
          />
          <Label htmlFor="consent" className="text-xs leading-relaxed">
            Concordo em receber emails com cursos, conteúdos exclusivos e newsletter. 
            Usaremos estes dados para gerenciar sua conta e comunicação. 
            <a href="/privacidade" className="text-primary hover:underline ml-1">
              Política de Privacidade
            </a>
          </Label>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity shadow-purple"
          disabled={isLoading}
        >
          {isLoading ? (
            "Enviando..."
          ) : (
            "Receber Lista Gratuita"
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          🔒 Seus dados estão seguros e você pode cancelar a qualquer momento
        </p>
      </form>
    </div>
  );
}