"use client";

import { devLog } from '@/lib/dev-log';
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, CheckCircle, X, FileText, Users, Award, Gift, Check, Shield, Clock, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import YouTubeLoopPlayer, { YouTubeLoopPlayerRef } from "@/components/ui/youtube-loop-player";
import garantiaImage from "@/assets/garantia-7-dias.png";
import bonusPassaporteFuturo from "@/assets/bonus-passaporte-futuro.png";
import bonusPainelControle from "@/assets/bonus-painel-controle.png";
import bonusGeradorArgumentos from "@/assets/bonus-gerador-argumentos.png";

type LandingImage = string | { src: string };
const getImageSrc = (image: LandingImage) => typeof image === "string" ? image : image.src;

// ============================================
// BRAND_TOKENS - AJUSTE FÁCIL DE CORES E FONTES
// ============================================
// Esses valores herdam do design system do PqEstudar (index.css / tailwind.config.ts).
// Para customizar, altere os valores HSL abaixo.
// IMPORTANTE: Use formato HSL (ex: "300 100% 25%") sem "hsl()" wrapper.

const BRAND_TOKENS = {
  // Cores principais do PqEstudar
  primary: "300 100% 25%",
  // Roxo principal (--primary do site)
  primaryLight: "300 80% 35%",
  // Roxo mais claro para gradientes

  // Cores de ação
  green: "145 63% 42%",
  // Verde dos CTAs (emerald-600 equivalente)
  greenHover: "145 63% 36%",
  // Verde hover (emerald-700 equivalente)
  red: "0 84% 60%",
  // Vermelho para preços (--destructive do site)
  orange: "25 95% 53%",
  // Laranja para badges de urgência

  // Fundos e superfícies
  background: "0 0% 98%",
  // Fundo claro (--background do site)
  card: "0 0% 100%",
  // Fundo de cards
  muted: "300 10% 96%",
  // Fundo muted (--muted do site)

  // Texto
  foreground: "0 0% 14%",
  // Texto principal (--foreground do site)
  mutedForeground: "0 0% 45%",
  // Texto secundário

  // Bordas e raios
  border: "300 20% 90%",
  // Borda (--border do site)
  radius: "0.75rem",
  // Raio padrão (12px)
  radiusLg: "1rem",
  // Raio grande (16px)

  // Sombras
  shadow: "0 4px 20px -8px hsl(300 20% 20% / 0.1)",
  shadowLg: "0 10px 40px -15px hsl(300 100% 25% / 0.2)",
  // Fontes - herda do sistema do site
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif"
};

// ============================================
// EDITABLE CONSTANTS - Change these as needed
// ============================================

type EasingTuple = [number, number, number, number];
const ease: EasingTuple = [0.16, 1, 0.3, 1];

// Default checkout links (template base — usados quando nenhum afiliado está configurado)
export const DEFAULT_CHECKOUT_BASICO = "https://pay.cakto.com.br/pme7qh6_673774";
export const DEFAULT_CHECKOUT_PREMIUM = "https://pay.cakto.com.br/acmn9pr_678659";

// Context para sobrescrever os links por afiliado mantendo o template intacto
const CheckoutLinksContext = React.createContext<{ basico: string; premium: string }>({
  basico: DEFAULT_CHECKOUT_BASICO,
  premium: DEFAULT_CHECKOUT_PREMIUM,
});
const useCheckoutLinks = () => React.useContext(CheckoutLinksContext);

const CONFIG = {
  urgencyDate: "30/11/2025",
  get checkoutBasico() { return DEFAULT_CHECKOUT_BASICO; },
  get checkoutPremium() { return DEFAULT_CHECKOUT_PREMIUM; },
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  videoPoster: "/placeholder.svg",
  timerEndDate: new Date(new Date().setHours(23, 59, 59, 999)),
  showStickyCta: false
};
const PRICES = {
  basicoAntigo: "R$ 47",
  basicoAtual: "R$ 10,00",
  premiumAntigo: "R$ 256",
  premiumAtual: "R$ 27,00",
  totalBonus: "R$ 111"
};
const BONUS_DATA: Array<{
  title: string;
  description: string;
  value: string;
  icon: string;
  image?: LandingImage;
}> = [{
  title: "Painel de Controle dos Benefícios",
  description: "Um template de Notion exclusivo para você organizar, priorizar e criar um plano de ação para solicitar cada benefício do guia. Chega de se sentir perdido, assuma o controle.",
  value: "R$ 47",
  icon: "🧠",
  image: bonusPainelControle
}, {
  title: "Passaporte para o Futuro",
  description: "Um guia completo com +22 plataformas para você fazer cursos gratuitos com certificados de empresas como Google, Microsoft e de grandes universidades. Turbine seu currículo!",
  value: "R$ 37",
  icon: "🎓",
  image: bonusPassaporteFuturo
}, {
  title: "Gerador de Argumentos",
  description: "Um PDF com 10 modelos de textos prontos (copia e cola) para você exigir seus direitos em situações reais, seja com bancos, hospitais ou em lojas. Tenha o poder na palma da sua mão.",
  value: "R$ 27",
  icon: "💬",
  image: bonusGeradorArgumentos
}];
import testimonialMaria from "@/assets/testimonial-maria.png";
import testimonialJoao from "@/assets/testimonial-joao.png";
import testimonialCarlos from "@/assets/testimonial-carlos.png";
const TESTIMONIALS = [{
  name: "Maria S.",
  role: "Dona de Casa",
  quote: '"Eu nem imaginava que tinha direito à tarifa social de energia. Só com essa dica do Matheus, já economizei o valor do guia em um único mês. Incrível!"',
  avatar: testimonialMaria
}, {
  name: "João P.",
  role: "Estudante",
  quote: '"Sempre quis fazer um curso técnico mas não podia pagar. Com o guia, descobri um programa de bolsas de 100% na minha cidade que eu nem sabia que existia. Já estou matriculado!"',
  avatar: testimonialJoao
}, {
  name: "Carlos A.",
  role: "Autônomo",
  quote: '"Tinha um dinheiro do PIS esquecido há anos e não fazia ideia. O passo a passo do guia foi tão simples que resolvi em 10 minutos pelo celular. Valeu demais!"',
  avatar: testimonialCarlos
}];
const FAQ_DATA = [{
  question: "Como vou acessar o material após a compra?",
  answer: "Após a confirmação do pagamento, você receberá imediatamente por e-mail o acesso ao material digital em PDF. Você poderá baixar e começar a descobrir seus benefícios na mesma hora!"
}, {
  question: "Quais formas de pagamento são aceitas?",
  answer: "Aceitamos Cartão de Crédito e PIX. O acesso é liberado imediatamente para compras no Cartão e PIX após a confirmação do pagamento."
}, {
  question: "Os benefícios servem para qualquer pessoa?",
  answer: "Sim! O guia foi desenvolvido para ser aplicável a todos os brasileiros. Ele inclui benefícios para diferentes faixas de renda, idades, situações profissionais (CLT, autônomo, estudante) e regiões do país."
}, {
  question: "Preciso ter conhecimento técnico para usar o guia?",
  answer: "Não! O material foi criado com uma linguagem 100% simples e com links diretos, pensando em quem não tem familiaridade com a burocracia do governo. O objetivo é ser fácil e direto."
}, {
  question: "Como funciona a garantia de 7 dias?",
  answer: "Se por qualquer motivo você não ficar satisfeito com o material, basta solicitar o reembolso em até 7 dias após a compra. Devolvemos 100% do valor pago, sem perguntas."
}, {
  question: "Para quem o guia é recomendado?",
  answer: "O guia foi pensado para todas as idades, desde jovens a partir dos 16 anos (ID Jovem, ProUni) até idosos (BPC, isenções). O material inclui benefícios que se adaptam a diferentes fases da vida e necessidades."
}];
const track = (event: string, data: Record<string, string>) => {
  devLog("[Analytics]", event, data);
};

