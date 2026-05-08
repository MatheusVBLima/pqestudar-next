import { motion } from "framer-motion";
import matheusHub from "@/assets/matheus-hub.png";

const ease = [0.16, 1, 0.3, 1] as const;

const LinkHero = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="flex flex-col items-center text-center space-y-6 mb-2"
    >
      {/* Foto de Perfil */}
      <img
        src={matheusHub}
        alt="Foto de perfil de Matheus"
        className="size-40 md:size-44 rounded-full object-cover object-center mx-auto"
      />

      {/* Títulos */}
      <div className="space-y-3 px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Matheus - O Hacker dos Estudos
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          400k+ de Seguidores. Eu te mostro como passar usando IA.
        </p>
      </div>
    </motion.div>
  );
};

export default LinkHero;
