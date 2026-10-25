"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-2xl font-bold">Não foi possível carregar os autores</h1><p className="mt-3 text-muted-foreground">Tente novamente em alguns instantes.</p><button onClick={reset} className="mt-6 rounded-lg bg-primary px-5 py-3 text-primary-foreground">Tentar novamente</button></main>;
}