// ============================================
// BRAND THEME WRAPPER - Escopo apenas nesta página
// ============================================

const BrandThemeWrapper = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const brandStyles = {
    '--brand-primary': BRAND_TOKENS.primary,
    '--brand-primary-light': BRAND_TOKENS.primaryLight,
    '--brand-green': BRAND_TOKENS.green,
    '--brand-green-hover': BRAND_TOKENS.greenHover,
    '--brand-red': BRAND_TOKENS.red,
    '--brand-orange': BRAND_TOKENS.orange,
    '--brand-bg': BRAND_TOKENS.background,
    '--brand-card': BRAND_TOKENS.card,
    '--brand-muted': BRAND_TOKENS.muted,
    '--brand-foreground': BRAND_TOKENS.foreground,
    '--brand-muted-foreground': BRAND_TOKENS.mutedForeground,
    '--brand-border': BRAND_TOKENS.border,
    '--brand-radius': BRAND_TOKENS.radius,
    '--brand-radius-lg': BRAND_TOKENS.radiusLg,
    '--brand-shadow': BRAND_TOKENS.shadow,
    '--brand-shadow-lg': BRAND_TOKENS.shadowLg
  } as React.CSSProperties;
  return <div className="brand-scope min-h-screen overflow-x-hidden" style={{
    ...brandStyles,
    fontFamily: BRAND_TOKENS.fontSans,
    background: `hsl(${BRAND_TOKENS.background})`,
    color: `hsl(${BRAND_TOKENS.foreground})`
  }}>
      {children}
    </div>;
};

// ============================================
// COMPONENTS
// ============================================

const useCountdown = (targetDate: Date) => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor(difference / (1000 * 60 * 60) % 24),
          minutes: Math.floor(difference / 1000 / 60 % 60),
          seconds: Math.floor(difference / 1000 % 60)
        });
      } else {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0
        });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return timeLeft;
};

// Urgency Bar - Vermelho para urgência (psicologia das cores)
const UrgencyBar = ({
  forceDate
}: {
  forceDate?: string;
}) => {
  // Gera data do dia no formato DD/MM/AAAA (timezone do navegador)
  const todayDate = forceDate || (() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  })();
  return <div className="sticky z-50 py-2.5 w-full" style={{
    background: `hsl(${BRAND_TOKENS.red})`,
    top: 'env(safe-area-inset-top, 0)',
    paddingLeft: 'max(16px, env(safe-area-inset-left))',
    paddingRight: 'max(16px, env(safe-area-inset-right))'
  }} role="status" aria-live="polite">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-white font-semibold text-xs sm:text-sm md:text-base text-center whitespace-normal break-words">
        <Flame className="hidden sm:block h-4 w-4 md:h-5 md:w-5 animate-pulse shrink-0" />
        <span className="px-1">🔥 DESCONTO SÓ HOJE NESSA PÁGINA {todayDate} 🔥</span>
        <Flame className="hidden sm:block h-4 w-4 md:h-5 md:w-5 animate-pulse shrink-0" />
      </div>
    </div>;
};

// CTA Button - Verde do PqEstudar
const CTAButton = ({
  children,
  href,
  section,
  plan,
  className,
  size = "lg"
}: {
  children: React.ReactNode;
  href: string;
  section: string;
  plan?: string;
  className?: string;
  size?: "default" | "lg";
}) => <motion.div whileHover={{
  scale: 1.02
}} whileTap={{
  scale: 0.98
}} className="w-full max-w-full">
    <Button asChild size={size} className={cn("font-bold text-white transition-all duration-300", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2", "w-full whitespace-normal break-words text-center min-h-[48px] h-auto", size === "lg" && "text-base sm:text-lg px-4 sm:px-8 py-4 sm:py-6", className)} style={{
    background: `hsl(${BRAND_TOKENS.green})`,
    boxShadow: BRAND_TOKENS.shadowLg,
    borderRadius: BRAND_TOKENS.radiusLg
  }} onClick={() => track("cta_click", {
    section,
    plan: plan || ""
  })} aria-label={children?.toString()}>
      <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-90 flex items-center justify-center w-full" style={{
      '--tw-ring-color': `hsl(${BRAND_TOKENS.green})`
    } as React.CSSProperties}>
        {children}
      </a>
    </Button>
  </motion.div>;

