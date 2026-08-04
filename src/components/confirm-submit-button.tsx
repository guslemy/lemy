"use client";

// Botón de submit con un paso extra de confirmación (window.confirm) antes
// de dejar pasar el envío — mismo patrón ya usado en therapist-profile-form.tsx
// para el guardado sin modalidad. Se usa para acciones destructivas/sensibles
// como desactivar una cuenta desde /dashboard/admin.
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
