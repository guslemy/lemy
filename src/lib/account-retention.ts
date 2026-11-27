// Plazo de conservación de cuentas archivadas (desactivadas).
//
// NOM-004-SSA3-2012: el expediente clínico se conserva mínimo 5 años contados
// desde el último acto médico. Se agrega un margen de seguridad. PENDIENTE de
// confirmar con el abogado — si cambia el plazo, solo se toca aquí.
//
// Una cuenta desactivada NO se borra ni se anonimiza: queda archivada. Cuando
// pasa este plazo desde su última actividad, solo aparece como "lista para
// revisión de eliminación" en el admin; borrar siempre es decisión humana.
export const RETENTION_YEARS = 5;
export const RETENTION_MARGIN_MONTHS = 6;

export type RetentionInfo = {
  lastActivity: Date;
  reviewOn: Date;
  readyForReview: boolean;
};

// Última actividad = la más reciente entre la desactivación, el último inicio
// de sesión y la última cita. Se reinicia sola si la cuenta se reactiva y se
// vuelve a usar (porque el último inicio de sesión se actualiza).
export function computeRetention(dates: (string | Date | null | undefined)[], nowMs: number): RetentionInfo | null {
  const times = dates
    .filter((d): d is string | Date => Boolean(d))
    .map((d) => new Date(d).getTime())
    .filter((t) => Number.isFinite(t));
  if (times.length === 0) return null;
  const lastActivity = new Date(Math.max(...times));
  const reviewOn = new Date(lastActivity);
  reviewOn.setFullYear(reviewOn.getFullYear() + RETENTION_YEARS);
  reviewOn.setMonth(reviewOn.getMonth() + RETENTION_MARGIN_MONTHS);
  return { lastActivity, reviewOn, readyForReview: reviewOn.getTime() <= nowMs };
}

export function formatRetentionDate(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
}
