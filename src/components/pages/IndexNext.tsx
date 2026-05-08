"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { HeroSection } from "@/components/sections/hero-section";
import { usePageSettings } from "@/hooks/usePageSettings";

// Lazy-load below-fold sections to prioritize hero LCP
const DualTrackSectionNext = lazy(() =>
  import("@/components/sections/dual-track-section-next").then((m) => ({
    default: m.DualTrackSectionNext,
  })),
);
const HomeProductsSectionNext = lazy(() =>
  import("@/components/sections/home-products-section-next").then((m) => ({
    default: m.HomeProductsSectionNext,
  })),
);
const HomeFaqSectionNext = lazy(() =>
  import("@/components/sections/home-faq-section-next").then((m) => ({
    default: m.HomeFaqSectionNext,
  })),
);
const SocialProofSection = lazy(() => import("@/components/sections/social-proof-section").then(m => ({ default: m.SocialProofSection })));
const FinalCtaSectionNext = lazy(() =>
  import("@/components/sections/final-cta-section-next").then((m) => ({
    default: m.FinalCtaSectionNext,
  })),
);

function DeferredHomeSections() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const load = () => setShouldLoad(true);
    const timeoutId = window.setTimeout(load, 4500);

    window.addEventListener("scroll", load, { once: true, passive: true });
    window.addEventListener("pointerdown", load, { once: true, passive: true });
    window.addEventListener("keydown", load, { once: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("scroll", load);
      window.removeEventListener("pointerdown", load);
      window.removeEventListener("keydown", load);
    };
  }, []);

  if (!shouldLoad) return <div className="min-h-[200px]" aria-hidden="true" />;

  return (
    <Suspense fallback={<div className="min-h-[200px]" aria-hidden="true" />}>
      <DualTrackSectionNext />
      <HomeProductsSectionNext />
      <HomeFaqSectionNext />
      <SocialProofSection />
      <FinalCtaSectionNext />
    </Suspense>
  );
}

export default function IndexNext() {
  const {
    headerTitle,
    headerDescription,
  } = usePageSettings("/");

  return (
    <main className="flex-1">
      <HeroSection
        headerTitle={headerTitle}
        headerDescription={headerDescription}
      />
      <DeferredHomeSections />
    </main>
  );
}