// Styled Card - usa tokens da marca
const BrandCard = ({
  children,
  className,
  highlight = false,
  highlightGreen = false
}: {
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
  highlightGreen?: boolean;
}) => <Card className={cn("h-full transition-shadow", className)} style={{
  background: `hsl(${BRAND_TOKENS.card})`,
  borderRadius: BRAND_TOKENS.radiusLg,
  boxShadow: highlight || highlightGreen ? BRAND_TOKENS.shadowLg : BRAND_TOKENS.shadow,
  border: highlightGreen ? `2px solid hsl(${BRAND_TOKENS.green})` : highlight ? `2px solid hsl(${BRAND_TOKENS.primary})` : `1px solid hsl(${BRAND_TOKENS.border})`
}}>
    {children}
  </Card>;

// Price Display - Preço antigo em vermelho, atual em verde
const PriceDisplay = ({
  oldPrice,
  currentPrice,
  showOld = true
}: {
  oldPrice: string;
  currentPrice: string;
  showOld?: boolean;
}) => <div className="mb-2">
    {showOld && <span className="line-through text-lg mr-2" style={{
    color: `hsl(${BRAND_TOKENS.red})`
  }}>
        {oldPrice}
      </span>}
    <span className="text-4xl font-bold" style={{
    color: `hsl(${BRAND_TOKENS.green})`
  }}>
      {currentPrice}
    </span>
  </div>;

// VSL com Hint de Som - wrapper que adiciona dica visual temporária
const VSLWithSoundHint = ({
  videoId,
  title,
  ariaLabel,
  className,
}: {
  videoId: string;
  title: string;
  ariaLabel: string;
  className?: string;
}) => {
  const [showSoundHint, setShowSoundHint] = useState(true);
  const playerRef = useRef<YouTubeLoopPlayerRef>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSoundHint(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Handler para ativar som ao clicar no hint
  const handleActivateSound = () => {
    playerRef.current?.unMute();
    setShowSoundHint(false);
  };

  return (
    <>
      <YouTubeLoopPlayer
        ref={playerRef}
        videoId={videoId}
        title={title}
        ariaLabel={ariaLabel}
        className={className}
      />
      
      {/* Hint temporário "Ative o som" */}
      <AnimatePresence>
        {showSoundHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute z-20 top-3 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-4 md:top-4"
            aria-live="polite"
          >
            <button
              onClick={handleActivateSound}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-md ring-1 ring-black/5 cursor-pointer hover:bg-white transition-colors"
              aria-label="Ativar som do vídeo"
            >
              <motion.span
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              >
                <Volume2 className="h-4 w-4 text-foreground" />
              </motion.span>
              <span className="text-sm font-medium text-foreground">Ative o som</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// VSL Configuration
const VSL_CONFIG = {
  videoId: "3Zj1cADXZVI",
  title: "Assista rapidamente e entenda como acessar agora",
  subtitle: "Vídeo vertical (9:16) com instruções objetivas",
  ctaLabel: "QUERO GARANTIR MINHA OFERTA!",
  ctaLink: CONFIG.checkoutPremium,
  maxWidthDesktop: 480,
  // Header texts
  headerTitle: "🎁 Você Ganhou um Presente! 🎁",
  headerSub: "⭐ Assista ao vídeo abaixo: ⭐",
  viewersText: "2 pessoas estão assistindo esse vídeo",
  // Card styling
  cardRadius: "rounded-3xl",
  cardShadow: "shadow-xl"
};

// Hero Section
const HeroSection = () => <section className="relative py-10 md:py-12 px-4 sm:px-6" style={{
  background: `linear-gradient(135deg, hsl(${BRAND_TOKENS.muted}), hsl(${BRAND_TOKENS.background}))`
}}>
    <div className="container max-w-5xl mx-auto text-center px-0">
      <motion.p initial={{
      opacity: 0,
      y: -20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5,
      ease
    }} className="font-semibold text-sm md:text-base tracking-wide mb-4" style={{
      color: `hsl(${BRAND_TOKENS.primary})`
    }}>
        OFERTA LIMITADA - ACESSO IMEDIATO
      </motion.p>

      <motion.h1 initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      delay: 0.1,
      ease
    }} className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6" style={{
      color: `hsl(${BRAND_TOKENS.foreground})`
    }}>
        <span>+50 Benefícios</span>
        <br />
        <span style={{
        color: `hsl(${BRAND_TOKENS.primary})`
      }}>Secretos do Governo que Você<br />Pode Ter Direito</span>
        <br />
        <span>+ Bônus</span>
      </motion.h1>

      <motion.p initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      delay: 0.2,
      ease
    }} className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 px-2" style={{
      color: `hsl(${BRAND_TOKENS.mutedForeground})`
    }}>
        <strong style={{
        color: `hsl(${BRAND_TOKENS.foreground})`
      }}>Acesso imediato ao guia completo</strong> que revela como acessar{" "}
        <strong style={{
        color: `hsl(${BRAND_TOKENS.foreground})`
      }}>auxílios, descontos, cursos e até dinheiro</strong> que já são seus por direito. 
        Material organizado <strong style={{
        color: `hsl(${BRAND_TOKENS.foreground})`
      }}>para qualquer cidadão, sem complicação</strong>.
      </motion.p>

      {/* VSL Card Container - alinhado com os cards abaixo (max-w-5xl) */}
      <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      duration: 0.6,
      delay: 0.3,
      ease
    }} className={`w-full mx-auto p-5 lg:p-8 ${VSL_CONFIG.cardRadius} ${VSL_CONFIG.cardShadow} border border-neutral-200/60 overflow-hidden`} style={{
      background: '#fff'
    }}>
        <div className="flex flex-col items-center space-y-4 lg:space-y-6">
          {/* Header above video */}
          <div className="text-center">
            <h5 className="text-lg md:text-xl font-semibold mb-2" style={{
            color: `hsl(${BRAND_TOKENS.foreground})`
          }}>
              {VSL_CONFIG.headerTitle}
            </h5>
            <p className="text-sm md:text-base" style={{
            color: `hsl(${BRAND_TOKENS.mutedForeground})`
          }}>
              {VSL_CONFIG.headerSub}
            </p>
          </div>

          {/* Player 9:16 */}
          <div className="w-full" style={{
          maxWidth: `${VSL_CONFIG.maxWidthDesktop}px`
        }}>
            <div className="relative w-full overflow-hidden" style={{
            aspectRatio: '9 / 16',
            borderRadius: BRAND_TOKENS.radiusLg,
            boxShadow: BRAND_TOKENS.shadow,
            background: '#000'
          }}>
              <VSLWithSoundHint
                videoId={VSL_CONFIG.videoId}
                title={VSL_CONFIG.title}
                ariaLabel={VSL_CONFIG.subtitle}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>

          {/* Viewers status below video */}
          <div className="flex items-center justify-center gap-2" aria-label="2 pessoas assistindo agora">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{
            background: `hsl(${BRAND_TOKENS.red})`
          }} aria-hidden="true" />
            <span className="text-xs md:text-sm" style={{
            color: `hsl(${BRAND_TOKENS.mutedForeground})`
          }}>
              {VSL_CONFIG.viewersText}
            </span>
          </div>

        </div>
      </motion.div>
    </div>
  </section>;

