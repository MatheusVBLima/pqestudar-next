"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import styles from "./mbo.module.css";

export default function PremiumCheckoutResult({ sessionId, provider = "stripe" }: { sessionId: string; provider?: "stripe" | "mercadopago" }) {
  const mercadoPago = provider === "mercadopago";
  const providerName = mercadoPago ? "Mercado Pago" : "Stripe";
  const [status, setStatus] = useState("pending");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    const controller = new AbortController();
    async function check() {
      try {
        const endpoint = mercadoPago ? `/api/mercado-pago/premium-status?reference=${encodeURIComponent(sessionId)}` : `/api/stripe/premium-status?session_id=${encodeURIComponent(sessionId)}`;
        const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 401) { setStatus("login_required"); return; }
        if (!response.ok) { setStatus("error"); return; }
        setStatus(data.status);
        if (data.status === "pending") {
          if (++count < 20) timer = setTimeout(check, mercadoPago ? 15000 : 3000);
          else setStatus("waiting");
        }
      } catch { if (!controller.signal.aborted) setStatus("error"); }
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [sessionId, attempt, mercadoPago]);
  const active = status === "active";
  const login = status === "login_required";
  const revoked = ["refunded", "canceled", "failed"].includes(status);
  const testPaid = status === "test_paid";
  const from = mercadoPago ? `/mbo-premium/sucesso?provider=mercadopago&reference=${encodeURIComponent(sessionId)}` : `/mbo-premium/sucesso?session_id=${encodeURIComponent(sessionId)}`;
  return <div className={styles.page}><main className={styles.checkoutResult}>
    {active ? <CheckCircle2 size={54} color="#77d7a8" /> : <Clock3 size={48} color="#d993d4" />}
    <span className={styles.eyebrow}>PQESTUDAR PREMIUM</span>
    <h1>{active ? "Seu Premium está liberado!" : testPaid ? "Pagamento de teste confirmado" : login ? "Entre para acompanhar seu acesso" : revoked ? "Este pagamento não libera acesso" : status === "error" ? "Não conseguimos consultar agora" : "Aguardando confirmação do pagamento"}</h1>
    <p aria-live="polite">{active ? "Acesso vitalício ativado. Seus próximos caminhos estão no Premium." : testPaid ? "A simulação foi concluída. Nenhuma cobrança real foi feita e este teste não libera acesso pago." : login ? (mercadoPago ? "Entre com a mesma conta do PqEstudar usada para iniciar a compra." : "Entre com Google usando o mesmo e-mail informado no checkout para vincular sua compra.") : revoked ? `Confira a situação do pagamento no ${providerName}. Se precisar, fale com o suporte do site.` : `O acesso será liberado após a confirmação do ${providerName}. Se já pagou, aguarde alguns instantes e use a conta da compra.`}</p>
    {active ? <a className={styles.primary} href="/premium">Entrar no Premium</a> : login ? <a className={styles.primary} href={`/login?from=${encodeURIComponent(from)}`}>Entrar com Google</a> : !revoked && !testPaid && <button className={styles.primary} onClick={() => setAttempt(value => value + 1)}>Verificar novamente</button>}
    <a className={styles.textLink} href="/mbo-premium">Voltar ao MBO</a>
  </main></div>;
}
