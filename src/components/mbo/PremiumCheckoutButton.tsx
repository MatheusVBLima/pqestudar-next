"use client";

import { useRef, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import styles from "./mbo.module.css";

export default function PremiumCheckoutButton() {
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      requestId.current ||= crypto.randomUUID();
      const response = await fetch("/api/mercado-pago/create-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current }), signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign(`/login?from=${encodeURIComponent("/mbo-premium#premium")}`);
        return;
      }
      if (response.ok && data.status === "finished") {
        window.location.assign(`/mbo-premium/sucesso?provider=mercadopago&reference=${requestId.current}`);
        return;
      }
      if (!response.ok || typeof data.url !== "string") throw new Error("checkout_unavailable");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || !["www.mercadopago.com.br", "sandbox.mercadopago.com.br"].includes(url.hostname)
        || url.username || url.password || url.port || !url.pathname.startsWith("/checkout/")) throw new Error("invalid_checkout_url");
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
