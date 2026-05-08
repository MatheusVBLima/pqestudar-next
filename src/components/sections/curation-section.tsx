import { Search, Brain, Filter, Users } from "lucide-react";

const curationSteps = [
  {
    icon: Search,
    title: "Pesquisa Rigorosa",
    description: "Analisamos milhares de cursos e plataformas educacionais para encontrar apenas o melhor conteúdo."
  },
  {
    icon: Brain,
    title: "Análise de Especialistas",
    description: "Nossa equipe de educadores e profissionais de mercado avalia cada curso minuciosamente."
  },
  {
    icon: Filter,
    title: "Curadoria Inteligente",
    description: "Filtramos apenas cursos atualizados, relevantes e com certificação reconhecida pelo mercado."
  },
  {
    icon: Users,
    title: "Feedback da Comunidade",
    description: "Consideramos avaliações e feedback de nossa comunidade de mais de 10K estudantes ativos."
  }
];

export function CurationSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-muted/50 to-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Nossa Curadoria Exclusiva
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Nossa equipe de especialistas analisa e seleciona cuidadosamente cada curso, 
            garantindo qualidade, relevância e atualização constante. Você economiza tempo 
            e tem acesso apenas ao que realmente importa para sua carreira.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {curationSteps.map((step, index) => (
            <div 
              key={step.title}
              className="group p-6 rounded-xl bg-card/60 border border-border/50 hover:bg-card/80 hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}