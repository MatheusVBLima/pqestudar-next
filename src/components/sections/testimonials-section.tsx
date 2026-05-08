import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote, ArrowRight } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Maria Silva",
    role: "Desenvolvedora Frontend",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    testimonial: "Graças aos cursos e certificados da PqEstudar?, consegui minha primeira vaga na área de TI em apenas 3 meses! A curadoria é excelente.",
    rating: 5,
    company: "Tech Solutions"
  },
  {
    id: 2,
    name: "João Santos",
    role: "Marketing Digital",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    testimonial: "A plataforma me ajudou a migrar de carreira. Os cursos são atualizados e realmente preparam para o mercado de trabalho atual.",
    rating: 5,
    company: "Growth Marketing"
  },
  {
    id: 3,
    name: "Ana Costa",
    role: "UX Designer",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    testimonial: "Consegui meu primeiro cliente freelancer após completar os cursos de design. A certificação fez toda a diferença no meu portfólio!",
    rating: 5,
    company: "Freelancer"
  },
  {
    id: 4,
    name: "Carlos Lima",
    role: "Data Analyst",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    testimonial: "Excelente curadoria! Não precisei perder tempo procurando cursos. Tudo aqui é de alta qualidade e reconhecido pelo mercado.",
    rating: 5,
    company: "DataCorp"
  }
];

export function TestimonialsSection() {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Quem já transformou a carreira com a{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              PqEstudar?
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Veja as histórias reais de pessoas que mudaram suas vidas profissionais 
            através dos nossos cursos gratuitos e certificações.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={testimonial.id}
              className="bg-card/80 border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={testimonial.avatar}
                    alt={`Foto de ${testimonial.name}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} • {testimonial.company}
                    </p>
                  </div>
                  <Quote className="h-6 w-6 text-primary/30" />
                </div>
                
                <p className="text-muted-foreground leading-relaxed mb-4">
                  "{testimonial.testimonial}"
                </p>
                
                <div className="flex items-center gap-1">
                  {renderStars(testimonial.rating)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg"
            className="group border-primary/20 text-primary hover:bg-primary/5"
          >
            Veja mais histórias de sucesso
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}