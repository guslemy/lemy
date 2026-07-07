import { GoogleLoginButton } from "@/components/google-login-button";
import { EmailAuthForm } from "@/components/email-auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5f1e8] p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[#0f3d3e]">Entra a Lemy</h1>
        <p className="text-sm text-neutral-600">
          Con Google o con tu correo — lo que se te haga más fácil.
        </p>
      </div>

      <GoogleLoginButton />

      <div className="flex w-full max-w-sm items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-300" />
        o con tu correo
        <div className="h-px flex-1 bg-neutral-300" />
      </div>

      <EmailAuthForm />
    </main>
  );
}
