import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, FileCheck2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Compra recebida | Certificado que Conta",
  description: "Confirmação de compra do Certificado que Conta.",
  robots: { index: false, follow: false },
};

export default function CertificadoQueContaSuccessPage() {
  return (
    <main className="min-h-screen bg-[#171417] px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center">
        <div className="w-full rounded-3xl border border-fuchsia-400/25 bg-[#241f25] p-7 text-center shadow-[0_24px_80px_rgba(226,59,232,0.12)] sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-fuchsia-400/12 px-3 py-1 text-xs font-black uppercase text-fuchsia-300">
            <FileCheck2 className="h-4 w-4" />
            Certificado que Conta
          </p>

          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
            Compra iniciada com sucesso
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-zinc-300 sm:text-base">
            Assim que o Stripe confirmar o pagamento, seu acesso será registrado no PqEstudar.
            Se você pagou por Pix, a confirmação pode levar alguns instantes.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href="/salvos"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(16,185,129,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-400"
            >
              Ir para Salvos
            </Link>
            <Link
              href="/certificado-que-conta"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Voltar para a página
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