// What You'll Receive Section
const WhatYouReceiveSection = () => <section className="py-6 md:py-12 px-4 sm:px-6" style={{
  background: `hsl(${BRAND_TOKENS.background})`
}}>
    <div className="container max-w-5xl mx-auto px-0">
      <motion.h2 initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease
    }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12" style={{
      color: `hsl(${BRAND_TOKENS.foreground})`
    }}>
        O Que Você Vai Receber
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.5,
        ease
      }}>
          <BrandCard className="h-full">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex justify-center">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" style={{
                  background: `hsl(${BRAND_TOKENS.primary} / 0.1)`
                }}>
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6" style={{
                    color: `hsl(${BRAND_TOKENS.primary})`
                  }} />
                  </div>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-center" style={{
                color: `hsl(${BRAND_TOKENS.foreground})`
              }}>
                  Material Completo em PDF
                </h3>
                <ul className="space-y-2">
                  {["Mais de 50 benefícios, programas e auxílios compilados", "Link direto e instruções claras para cada benefício", "Acesso digital pelo celular, tablet ou computador", "Pronto para imprimir e consultar quando quiser"].map((item, i) => <li key={i} className="flex items-start gap-2 text-sm" style={{
                  color: `hsl(${BRAND_TOKENS.mutedForeground})`
                }}>
                      <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{
                    color: `hsl(${BRAND_TOKENS.green})`
                  }} />
                      <span className="break-words">{item}</span>
                    </li>)}
                </ul>
              </div>
            </CardContent>
          </BrandCard>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.5,
        delay: 0.1,
        ease
      }}>
          <BrandCard className="h-full">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex justify-center">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" style={{
                  background: `hsl(${BRAND_TOKENS.primary} / 0.1)`
                }}>
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" style={{
                    color: `hsl(${BRAND_TOKENS.primary})`
                  }} />
                  </div>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-center" style={{
                color: `hsl(${BRAND_TOKENS.foreground})`
              }}>
                  Para Qualquer Cidadão
                </h3>
                <ul className="space-y-2">
                  {["Benefícios para jovens, adultos e idosos.", "Sem 'juridiquês' ou termos técnicos.", "Ideal para trabalhadores, estudantes, autônomos e aposentados.", "Economize tempo e dinheiro com informações que valem ouro."].map((item, i) => <li key={i} className="flex items-start gap-2 text-sm" style={{
                  color: `hsl(${BRAND_TOKENS.mutedForeground})`
                }}>
                      <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{
                    color: `hsl(${BRAND_TOKENS.green})`
                  }} />
                      <span className="break-words">{item}</span>
                    </li>)}
                </ul>
              </div>
            </CardContent>
          </BrandCard>
        </motion.div>
      </div>
    </div>
  </section>;

