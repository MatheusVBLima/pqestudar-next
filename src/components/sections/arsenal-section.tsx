import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Headphones, FileStack, Users, Presentation, Shield, Check, Lock, Zap } from "lucide-react";

const components = [
  {
    icon: BookOpen,
    title: "🚀 A Trilha de Aprendizagem Acelerada",
    value: "R$ 997",
    description: "Nós analisamos mais de 200 horas de conteúdo e condensamos o conhecimento essencial em uma trilha de 4 semanas. Economize dezenas de horas com aulas curtas e diretas ao ponto para você dominar o sistema em 30 minutos por dia, sem enrolação."
  },
  {
    icon: FileText,
    title: "🧰 A Biblioteca de Templates \"Produtividade Imediata\"",
    value: "R$ 697",
    description: "Chega de começar do zero. Você recebe acesso a templates \"copie e cole\" para planejamento semanal, gestão de projetos, resumo de conteúdo e relatórios de impacto. Comece a executar em minutos, não em semanas. É só preencher e usar."
  },
  {
    icon: Headphones,
    title: "🎧 O Kit de Foco (Áudios e Mapas Mentais)",
    value: "R$ 397",
    description: "Transformamos os conceitos-chave em resumos em áudio de 10 minutos para você ouvir no trânsito e mapas mentais para revisar em 60 segundos. Aprenda e reforce o sistema em qualquer lugar."
  },
  {
    icon: FileStack,
    title: "💼 O Cofre de Estudos de Caso",
    value: "R$ 497",
    description: "Veja na prática como profissionais como você aplicaram este sistema para organizar projetos complexos, ganhar visibilidade e acelerar suas carreiras. É a prova de que o método funciona no mundo real."
  }
];

const bonuses = [
  {
    icon: Users,
    title: "Acesso à Comunidade de Executores",
    value: "R$ 597/ano",
    description: "Junte-se a um grupo exclusivo de profissionais que, como você, estão aplicando o sistema. Um ambiente para networking estratégico, troca de ideias e responsabilidade mútua."
  },
  {
    icon: Presentation,
    title: "Workshop Gravado \"Destravando o Notion\"",
    value: "R$ 297",
    description: "Um treinamento prático de 90 minutos que te ensinará a usar o Notion para construir seu \"segundo cérebro\" e personalizar seus templates, mesmo que você nunca tenha usado a ferramenta antes."
  }
];

// Bônus será movido para a página de explorar cursos

void bonuses;

