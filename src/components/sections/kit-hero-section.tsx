"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Briefcase, TrendingUp, RefreshCw, BookOpen, Users, Award } from "lucide-react";
import { useRouter } from "next/navigation";

const features = [
  {
    icon: Lightbulb,
    title: "Sistema Acionável",
    description: "Receba um método passo a passo, não apenas aulas soltas. Foco total na execução."
  },
  {
    icon: Briefcase,
    title: "Templates Prontos",
    description: "Economize horas de trabalho com nossa biblioteca de planilhas e documentos 'copie e cole'."
  },
  {
    icon: TrendingUp,
    title: "Resultados Acelerados",
    description: "Ferramentas desenhadas para gerar valor e impacto na sua carreira desde a primeira semana."
  },
  {
    icon: RefreshCw,
    title: "Aprendizado Contínuo",
    description: "Acesso vitalício a todas as atualizações do sistema, garantindo que você esteja sempre à frente."
  }
];

const statistics = [
  { value: "500+", label: "Cursos Disponíveis", icon: BookOpen },
  { value: "10K+", label: "Usuários Ativos", icon: Users },
  { value: "25K+", label: "Certificados Emitidos", icon: Award },
  { value: "95%", label: "Taxa de Aprovação", icon: TrendingUp }
];

export function KitHeroSection() {
  const router = useRouter();

  const scrollToArsenal = () => {
    const arsenalSection = document.getElementById('arsenal-section');
    if (arsenalSection) {
      arsenalSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-accent/20">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Content */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Menos Esforço, <span className="bg-gradient-primary bg-clip-text text-transparent">Mais Resultados.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            O primeiro Kit de Ferramentas para profissionais que querem acelerar a carreira. 
            Receba os templates e processos para executar ideias, otimizar seu tempo e gerar valor real.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="p-6 bg-card/80 backdrop-blur-sm shadow-card-custom hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {statistics.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index}
                className="p-6 text-center bg-card/80 backdrop-blur-sm shadow-card-custom hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button
            variant="premium"
            size="lg"
            onClick={scrollToArsenal}
            className="text-base px-8"
          >
            COMEÇAR A GERAR RESULTADOS
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/explorar')}
            className="text-base px-8"
          >
            Ver Categorias
          </Button>
        </div>
      </div>
    </section>
  );
}
