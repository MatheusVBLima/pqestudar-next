import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";

export function SystemSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-accent/10 to-background">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Instale um <span className="bg-gradient-primary bg-clip-text text-transparent">"Sistema Operacional"</span> para sua Carreira.
          </h2>
        </div>

        <Card className="p-8 md:p-12 bg-card/80 backdrop-blur-sm shadow-card-custom animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="space-y-6 text-lg leading-relaxed">
            <p>
              Por anos, nos ensinaram que o caminho para o sucesso era acumular mais informação. Mais livros, mais cursos, mais diplomas.
            </p>
            
            <p className="font-semibold text-xl">
              Mas os profissionais que mais crescem não são os que mais sabem. São os que mais executam.
            </p>
            
            <p>
              O <strong>Kit de Ferramentas: Produtividade Exponencial</strong> foi criado com base nesse princípio. Nós pegamos as melhores estratégias de gestão de tempo, aprendizado e execução, removemos 90% da teoria e transformamos o que sobrou em um arsenal de ferramentas práticas.
            </p>
            
            <p>
              É um sistema "plug-and-play" desenhado para ser instalado diretamente na sua rotina, te dando clareza, foco e, o mais importante, a capacidade de transformar ideias em resultados visíveis.
            </p>
          </div>

          <div className="mt-10 pt-8 border-t border-border/50">
            <div className="flex items-start gap-4 p-6 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <p className="text-lg font-semibold leading-relaxed flex-1">
                Chega de aprender a pescar. Nós te entregamos o mapa do tesouro, a vara de pescar de fibra de carbono e as coordenadas exatas do cardume.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