export function ArsenalSection() {
  return (
    <section id="arsenal-section" className="py-20 px-4 bg-gradient-to-b from-background to-accent/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Torne-se um <span className="bg-gradient-primary bg-clip-text text-transparent">Executor de Alta Performance</span>: Aqui está seu Arsenal Completo
          </h2>
        </div>

        {/* Componentes Principais */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {components.map((component, index) => (
            <Card 
              key={index}
              className="p-6 bg-card/80 backdrop-blur-sm hover:shadow-card-custom transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <component.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-lg">Componente #{index + 1}</h3>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {component.value}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-base mb-2">{component.title}</h4>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {component.description}
              </p>
            </Card>
          ))}
        </div>


        {/* Garantia */}
        <Card className="p-8 md:p-12 bg-gradient-to-br from-accent/20 to-accent/5 border-2 border-primary/30 animate-fade-in mb-16" style={{ animationDelay: "0.6s" }}>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-lg relative">
                <Shield className="h-12 w-12 text-primary-foreground" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-md">
                  30 DIAS
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-4">
                <h3 className="text-2xl font-bold mb-2">
                  SUA GARANTIA INCONDICIONAL DE PRODUTIVIDADE
                </h3>
                <Badge className="bg-primary text-primary-foreground text-sm font-semibold border-0">
                  RISCO ZERO - Valor: Incalculável
                </Badge>
              </div>
              <p className="text-lg leading-relaxed">
                Nós temos tanta confiança no sistema que o risco é todo nosso. Adquira o Kit de Ferramentas hoje, aplique o método da Semana 1. Se em <strong>30 dias</strong> você não sentir uma transformação real na sua clareza e organização, basta nos enviar um e-mail e nós devolveremos <strong className="text-primary">100% do seu investimento</strong>. Sem perguntas.
              </p>
            </div>
          </div>
        </Card>

        {/* Resumo Visual do Valor */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4">
              Vamos recapitular tudo que você leva para casa hoje:
            </h3>
          </div>

          <Card className="p-8 md:p-10 bg-card/80 backdrop-blur-sm border-2 border-border">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">A Trilha de Aprendizagem Acelerada</span>
                </div>
                <span className="font-semibold text-muted-foreground">R$ 997</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">A Biblioteca de Templates "Produtividade Imediata"</span>
                </div>
                <span className="font-semibold text-muted-foreground">R$ 697</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">O Kit de Foco (Áudios e Mapas Mentais)</span>
                </div>
                <span className="font-semibold text-muted-foreground">R$ 397</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">O Cofre de Estudos de Caso</span>
                </div>
                <span className="font-semibold text-muted-foreground">R$ 497</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="font-medium">GARANTIA INCONDICIONAL DE PRODUTIVIDADE</span>
                </div>
                <span className="font-semibold text-muted-foreground">Incalculável</span>
              </div>
            </div>
            
            <div className="pt-6 border-t-2 border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">VALOR TOTAL:</span>
                <span className="text-3xl font-bold text-primary">R$ 2.588</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Ancoragem de Preço */}
        <div className="mb-12 animate-fade-in" style={{ animationDelay: "0.8s" }}>
          <Card className="p-8 md:p-10 bg-gradient-to-br from-accent/10 to-background">
            <div className="space-y-4 text-lg leading-relaxed text-center">
              <p>
                Para ter acesso a um sistema como este, com acompanhamento individual, você facilmente investiria mais de <strong>R$ 5.000</strong> em consultorias. Uma única promoção na sua carreira pode significar um aumento de <strong>R$ 10.000, R$ 20.000 ou mais por ano</strong>.
              </p>
              
              <p className="font-semibold">
                Mas nosso objetivo não é cobrar o valor de uma consultoria. É entregar as mesmas ferramentas de alta performance por uma fração do preço.
              </p>
              
              <p className="text-xl">
                Por isso, você não vai investir R$ 2.588.
              </p>
              
              <p className="text-xl line-through text-muted-foreground">
                Nem mesmo a metade disso, R$ 1.294.
              </p>
            </div>
          </Card>
        </div>

        {/* Oferta Final */}
        <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: "0.9s" }}>
          <h3 className="text-3xl md:text-4xl font-bold mb-8">
            Garanta seu acesso <span className="bg-gradient-primary bg-clip-text text-transparent">vitalício</span> ao Kit de Ferramentas: Produtividade Exponencial por apenas:
          </h3>
          
          <Card className="p-10 md:p-12 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div>
                <div className="text-5xl md:text-6xl font-bold text-primary mb-2">
                  12x de R$ 49,86
                </div>
                <div className="text-2xl text-muted-foreground">
                  ou R$ 497 à vista
                </div>
              </div>

              <Button 
                size="lg"
                className="w-full bg-gradient-primary hover:opacity-90 shadow-purple text-sm md:text-base lg:text-lg py-6 md:py-8 px-4 md:px-6 lg:px-8 h-auto whitespace-nowrap"
              >
                <Zap className="h-5 w-5 md:h-6 md:w-6 mr-2 flex-shrink-0" />
                SIM, QUERO ACESSO IMEDIATO E TRANSFORMAR MINHA PRODUTIVIDADE
              </Button>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Compra 100% Segura</span>
                </div>
                <div className="hidden sm:block">•</div>
                <span>Acesso Vitalício</span>
                <div className="hidden sm:block">•</div>
                <span>Garantia de 30 Dias</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
