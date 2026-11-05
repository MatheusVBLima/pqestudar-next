export default function Loading() {
  return <main className="grid min-h-[60svh] w-full place-items-center px-6 py-12" aria-busy="true" aria-label="Carregando autores">
    <div role="status">
      <span className="sr-only">Carregando perfil do autor…</span>
      <div className="relative grid h-16 w-16 place-items-center" aria-hidden="true">
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full text-primary/10" fill="none">
          <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="3" />
        </svg>
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full animate-spin text-primary [animation-duration:1.4s] motion-reduce:animate-none" fill="none">
          <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="55 128" />
        </svg>
        <img src="/favicon.png" width={40} height={40} alt="" className="h-10 w-10 object-contain" />
      </div>
    </div>
  </main>;
}
