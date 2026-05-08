import { motion } from "framer-motion";
import { Users, Wrench, BookOpen, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocialProofMetrics } from "@/hooks/useSocialProofMetrics";

const ease = [0.16, 1, 0.3, 1] as const;

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  isLoading: boolean;
  delay: number;
}

function MetricCard({ icon, label, value, isLoading, delay }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5, ease }}
      className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/50 p-5 sm:p-6 min-h-[120px] justify-center"
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16 rounded-md" />
      ) : (
        <span className="text-2xl sm:text-3xl font-bold tracking-tight">
          {value !== null ? value.toLocaleString("pt-BR") : "—"}
        </span>
      )}
      <span className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</span>
    </motion.div>
  );
}

export function SocialProofSection() {
  const metrics = useSocialProofMetrics();

  return (
    <section className="relative w-full py-16 md:py-24 lg:py-32 bg-background">
      <div className="container">
        <div className="flex flex-col items-center gap-10">
          {/* Title and Support Text */}
          <div className="flex flex-col items-center gap-6 text-center max-w-3xl">
            <motion.h2
              className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease }}
            >
              Conteúdo que já ajudou milhões de pessoas a{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">estudar melhor</span>
            </motion.h2>

            <motion.p
              className="text-muted-foreground sm:text-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.8, ease }}
            >
              O PqEstudar reúne ferramentas, concursos e conteúdos práticos com a mesma curadoria que já alcançou milhões de pessoas nas redes.
            </motion.p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              label="Usuários"
              value={metrics.usersCount}
              isLoading={metrics.isLoading}
              delay={0.1}
            />
            <MetricCard
              icon={<Wrench className="h-5 w-5" />}
              label="Ferramentas"
              value={metrics.toolsCount}
              isLoading={metrics.isLoading}
              delay={0.2}
            />
            <MetricCard
              icon={<BookOpen className="h-5 w-5" />}
              label="Concursos"
              value={metrics.contestsCount}
              isLoading={metrics.isLoading}
              delay={0.3}
            />
            <MetricCard
              icon={<Mail className="h-5 w-5" />}
              label="Newsletter"
              value={metrics.newsletterCount}
              isLoading={metrics.isLoading}
              delay={0.4}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
