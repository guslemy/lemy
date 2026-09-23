import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabase/server";
import { hasGestionaPlan } from "@/lib/plan-features";
import {
  getClinicalProfile,
  getClinicalHistory,
  listSessionNotes,
  listEvaluations,
} from "@/lib/clinical-record";

// Exportación del expediente de UN paciente a PDF — disponible en todos los
// planes (a diferencia del resto de la ficha, exclusiva de Gestiona), a
// petición explícita de Gustavo: un terapeuta debe poder descargar el
// historial de un paciente aunque cierre su cuenta o cambie de plan, y es
// justo lo que la NOM-004-SSA3-2012 lo obliga a conservar.
//
// pdfkit genera el PDF en el propio servidor (sin navegador headless tipo
// Puppeteer, que en Vercel suele dar problemas) — se arma en memoria y se
// regresa como respuesta directa, sin guardar nada en Storage.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileRow?.role !== "therapist") return new Response("No autorizado", { status: 403 });

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("therapist_id", user.id)
    .eq("patient_id", patientId);
  if (!count) return new Response("No encontrado", { status: 404 });

  const [profile, history, sessionNotes, evaluations, therapistRow] = await Promise.all([
    getClinicalProfile(supabase, user.id, patientId),
    getClinicalHistory(supabase, user.id, patientId),
    listSessionNotes(supabase, user.id, patientId),
    listEvaluations(supabase, user.id, patientId),
    supabase.from("therapists").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  const finalizedNotes = sessionNotes.filter((n) => n.status === "final");
  const patientName = profile?.fullName ?? "Paciente";
  const therapistName = (therapistRow.data?.display_name as string) ?? "Terapeuta";
  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const doc = new PDFDocument({ margin: 50, size: "letter" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const H1 = () => doc.fontSize(18).fillColor("#21382B").font("Helvetica-Bold");
  const H2 = () => doc.fontSize(12).fillColor("#21382B").font("Helvetica-Bold");
  const LABEL = () => doc.fontSize(9).fillColor("#C1786A").font("Helvetica-Bold");
  const BODY = () => doc.fontSize(10).fillColor("#182420").font("Helvetica");

  function field(label: string, value?: string | null) {
    if (!value) return;
    LABEL().text(label.toUpperCase());
    BODY().text(value, { paragraphGap: 10 });
  }

  H1().text(`Expediente clínico — ${patientName}`);
  doc.moveDown(0.2);
  BODY().text(`${therapistName} · Exportado el ${fecha} · Lemy`);
  doc.moveDown(1.2);

  H2().text("Datos generales");
  doc.moveDown(0.4);
  field("Nombre completo", profile?.fullName);
  field("Fecha de nacimiento", profile?.birthDate);
  field("Teléfono", profile?.phone);
  field("Correo electrónico", profile?.email);
  field("Ocupación", profile?.occupation);
  field("¿Cómo llegó a la consulta?", profile?.referralSource);
  field("Dirección", profile?.address);
  field("Contacto de emergencia", profile?.emergencyContactName);
  field("Relación", profile?.emergencyContactRelationship);
  field("Teléfono de emergencia", profile?.emergencyContactPhone);

  doc.addPage();
  H2().text("Historia clínica");
  doc.moveDown(0.4);
  const h = history?.content ?? {};
  field("Motivo de consulta (detallado)", h.motivoDetallado);
  field("Antecedentes personales relevantes", h.antecedentesPersonales);
  field("Antecedentes familiares relevantes", h.antecedentesFamiliares);
  field("Antecedentes psicológicos y/o psiquiátricos", h.antecedentesPsicologicosPsiquiatricos);
  field("Antecedentes médicos relevantes", h.antecedentesMedicos);
  field("Tratamientos previos o actuales", h.tratamientosPreviosActuales);
  field("Tratamiento psiquiátrico actual", h.tratamientoPsiquiatricoActual);
  field("Medicación actual", h.medicacionActual);
  field("Antecedentes del desarrollo", h.antecedentesDelDesarrollo);
  field("Historia escolar y/o laboral", h.historiaEscolarLaboral);
  field("Relaciones interpersonales y red de apoyo", h.relacionesInterpersonales);
  field("Acontecimientos vitales significativos", h.acontecimientosVitalesSignificativos);
  field("Hábitos y estilo de vida relevantes", h.habitosEstiloDeVida);
  field("Evaluaciones o diagnósticos previos reportados", h.evaluacionesDiagnosticosPrevios);
  field("Observaciones / impresión clínica inicial", h.observacionesImpresionClinica);
  field("Factores de riesgo y factores protectores", h.factoresDeRiesgoProtectores);
  field("Objetivos terapéuticos acordados", h.objetivosTerapeuticos);
  field("Plan terapéutico", h.planTerapeutico);
  field("Información adicional relevante", h.informacionAdicional);

  if (finalizedNotes.length > 0) {
    doc.addPage();
    H2().text("Notas de sesión");
    doc.moveDown(0.4);
    for (const note of finalizedNotes) {
      LABEL().text(
        `SESIÓN ${note.sessionNumber} · ${new Date(note.createdAtIso).toLocaleDateString("es-MX")}${
          note.riskLevel !== "ninguno" ? ` · RIESGO: ${note.riskLevel.toUpperCase()}` : ""
        }`
      );
      if (note.enfoqueFamilia) BODY().text(`Enfoque: ${note.enfoqueFamilia}`);
      if (note.content?.foco) BODY().text(`Foco: ${note.content.foco}`);
      if (note.content?.observaciones) BODY().text(note.content.observaciones);
      if (note.content?.intervenciones) BODY().text(`Intervenciones: ${note.content.intervenciones}`);
      if (note.content?.acuerdos) BODY().text(`Acuerdos: ${note.content.acuerdos}`);
      for (const f of note.content?.camposDinamicos ?? []) {
        BODY().text(`${f.nombre}: ${f.valor}`);
      }
      for (const a of note.content?.addenda ?? []) {
        BODY().text(`Nota complementaria (${new Date(a.fechaIso).toLocaleDateString("es-MX")}, ${a.autor}): ${a.texto}`);
      }
      doc.moveDown(0.8);
    }
  }

  if (evaluations.length > 0) {
    doc.addPage();
    H2().text("Evaluaciones");
    doc.moveDown(0.4);
    for (const ev of evaluations) {
      LABEL().text(`${ev.instrumento.toUpperCase()} · ${new Date(ev.fechaIso).toLocaleDateString("es-MX")}`);
      if (ev.content?.puntaje) BODY().text(`Puntaje: ${ev.content.puntaje}`);
      if (ev.content?.interpretacion) BODY().text(ev.content.interpretacion, { paragraphGap: 10 });
    }
  }

  doc.end();
  const buffer = await done;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="expediente-${patientName.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
