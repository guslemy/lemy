import { createServiceClient } from "@/lib/supabase/service";

// Terapeutas que YA subieron cédula e identificación y siguen esperando que
// el equipo los verifique (verification_status = 'pending'). Se calcula en
// vivo desde la base de datos, no desde notification_log: así el aviso sigue
// ahí hasta que se apruebe o rechace, aunque ya se haya "leído" la bandeja.
// Solo para admin (usa service client; quien llame debe haber comprobado el
// rol antes — ver site-header.tsx y dashboard/notificaciones/page.tsx).
export type PendingVerification = {
  id: string;
  displayName: string;
  submittedAt: string;
};

export async function getPendingVerifications(): Promise<PendingVerification[]> {
  const service = createServiceClient();

  const { data: creds } = await service
    .from("therapist_credentials")
    .select("therapist_id, tipo, created_at")
    .in("tipo", ["cedula", "identificacion"]);

  // Solo cuentan quienes tienen AMBOS documentos obligatorios.
  const byTherapist = new Map<string, { tipos: Set<string>; latest: string }>();
  for (const c of creds ?? []) {
    const entry = byTherapist.get(c.therapist_id) ?? { tipos: new Set<string>(), latest: c.created_at };
    entry.tipos.add(c.tipo);
    if (c.created_at > entry.latest) entry.latest = c.created_at;
    byTherapist.set(c.therapist_id, entry);
  }
  const readyIds = Array.from(byTherapist.entries())
    .filter(([, v]) => v.tipos.has("cedula") && v.tipos.has("identificacion"))
    .map(([id]) => id);
  if (readyIds.length === 0) return [];

  const { data: therapists } = await service
    .from("therapists")
    .select("id, display_name, verification_status")
    .in("id", readyIds)
    .eq("verification_status", "pending");

  // Los que llevan más tiempo esperando, primero.
  return (therapists ?? [])
    .map((t) => ({
      id: t.id as string,
      displayName: (t.display_name as string | null) || "Terapeuta sin nombre",
      submittedAt: byTherapist.get(t.id as string)!.latest,
    }))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}
