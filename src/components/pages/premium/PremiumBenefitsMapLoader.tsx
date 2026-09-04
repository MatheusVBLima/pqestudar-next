"use client";

import dynamic from "next/dynamic";

const PremiumBenefitsMapNext = dynamic(() => import("./PremiumBenefitsMapNext"), {
  ssr: false,
  loading: () => <div className="mx-auto min-h-[720px] w-full max-w-[1504px] animate-pulse bg-muted/30" />,
});

export default function PremiumBenefitsMapLoader() {
  return <PremiumBenefitsMapNext />;
}
