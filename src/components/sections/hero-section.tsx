import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HeroBadge from "@/components/ui/hero-badge";
import { renderHighlightedTitle } from "@/lib/highlight-title";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATIC_HOME_TITLE = "Aprenda, Organize e Evolua com as Ferramentas Certas";
const STATIC_HOME_DESCRIPTION =
  "O PqEstudar organiza ferramentas online, plataformas educacionais, concursos publicos e conteudos praticos para voce resolver problemas e crescer mais rapido!";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
};

type FloatingShapeKind = "book" | "spark" | "check" | "card";

type FloatingShape = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  kind: FloatingShapeKind;
  color: string;
};

const PARTICLE_COLORS_DARK = ["#e33bea", "#b66cff", "#f5d7ff", "#ffffff"];
const PARTICLE_COLORS_LIGHT = ["#800080", "#a63bc2", "#d79be8", "#6d4a7a"];
const FLOATING_SHAPES: FloatingShapeKind[] = ["book", "spark", "check", "card"];

function HeroParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let isDark = document.documentElement.classList.contains("dark");
    let pointer: { x: number; y: number } | null = null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles: Particle[] = [];
    const shapes: FloatingShape[] = [];

    const getPalette = () => (isDark ? PARTICLE_COLORS_DARK : PARTICLE_COLORS_LIGHT);
    const getLineColor = () => (isDark ? "245,215,255" : "109,74,122");

    const createParticle = (palette: string[]): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      size: 1.2 + Math.random() * 1.3,
      color: palette[Math.floor(Math.random() * palette.length)],
    });

    const createShape = (palette: string[], index: number): FloatingShape => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      size: 18 + Math.random() * 12,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.002,
      kind: FLOATING_SHAPES[index % FLOATING_SHAPES.length],
      color: palette[index % palette.length],
    });

    const drawFloatingShape = (shape: FloatingShape) => {
      const s = shape.size;

      context.save();
      context.translate(shape.x, shape.y);
      context.rotate(shape.rotation);
      context.strokeStyle = shape.color;
      context.fillStyle = shape.color;
      context.globalAlpha = isDark ? 0.26 : 0.18;
      context.lineWidth = 1.4;
      context.lineCap = "round";
      context.lineJoin = "round";

      if (shape.kind === "book") {
        context.beginPath();
        context.moveTo(-s * 0.48, -s * 0.28);
        context.quadraticCurveTo(-s * 0.2, -s * 0.42, 0, -s * 0.2);
        context.quadraticCurveTo(s * 0.2, -s * 0.42, s * 0.48, -s * 0.28);
        context.lineTo(s * 0.48, s * 0.34);
        context.quadraticCurveTo(s * 0.2, s * 0.2, 0, s * 0.36);
        context.quadraticCurveTo(-s * 0.2, s * 0.2, -s * 0.48, s * 0.34);
        context.closePath();
        context.stroke();
        context.beginPath();
        context.moveTo(0, -s * 0.2);
        context.lineTo(0, s * 0.36);
        context.stroke();
      }

      if (shape.kind === "spark") {
        context.beginPath();
        context.moveTo(0, -s * 0.48);
        context.lineTo(s * 0.12, -s * 0.12);
        context.lineTo(s * 0.48, 0);
        context.lineTo(s * 0.12, s * 0.12);
        context.lineTo(0, s * 0.48);
        context.lineTo(-s * 0.12, s * 0.12);
        context.lineTo(-s * 0.48, 0);
        context.lineTo(-s * 0.12, -s * 0.12);
        context.closePath();
        context.stroke();
      }

      if (shape.kind === "check") {
        context.beginPath();
        context.arc(0, 0, s * 0.42, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.moveTo(-s * 0.2, 0);
        context.lineTo(-s * 0.04, s * 0.16);
        context.lineTo(s * 0.24, -s * 0.18);
        context.stroke();
      }

      if (shape.kind === "card") {
        context.strokeRect(-s * 0.42, -s * 0.3, s * 0.84, s * 0.6);
        context.beginPath();
        context.moveTo(-s * 0.24, -s * 0.08);
        context.lineTo(s * 0.24, -s * 0.08);
        context.moveTo(-s * 0.24, s * 0.1);
        context.lineTo(s * 0.1, s * 0.1);
        context.stroke();
      }

      context.restore();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width));
      const nextHeight = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.floor(nextWidth * dpr);
      canvas.height = Math.floor(nextHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.max(36, Math.min(88, Math.floor((width * height) / 19000)));
      const targetShapeCount = width < 640 ? 3 : 7;
      const palette = getPalette();

      while (particles.length < targetCount) particles.push(createParticle(palette));
      particles.length = targetCount;
      while (shapes.length < targetShapeCount) shapes.push(createShape(palette, shapes.length));
      shapes.length = targetShapeCount;

      if (reduceMotion) draw();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      const lineColor = getLineColor();
      const maxDistance = width < 640 ? 92 : 124;
      const grabDistance = width < 640 ? 120 : 150;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];

        if (!reduceMotion) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x < -20) particle.x = width + 20;
          if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          if (particle.y > height + 20) particle.y = -20;
        }

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * (isDark ? 0.16 : 0.12);
            context.strokeStyle = `rgba(${lineColor}, ${opacity})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        }

        if (pointer) {
          const pointerDistance = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);

          if (pointerDistance < grabDistance) {
            const opacity = (1 - pointerDistance / grabDistance) * (isDark ? 0.62 : 0.42);
            context.strokeStyle = `rgba(${lineColor}, ${opacity})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(pointer.x, pointer.y);
            context.stroke();
          }
        }

        context.fillStyle = particle.color;
        context.globalAlpha = isDark ? 0.64 : 0.48;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }

      for (const shape of shapes) {
        if (!reduceMotion) {
          shape.x += shape.vx;
          shape.y += shape.vy;
          shape.rotation += shape.rotationSpeed;

          if (shape.x < -40) shape.x = width + 40;
          if (shape.x > width + 40) shape.x = -40;
          if (shape.y < -40) shape.y = height + 40;
          if (shape.y > height + 40) shape.y = -40;
        }

        drawFloatingShape(shape);
      }

      if (!reduceMotion) {
        frameId = window.requestAnimationFrame(draw);
      }
    };

    const handleThemeChange = () => {
      isDark = document.documentElement.classList.contains("dark");
      const palette = getPalette();
      particles.forEach((particle, index) => {
        particle.color = palette[index % palette.length];
      });
      shapes.forEach((shape, index) => {
        shape.color = palette[index % palette.length];
      });
      if (reduceMotion) draw();
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      pointer = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height ? { x, y } : null;
      if (reduceMotion) draw();
    };

    const handlePointerLeave = () => {
      pointer = null;
      if (reduceMotion) draw();
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("blur", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("blur", handlePointerLeave);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

interface HeroSectionProps {
  headerTitle?: string;
  headerDescription?: string;
}

export function HeroSection({ headerTitle, headerDescription }: HeroSectionProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Por favor, insira um e-mail valido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const { data, error } = await supabase.functions.invoke("subscribe-newsletter-brevo", {
        body: {
          email: email.trim(),
          consent: true,
          utmSource: urlParams.get("utm_source") || undefined,
          utmMedium: urlParams.get("utm_medium") || undefined,
          utmCampaign: urlParams.get("utm_campaign") || undefined,
          utmContent: urlParams.get("utm_content") || undefined,
          utmTerm: urlParams.get("utm_term") || undefined,
          pageSlug: "home_hero",
        },
      });

      if (error) throw error;

      if (data?.alreadySubscribed) {
        toast.success("Voce ja esta na lista. Verifique sua caixa de entrada.");
      } else {
        toast.success("Inscricao realizada!");
        setEmail("");
      }
    } catch {
      toast.error("Nao foi possivel cadastrar seu e-mail. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayTitle = headerTitle?.trim() || STATIC_HOME_TITLE;
  const displayDescription = headerDescription?.trim() || STATIC_HOME_DESCRIPTION;

  return (
    <section className="relative overflow-hidden w-full bg-gradient-to-br from-background to-accent/20">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent" />
      </div>
      <HeroParticlesBackground />

      <div className="container relative">
        <div className="flex min-h-[calc(100svh-72px)] flex-col items-center justify-center px-4 py-12 md:min-h-[calc(100vh-64px)] md:px-8 lg:px-12">
          <div className="flex flex-col gap-6 w-full max-w-4xl text-center">
            <div className="flex justify-center">
              <HeroBadge
                text="O caminho mais simples para estudar melhor"
                icon={<Sparkles className="h-4 w-4" />}
                variant="outline"
                size="md"
              />
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl min-h-[2.4em] sm:min-h-[2em]">
              {renderHighlightedTitle(displayTitle)}
            </h1>

            <p className="max-w-[42rem] mx-auto leading-normal text-muted-foreground sm:text-xl sm:leading-8 min-h-[3em] sm:min-h-[2em]">
              {displayDescription}
            </p>

            <div className="flex flex-col items-center gap-2 w-full max-w-2xl mx-auto">
              <form
                onSubmit={handleSubmit}
                className="flex w-full items-center gap-1 rounded-full border border-border bg-card/60 backdrop-blur-sm px-2 py-2 shadow-md"
              >
                <Input
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm px-3"
                  aria-label="Seu e-mail"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-full px-5 shrink-0 gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Receber novidades uteis"
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground/70 text-center">
                Sem spam. Voce pode sair quando quiser.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