// Why Choose Section
const WhyChooseSection = () => {
  const features = [{
    icon: Gift,
    title: "Economia Real",
    description: "Descubra como pagar contas de luz mais baratas, conseguir medicamentos de graça e acessar dinheiro esquecido."
  }, {
    icon: Award,
    title: "Oportunidades Únicas",
    description: "Acesse vagas em cursos gratuitos, programas de moradia e financiamentos com juros baixos que não são divulgados na mídia."
  }, {
    icon: FileText,
    title: "Fim da Burocracia",
    description: "Chega de se sentir perdido em sites do governo. Nós te damos o link direto e o passo a passo exato do que fazer."
  }, {
    icon: Shield,
    title: "Conhecimento é Poder",
    description: "Pare de perder dinheiro e oportunidades por falta de informação. Tenha o controle dos seus direitos na palma da sua mão."
  }];
  return <section className="py-6 md:py-12 px-4 sm:px-6" style={{
    background: `hsl(${BRAND_TOKENS.muted})`
  }}>
      <div className="container max-w-5xl mx-auto px-0">
        <motion.h2 initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.6,
        ease
      }} className="text-xl sm:text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12" style={{
        color: `hsl(${BRAND_TOKENS.foreground})`
      }}>
          Por Que Você Precisa Desse Mapa?
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
          {features.map((feature, index) => <motion.div key={feature.title} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5,
          delay: index * 0.1,
          ease
        }}>
              <BrandCard className="h-full">
                <CardContent className="p-4 sm:p-5 md:p-6 text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4" style={{
                background: `hsl(${BRAND_TOKENS.primary} / 0.1)`
              }}>
                    <feature.icon className="h-6 w-6 sm:h-7 sm:w-7" style={{
                  color: `hsl(${BRAND_TOKENS.primary})`
                }} />
                  </div>
                  <h3 className="font-bold mb-2 text-sm sm:text-base" style={{
                color: `hsl(${BRAND_TOKENS.foreground})`
              }}>
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm" style={{
                color: `hsl(${BRAND_TOKENS.mutedForeground})`
              }}>
                    {feature.description}
                  </p>
                </CardContent>
              </BrandCard>
            </motion.div>)}
        </div>
      </div>
    </section>;
};

// Bonus Section
const BonusSection = () => <section className="py-6 md:py-12 px-4 sm:px-6" style={{
  background: `linear-gradient(135deg, hsl(${BRAND_TOKENS.muted}), hsl(${BRAND_TOKENS.background}))`
}}>
    <div className="container max-w-5xl mx-auto px-0">
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease
    }} className="text-center mb-8 md:mb-10">
        <Badge className="mb-4 text-xs sm:text-sm px-3 sm:px-4 py-1 text-white whitespace-normal" style={{
        background: `hsl(${BRAND_TOKENS.primary})`,
        borderRadius: BRAND_TOKENS.radius
      }}>
          🎁 BÔNUS EXCLUSIVOS - VALOR TOTAL {PRICES.totalBonus}
        </Badge>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{
        color: `hsl(${BRAND_TOKENS.foreground})`
      }}>
          Receba 3 Guias Incríveis GRÁTIS
        </h2>
        <p className="text-sm sm:text-base" style={{
        color: `hsl(${BRAND_TOKENS.mutedForeground})`
      }}>
          Materiais extras que vão colocar ainda mais dinheiro no seu bolso e proteger seu futuro.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
        {BONUS_DATA.map((bonus, index) => <motion.div key={bonus.title} initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease
      }}>
            <BrandCard className="overflow-hidden h-full flex flex-col">
              <div className="h-32 sm:h-40 md:h-48 flex items-center justify-center flex-shrink-0 overflow-hidden" style={{
            background: `linear-gradient(135deg, hsl(${BRAND_TOKENS.primary} / 0.2), hsl(${BRAND_TOKENS.primaryLight} / 0.3))`
          }}>
                {bonus.image ? <img src={getImageSrc(bonus.image)} alt={bonus.title} className="w-full h-full object-cover" /> : <span className="text-5xl sm:text-6xl">{bonus.icon}</span>}
              </div>
              <CardContent className="p-4 sm:p-5 text-center flex flex-col flex-1">
                <span className="text-xl sm:text-2xl mb-2 block">{bonus.icon}</span>
                <h3 className="font-bold text-base sm:text-lg mb-2" style={{
              color: `hsl(${BRAND_TOKENS.foreground})`
            }}>
                  {bonus.title}
                </h3>
                <p className="text-xs sm:text-sm mb-3" style={{
              color: `hsl(${BRAND_TOKENS.mutedForeground})`
            }}>
                  {bonus.description}
                </p>
                <div className="mt-auto pt-2">
                  <p className="font-bold text-sm sm:text-base" style={{
                color: `hsl(${BRAND_TOKENS.red})`
              }}>
                    VALOR: {bonus.value}
                  </p>
                </div>
              </CardContent>
            </BrandCard>
          </motion.div>)}
      </div>

      <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} whileInView={{
      opacity: 1,
      scale: 1
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.5,
      ease
    }} className="flex justify-center">
        <BrandCard className="w-full max-w-xs sm:max-w-sm">
          <CardContent className="p-4 sm:p-6 text-center">
            <p className="text-base sm:text-lg font-semibold" style={{
            color: `hsl(${BRAND_TOKENS.foreground})`
          }}>
              Total em bônus:{" "}
              <span className="line-through" style={{
              color: `hsl(${BRAND_TOKENS.red})`
            }}>
                {PRICES.totalBonus}
              </span>
            </p>
            <p className="text-xl sm:text-2xl font-bold" style={{
            color: `hsl(${BRAND_TOKENS.green})`
          }}>
              HOJE: GRÁTIS!
            </p>
          </CardContent>
        </BrandCard>
      </motion.div>
    </div>
  </section>;

