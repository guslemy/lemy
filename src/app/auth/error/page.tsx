export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">No pudimos iniciar tu sesión</h1>
      <p className="text-neutral-600">Intenta de nuevo. Si el problema sigue, contáctanos.</p>
      <a href="/" className="text-blue-700 underline">Volver al inicio</a>
    </main>
  );
}
