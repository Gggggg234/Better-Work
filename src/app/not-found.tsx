import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="text-5xl font-bold">404</p>
      <p className="text-muted mt-3">No encontramos esta página.</p>
      <Link href="/app" className="btn-primary mt-6">Volver al inicio</Link>
    </main>
  );
}
