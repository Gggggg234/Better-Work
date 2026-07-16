"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-3xl font-bold">Algo salió mal</p>
      <p className="text-muted mt-3 max-w-sm">Tuvimos un problema al procesar tu pedido. Probá de nuevo en un momento.</p>
      <button onClick={reset} className="btn-primary mt-6">Reintentar</button>
    </main>
  );
}
