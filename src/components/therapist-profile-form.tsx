"use client";

// Envuelve el formulario de perfil solo para poder interceptar el submit:
// si el terapeuta va a guardar con las dos modalidades desmarcadas (ni en
// línea ni presencial), confirmamos con un popup antes de dejarlo pasar —
// su perfil seguiría existiendo, solo mostraría "agenda llena por ahora" en
// vez de desaparecer, pero mejor avisar antes de que pase sin querer.
export function ProfileForm({
  action,
  children,
}: {
  action: (formData: FormData) => void;
  children: React.ReactNode;
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const online = formData.get("is_online_available") === "on";
    const presencial = formData.get("is_in_person_available") === "on";

    if (!online && !presencial) {
      const ok = window.confirm(
        "Vas a guardar sin ninguna modalidad marcada. Tu perfil se va a mostrar como \"agenda llena por ahora\" y nadie va a poder reservarte hasta que marques al menos una. ¿Seguro que quieres continuar?"
      );
      if (!ok) {
        e.preventDefault();
      }
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="mt-8 space-y-8">
      {children}
    </form>
  );
}