// Pricing Section
const PricingSection = () => {
  const {
    hours,
    minutes,
    seconds
  } = useCountdown(CONFIG.timerEndDate);
  const basicFeatures = [{
    text: "+50 Benefícios Ocultos PDF",
    included: true
  }, {
    text: "Acesso imediato",
    included: true
  }, {
    text: "Garantia de 7 dias",
    included: true
  }, {
    text: "Bônus exclusivos",
    included: false
  }, {
    text: "Atualizações futuras",
    included: false
  }];
  const premiumFeatures = [{
    text: "+50 Benefícios Ocultos PDF",
    included: true
  }, {
    text: "Acesso imediato",
    included: true
  }, {
    text: "Garantia de 7 dias",
    included: true
  }, {
    text: "BÔNUS: Painel de Controle dos Benefícios",
    included: true,
    isBonus: true
  }, {
    text: "BÔNUS: Passaporte para o Futuro",
    included: true,
    isBonus: true
  }, {
    text: "BÔNUS: Gerador de Argumentos",
    included: true,
    isBonus: true
  }, {
    text: "Atualizações por 1 ano",
    included: true
  }];
  return <section className="py-10 md:py-24 px-4 sm:px-6" style={{
    background: `hsl(${BRAND_TOKENS.background})`
  }}>
      <div className="container max-w-5xl mx-auto px-0">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.6,
        ease
      }} className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6" style={{
          color: `hsl(${BRAND_TOKENS.foreground})`
        }}>
            Escolha Seu Plano
          </h2>
          
          {/* Timer - Vermelho para urgência (psicologia das cores) */}
          <div className="flex flex-col items-center px-4 sm:px-8 md:px-12 py-4 md:py-5 w-full max-w-xl mx-auto" style={{
          background: `hsl(${BRAND_TOKENS.red})`,
          borderRadius: BRAND_TOKENS.radiusLg,
          boxShadow: `0 10px 40px -15px hsl(${BRAND_TOKENS.red} / 0.4)`
        }} role="timer" aria-label="Tempo restante da oferta">
            <p className="text-white/90 text-xs sm:text-sm md:text-base font-medium mb-2 text-center">
              OFERTA LIMITADA - TERMINA EM:
            </p>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {[{
              value: hours,
              label: "HORAS"
            }, {
              value: minutes,
              label: "MIN"
            }, {
              value: seconds,
              label: "SEG"
            }].map((unit, i) => <React.Fragment key={unit.label}>
                  {i > 0 && <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">:</span>}
                  <div className="text-center">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white block">
                      {String(unit.value).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] sm:text-[10px] md:text-xs text-white/80 font-medium">
                      {unit.label}
                    </span>
                  </div>
                </React.Fragment>)}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center lg:items-center">
          {/* Basic Plan - Smaller on desktop, centered vertically */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5,
          ease
        }} className="w-full lg:self-center lg:max-w-[480px] lg:mx-auto lg:scale-[0.95] origin-center">
            <BrandCard className="h-full">
              <CardContent className="p-4 sm:p-6 lg:p-6">
                <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{
                color: `hsl(${BRAND_TOKENS.foreground})`
              }}>
                  Plano Básico
                </h3>
                <PriceDisplay oldPrice={PRICES.basicoAntigo} currentPrice={PRICES.basicoAtual} />
                <p className="text-sm mb-4 sm:mb-6" style={{
                color: `hsl(${BRAND_TOKENS.mutedForeground})`
              }}>
                  pagamento único
                </p>

                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {basicFeatures.map((feature, i) => <li key={i} className="flex items-start gap-2">
                      {feature.included ? <Check className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" style={{
                    color: `hsl(${BRAND_TOKENS.green})`
                  }} /> : <X className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" style={{
                    color: `hsl(${BRAND_TOKENS.red})`
                  }} />}
                      <span className={cn("text-xs sm:text-sm")} style={{
                    color: feature.included ? `hsl(${BRAND_TOKENS.foreground})` : `hsl(${BRAND_TOKENS.mutedForeground})`
                  }}>
                        {feature.text}
                      </span>
                    </li>)}
                </ul>

                <CTAButton href={useCheckoutLinks().basico} section="pricing" plan="basico">
                  QUERO O BÁSICO
                </CTAButton>
              </CardContent>
            </BrandCard>
          </motion.div>

          {/* Premium Plan - Larger on desktop with emphasis */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.5,
          delay: 0.1,
          ease
        }} className="w-full lg:max-w-[560px] lg:mx-auto lg:scale-[1.02] origin-center">
            <BrandCard highlightGreen className="relative h-full">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-white px-3 sm:px-4 py-1 text-xs sm:text-sm whitespace-nowrap" style={{
              background: `hsl(${BRAND_TOKENS.green})`,
              borderRadius: BRAND_TOKENS.radius
            }}>
                MAIS POPULAR
              </Badge>
              <CardContent className="p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8">
                <p style={{
                color: `hsl(${BRAND_TOKENS.mutedForeground})`
              }} className="text-[10px] sm:text-xs mb-1 font-bold">
                  +1.253 pessoas escolheram essa oferta
                </p>
                <h3 className="text-xl sm:text-2xl lg:text-[1.7rem] font-bold mb-2" style={{
                color: `hsl(${BRAND_TOKENS.foreground})`
              }}>
                  Plano Premium
                </h3>
                <PriceDisplay oldPrice={PRICES.premiumAntigo} currentPrice={PRICES.premiumAtual} />
                <p className="text-sm mb-4 sm:mb-6" style={{
                color: `hsl(${BRAND_TOKENS.mutedForeground})`
              }}>
                  pagamento único
                </p>

                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {premiumFeatures.map((feature, i) => <li key={i} className="flex items-start gap-2">
                      {feature.isBonus ? <Gift className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" style={{
                    color: `hsl(${BRAND_TOKENS.primary})`
                  }} /> : <Check className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" style={{
                    color: `hsl(${BRAND_TOKENS.green})`
                  }} />}
                      <span className={cn("text-xs sm:text-sm", feature.isBonus && "font-medium")} style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>
                        {feature.text}
                      </span>
                    </li>)}
                </ul>

                <CTAButton href={useCheckoutLinks().premium} section="pricing" plan="premium">
                  QUERO O PREMIUM!
                </CTAButton>
              </CardContent>
            </BrandCard>
          </motion.div>
        </div>
      </div>
    </section>;
};

