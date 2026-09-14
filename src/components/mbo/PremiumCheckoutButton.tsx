"use client";

import { useRef, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { PREMIUM_PRODUCT_KEY } from "@/lib/stripe-premium";
import styles from "./mbo.module.css";

export default function PremiumCheckoutButton() {
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey: PREMIUM_PRODUCT_KEY }), signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error("checkout_unavailable");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("invalid_checkout_url");
      window.location.assign(url.href);
    } catch {
      setError("Não foi possível abrir o pagamento. Tente novamente em instantes.");
      busy.current = false;
      setLoading(false);
    }
  }
  return <div>
    <button className={styles.primary} disabled={loading} aria-busy={loading} onClick={checkout}>
      {loading ? <>Abrindo pagamento… <LoaderCircle className={styles.checkoutSpinner} size={18} /></> : <>Garantir acesso vitalício <ArrowRight size={18} /></>}
    </button>
    {error && <p role="alert" className={styles.checkoutError}>{error}</p>}
  </div>;
}
