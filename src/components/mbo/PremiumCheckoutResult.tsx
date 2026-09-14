"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import styles from "./mbo.module.css";

export default function PremiumCheckoutResult({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState("pending");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    const controller = new AbortController();
    async function check() {
      try {
        const response = await fetch(`/api/stripe/premium-status?session_id=${encodeURIComponent(sessionId)}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 401) { setStatus("login_required"); return; }
        if (!response.ok) { setStatus("error"); return; }
        setStatus(data.status);
        if (data.status === "pending") {
          if (++count < 20) timer = setTimeout(check, 3000);
          else setStatus("waiting");
        }
      } catch { if (!controller.signal.aborted) setStatus("error"); }
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [sessionId, attempt]);
  const active = status === "active";
  const login = status === "login_required";
  const revoked = ["refunded", "canceled", "failed"].includes(status);
  const from = `/mbo-premium/sucesso?session_id=${encodeURIComponent(sessionId)}`;
  return <div className={styles.page}><main className={styles.checkoutResult}>
    {active ? <CheckCircle2 size={54} color="#77d7a8" /> : <Clock3 size={48} color="#d993d4" />}
    <span className={styles.eyebrow}>PQESTUDAR PREMIUM</span>
    <h1>{active ? "Seu Premium está liberado!" : login ? "Entre para acompanhar seu acesso" : revoked ? "Este pagamento não libera acesso" : status === "error" ? "Não conseguimos consultar agora" : "Aguardando confirmação do pagamento"}</h1>
    <p aria-live="polite">{active ? "Acesso vitalício ativado. Seus próximos caminhos estão no Premium." : login ? "Entre com Google usando o mesmo e-mail informado no checkout para vincular sua compra." : revoked ? "Confira a situação do pagamento na Stripe. Se precisar, fale com o suporte do site." : "O acesso será liberado após a confirmação da Stripe. Se já pagou, aguarde alguns instantes e use a conta com o e-mail da compra."}</p>
    {active ? <a className={styles.primary} href="/premium">Entrar no Premium</a> : login ? <a className={styles.primary} href={`/login?from=${encodeURIComponent(from)}`}>Entrar com Google</a> : !revoked && <button className={styles.primary} onClick={() => setAttempt(value => value + 1)}>Verificar novamente</button>}
    <a className={styles.textLink} href="/mbo-premium">Voltar ao MBO</a>
  </main></div>;
}
