import matheusProfile from "@/assets/matheus-profile.png";

export function ManifestoSection() {
  return (
    <section className="pb-0 pt-20 bg-background w-full overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Texto */}
          <div className="space-y-6 md:space-y-8 text-center lg:text-left lg:order-2">
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
              Menos conteúdo,{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                mais aplicação.
              </span>
            </h2>
            
            <div className="prose prose-lg max-w-none">
              {/* Versão mobile: parágrafo resumido */}
              <p className="text-lg sm:text-xl md:text-2xl lg:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 lg:hidden">
                Meu nome é <span className="text-foreground font-semibold">Matheus Dias</span> e por anos acreditei que precisava consumir mais para ter sucesso. A verdade é o oposto: o sucesso vem de <span className="text-foreground font-semibold">aplicar o conhecimento certo</span>.
              </p>
              
              {/* Versão desktop: texto completo */}
              <div className="hidden lg:block space-y-4 max-w-2xl">
                <p className="text-lg sm:text-xl md:text-2xl lg:text-xl text-muted-foreground leading-relaxed">
                  Meu nome é <span className="text-foreground font-semibold">Matheus Dias</span> e por anos eu acreditei que precisava consumir mais para ter sucesso. A verdade é o oposto.
                </p>
                
                <p className="text-lg sm:text-xl md:text-2xl lg:text-xl text-muted-foreground leading-relaxed">
                  O sucesso vem de <span className="text-foreground font-semibold">aplicar o conhecimento certo, da forma mais rápida possível</span>. O PqEstudar? nasceu para ser o seu filtro.
                </p>
                
                <p className="text-lg sm:text-xl md:text-2xl lg:text-xl text-muted-foreground leading-relaxed">
                  Aqui, compartilhamos apenas o que funciona no mundo real, para profissionais que não têm tempo a perder.
                </p>
              </div>
            </div>
          </div>

          {/* Foto */}
          <div className="relative flex items-end justify-center mt-8 lg:mt-0 lg:order-1">
            <img 
              src={matheusProfile}
              alt="Matheus Dias - Fundador do PqEstudar?"
              loading="lazy"
              className="w-full max-w-[280px] sm:max-w-xs md:max-w-sm lg:max-w-full h-auto max-h-[45vh] lg:max-h-none object-contain object-bottom mx-auto rounded-2xl shadow-elegant border border-border/20"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
