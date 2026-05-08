import { useScroll, motion } from "framer-motion";
import { useRef } from "react";
import marcador1 from "@/assets/sobre-marcador-1.png";
import marcador2 from "@/assets/sobre-marcador-2.png";
import marcador3 from "@/assets/sobre-marcador-3.png";
import marcador4 from "@/assets/sobre-marcador-4.png";
interface TimelineEntry {
  title: string;
  content: React.ReactNode;
  image?: string;
}
const timelineData: TimelineEntry[] = [{
  title: "A Frustração (2023)",
  content: <div className="space-y-4">
        <p className="text-base md:text-lg leading-relaxed text-foreground/90">
          Minha jornada no estudo sempre foi uma luta. Desde o fundamental, a absorção de conteúdo era difícil. No Ensino Médio, com as constantes mudanças de cidade e a diretora dizendo que era impossível eu passar, senti a humilhação que me motivou a vencer. Eu descobri que o problema não era a minha capacidade, mas o método.
        </p>
      </div>,
  image: marcador1
}, {
  title: "A Virada de Chave (2023)",
  content: <div className="space-y-4">
        <p className="text-base md:text-lg leading-relaxed text-foreground/90">
          A verdadeira virada veio com a necessidade. Trabalhando 12x36, acordando às 4:20 para a faculdade de ADS à noite, eu não tinha tempo para o método tradicional. Eu fui forçado a hackear o sistema: encontrar as ferramentas certas, os atalhos e a automação para sobreviver à rotina. Foi a minha luta por tempo que me transformou em um especialista em produtividade.
        </p>
      </div>,
  image: marcador2
}, {
  title: "O Salto de Fé (2023)",
  content: <div className="space-y-4">
        <p className="text-base md:text-lg leading-relaxed text-foreground/90">
          Com essa mentalidade de otimização, decidi largar o emprego e investir o seguro-desemprego para viver de internet. Foi um tudo ou nada. No último mês, sem nada sobrando, veio a primeira publicidade de R$ 900. A partir daí, o crescimento foi exponencial, batendo 200k, 300k e 400k. O sucesso veio da aplicação dos mesmos hacks que eu usava para estudar.
        </p>
      </div>,
  image: marcador3
}, {
  title: "A Missão (2025)",
  content: <div className="space-y-4">
        <p className="text-base md:text-lg leading-relaxed text-foreground/90">
          Agora, a missão mudou. Depois de alcançar o sucesso na internet, percebi que meu maior valor não está no alcance, mas sim no método que me trouxe até aqui. O PqEstudar? nasceu para fazer valer cada esforço e cada hack que eu tive que descobrir na marra. É a prova de que você pode ter mais resultado com menos esforço.
        </p>
      </div>,
  image: marcador4
}];
export function AboutTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    scrollYProgress
  } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  return <section id="sobre-timeline" ref={containerRef} className="relative max-w-7xl mx-auto py-20 px-4 md:px-8">
      {timelineData.map((item, index) => <div key={index} className="flex justify-start pt-10 md:pt-40 md:gap-10">
          <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
            <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-background flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-primary border-2 border-primary shadow-lg" />
            </div>
            <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-muted-foreground">
              {item.title}
            </h3>
          </div>

          <div className="relative pl-20 pr-4 md:pl-4 w-full">
            <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-foreground">
              {item.title}
            </h3>
            <div className="space-y-6">
              {item.content}
              {item.image && <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.5,
            delay: 0.2
          }} viewport={{
            once: true,
            margin: "-100px"
          }} className="rounded-lg overflow-hidden shadow-lg">
                  <img src={item.image} alt={`Ilustração: ${item.title}`} loading="lazy" className="w-full h-auto object-cover" />
                </motion.div>}
            </div>
          </div>
        </div>)}
      
      {/* Trilho estático */}
      <div aria-hidden="true" className="absolute left-8 top-0 h-full w-[2px] bg-border/30" />
      
      {/* Linha de progresso dinâmica */}
      <motion.div aria-hidden="true" style={{
      scaleY: scrollYProgress,
      transformOrigin: "top"
    }} className="absolute left-8 top-0 h-full w-[2px] bg-gradient-to-b from-primary via-primary/60 to-transparent rounded-full" />
    </section>;
}