// Testimonials Section
const TestimonialsSection = () => <section className="py-10 md:py-24 px-4 sm:px-6" style={{
  background: `hsl(${BRAND_TOKENS.muted})`
}}>
    <div className="container max-w-5xl mx-auto px-0">
      <motion.h2 initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease
    }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12" style={{
      color: `hsl(${BRAND_TOKENS.foreground})`
    }}>
        O Que Dizem Nossos Leitores
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {TESTIMONIALS.map((testimonial, index) => <motion.div key={testimonial.name} initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease
      }}>
            <BrandCard className="text-center h-full">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 overflow-hidden" style={{
              background: `linear-gradient(135deg, hsl(${BRAND_TOKENS.primary}), hsl(${BRAND_TOKENS.primaryLight}))`
            }}>
                  <img src={testimonial.avatar} alt={`Avatar de ${testimonial.name}`} className="w-full h-full object-cover object-top" loading="lazy" />
                </div>
                <h3 className="font-bold text-sm sm:text-base" style={{
              color: `hsl(${BRAND_TOKENS.foreground})`
            }}>
                  {testimonial.name}
                </h3>
                <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{
              color: `hsl(${BRAND_TOKENS.mutedForeground})`
            }}>
                  {testimonial.role}
                </p>
                <p className="text-xs sm:text-sm italic" style={{
              color: `hsl(${BRAND_TOKENS.mutedForeground})`
            }}>
                  {testimonial.quote}
                </p>
              </CardContent>
            </BrandCard>
          </motion.div>)}
      </div>
    </div>
  </section>;

// About Author Section
const AboutAuthorSection = () => <section className="py-10 md:py-24 px-4 sm:px-6" style={{
  background: `hsl(${BRAND_TOKENS.background})`
}}>
    <div className="container max-w-4xl mx-auto px-0">
      <motion.h2 initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease
    }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12" style={{
      color: `hsl(${BRAND_TOKENS.foreground})`
    }}>
        Sobre o Autor
      </motion.h2>

      <motion.div initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease
    }}>
        <BrandCard highlight>
          <CardContent className="p-4 sm:p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
              <div className="text-center">
                <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full mx-auto mb-4 overflow-hidden" style={{
                boxShadow: `0 0 0 4px hsl(${BRAND_TOKENS.primary})`,
                background: `linear-gradient(135deg, hsl(${BRAND_TOKENS.muted}), hsl(${BRAND_TOKENS.border}))`
              }}>
                  <img alt="Matheus Dias" className="w-full h-full object-cover" loading="lazy" src="/lovable-uploads/eef30a09-d048-4db6-994f-c33c8dee49e8.png" />
                </div>
                <div className="flex flex-row md:flex-col justify-center gap-4 md:gap-0 md:space-y-2">
                  {[{
                  value: "4+",
                  label: "Anos de Experiência"
                }, {
                  value: "50+",
                  label: "Milhões de Visualizações"
                }, {
                  value: "400+",
                  label: "Mil Seguidores"
                }].map(stat => <div key={stat.label} className="text-center">
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold" style={{
                    color: `hsl(${BRAND_TOKENS.primary})`
                  }}>
                        {stat.value}
                      </p>
                      <p className="text-[10px] sm:text-xs md:text-sm" style={{
                    color: `hsl(${BRAND_TOKENS.mutedForeground})`
                  }}>
                        {stat.label}
                      </p>
                    </div>)}
                </div>
              </div>

              <div className="text-center md:text-left">
                <h3 className="text-xl sm:text-2xl font-bold mb-1" style={{
                color: `hsl(${BRAND_TOKENS.foreground})`
              }}>
                  Matheus Dias
                </h3>
                <p className="font-medium mb-3 sm:mb-4 text-sm sm:text-base" style={{
                color: `hsl(${BRAND_TOKENS.primary})`
              }}>
                  Especialista em Tecnologia e Oportunidades Digitais
                </p>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm leading-relaxed" style={{
                color: `hsl(${BRAND_TOKENS.mutedForeground})`
              }}>
                  <p>
                    Com <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>mais de 4 anos de experiência</strong> e{" "}
                    <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>somando mais de 50 milhões de visualizações</strong> em seus vídeos,
                    Matheus Dias se tornou <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>um dos maiores especialistas do Brasil</strong> em{" "}
                    <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>"descomplicar a tecnologia e a vida"</strong> para milhões de pessoas.
                  </p>
                  <p>
                    Depois que seus <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>vídeos sobre benefícios do governo viralizaram</strong> e{" "}
                    <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>ajudaram milhões de brasileiros</strong>, ele percebeu que a falta de informação
                    era o maior obstáculo para as pessoas acessarem seus direitos.
                  </p>
                  <p>
                    Hoje, com uma <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>comunidade de mais de 400 mil seguidores</strong>, ele continua sua
                    missão de usar a tecnologia para <strong style={{
                    color: `hsl(${BRAND_TOKENS.foreground})`
                  }}>trazer conhecimento e poder para a palma da mão</strong> de
                    quem mais precisa.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </BrandCard>
      </motion.div>
    </div>
  </section>;

// FAQ Section
const FAQSection = () => <section className="py-10 md:py-24 px-4 sm:px-6" style={{
  background: `hsl(${BRAND_TOKENS.muted})`
}}>
    <div className="container max-w-3xl mx-auto px-0">
      <motion.h2 initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease
    }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12" style={{
      color: `hsl(${BRAND_TOKENS.foreground})`
    }}>
        Perguntas Frequentes
      </motion.h2>

      <motion.div initial={{
      opacity: 0,
      y: 20
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease
    }}>
        <Accordion type="single" collapsible defaultValue="item-0" className="space-y-2 sm:space-y-3">
          {FAQ_DATA.map((faq, index) => <AccordionItem key={index} value={`item-${index}`} className="px-3 sm:px-4" style={{
          background: `hsl(${BRAND_TOKENS.card})`,
          borderRadius: BRAND_TOKENS.radius,
          border: `1px solid hsl(${BRAND_TOKENS.border})`,
          boxShadow: BRAND_TOKENS.shadow
        }}>
              <AccordionTrigger className="text-left font-medium py-3 sm:py-4 hover:no-underline text-sm sm:text-base" style={{
            color: `hsl(${BRAND_TOKENS.foreground})`
          }}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-3 sm:pb-4 text-xs sm:text-sm" style={{
            color: `hsl(${BRAND_TOKENS.mutedForeground})`
          }}>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>)}
        </Accordion>
      </motion.div>
    </div>
  </section>;

