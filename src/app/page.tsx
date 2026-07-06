import Link from "next/link";
import { GoogleLoginButton } from "@/components/google-login-button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#f5f1e8] p-8 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-[#0f3d3e]">Northstar</h1>
        <p className="max-w-md text-lg text-neutral-700">
          Encuentra al psicoterapeuta que se siente correcto para ti. Sin jerga
          complicada, en tu idioma de todos los días.
        </p>
      </div>

      {user ? (
        <Link
          href="/buscar"
          className="rounded-full bg-[#0f3d3e] px-8 py-3 font-medium text-white transition hover:opacity-90"
        >
          Ir al buscador
        </Link>
      ) : (
        <GoogleLoginButton />
      )}
    </main>
  );
}