// Combined Guarantee + Final CTA Section
const GuaranteeFinalSection = () => <section className="py-12 md:py-20 px-4 sm:px-6 overflow-x-hidden" style={{
  background: `hsl(${BRAND_TOKENS.background})`
}}>
    <div className="container max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center lg:items-center">
        {/* Left Column - Guarantee */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.6,
        ease
      }} className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex-shrink-0">
            <img src={getImageSrc(garantiaImage)} alt="Selo de garantia incondicional de 7 dias - devolução total do dinheiro" className="w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 object-contain" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4" style={{
            color: `hsl(${BRAND_TOKENS.foreground})`
          }}>
              Garantia Incondicional de 7 Dias
            </h2>
            <p style={{
            color: `hsl(${BRAND_TOKENS.mutedForeground})`
          }} className="leading-relaxed text-sm sm:text-base">
              Teste o material por 7 dias. Se não ficar 100% satisfeito, devolvemos seu dinheiro! 
              Sem perguntas, sem complicações. Sua satisfação é nossa prioridade e o risco é todo nosso!
            </p>
          </div>
        </motion.div>

        {/* Right Column - Não Perca */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.6,
        delay: 0.1,
        ease
      }}>
          <div className="rounded-2xl p-6 sm:p-8 lg:p-10 text-center" style={{
          background: `hsl(${BRAND_TOKENS.card})`,
          boxShadow: BRAND_TOKENS.shadow
        }}>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4" style={{
            color: `hsl(${BRAND_TOKENS.foreground})`
          }}>
              Não Perca Esta Oportunidade!
            </h2>
            <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{
            color: `hsl(${BRAND_TOKENS.mutedForeground})`
          }}>
              Pare de deixar dinheiro na mesa: são mais de 50 benefícios e direitos prontos para você acessar!
            </p>

            <ul role="list" className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 mb-6 sm:mb-8 text-xs sm:text-sm">
              <li className="flex items-center justify-center gap-2" aria-label="Oferta limitada">
                <Clock className="h-[18px] w-[18px] flex-shrink-0" style={{
                color: `hsl(${BRAND_TOKENS.red})`
              }} aria-hidden="true" />
                <span style={{
                color: `hsl(${BRAND_TOKENS.red})`
              }}>Oferta limitada - acaba em breve!</span>
              </li>
              <li className="flex items-center justify-center gap-2" aria-label="Garantia de 7 dias">
                <CheckCircle className="h-[18px] w-[18px] flex-shrink-0" style={{
                color: `hsl(${BRAND_TOKENS.green})`
              }} aria-hidden="true" />
                <span style={{
                color: `hsl(${BRAND_TOKENS.green})`
              }}>Garantia incondicional de 7 dias</span>
              </li>
            </ul>

            <div className="flex justify-center">
              <CTAButton href={useCheckoutLinks().premium} section="final-cta" plan="premium" aria-label="Garantir minha oferta agora com acesso imediato">
                QUERO GARANTIR MINHA OFERTA AGORA!
              </CTAButton>
            </div>

            <p className="text-[10px] sm:text-xs mt-4 sm:mt-6" style={{
            color: `hsl(${BRAND_TOKENS.mutedForeground})`
          }}>
              Acesso imediato • Pagamento 100% seguro • Garantia de 7 dias
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>;

// Sticky Mobile CTA
const StickyCTA = () => <div className="fixed bottom-0 left-0 right-0 p-3 backdrop-blur border-t z-40 md:hidden safe-area-inset" style={{
  background: `hsl(${BRAND_TOKENS.background} / 0.95)`,
  borderColor: `hsl(${BRAND_TOKENS.border})`,
  boxShadow: BRAND_TOKENS.shadowLg,
  paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
  paddingLeft: 'max(12px, env(safe-area-inset-left))',
  paddingRight: 'max(12px, env(safe-area-inset-right))'
}}>
    <CTAButton href={useCheckoutLinks().premium} section="sticky" plan="premium" size="default">
      QUERO AGORA!
    </CTAButton>
  </div>;

// ============================================
// MAIN PAGE COMPONENT
// ============================================

interface MapaDosBeneficiosProps {
  /** Sobrescreve o link do plano básico (ex.: páginas de afiliado). */
  checkoutBasico?: string;
  /** Sobrescreve o link do plano premium (ex.: páginas de afiliado). */
  checkoutPremium?: string;
  /** Slug do afiliado, se houver — usado para canonical/SEO opcional. */
  affiliateSlug?: string;
}

const MapaDosBeneficios = ({ checkoutBasico, checkoutPremium, affiliateSlug: _affiliateSlug }: MapaDosBeneficiosProps = {}) => {
  const links = React.useMemo(
    () => ({
      basico: checkoutBasico || DEFAULT_CHECKOUT_BASICO,
      premium: checkoutPremium || DEFAULT_CHECKOUT_PREMIUM,
    }),
    [checkoutBasico, checkoutPremium]
  );

  return <CheckoutLinksContext.Provider value={links}>
    <BrandThemeWrapper>
      <UrgencyBar />
      <HeroSection />
      <WhatYouReceiveSection />
      <WhyChooseSection />
      <BonusSection />
      <PricingSection />
      <TestimonialsSection />
      <AboutAuthorSection />
      <FAQSection />
      <GuaranteeFinalSection />
      {CONFIG.showStickyCta && <StickyCTA />}
    </BrandThemeWrapper>
  </CheckoutLinksContext.Provider>;
};
export default MapaDosBeneficios;
