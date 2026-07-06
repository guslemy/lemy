# Instrucciones del Project — Northstar (plataforma de psicoterapeutas)

> Nombre provisional: **Northstar** (se cambiará después). Marketplace tipo Doctoralia enfocado en psicoterapeutas. Lanzamiento en el mercado de **Oaxaca**.

## Contexto
Construimos una **plataforma de dos lados** (terapeutas + pacientes) que acerca la terapia a la gente. Los **terapeutas pagan una mensualidad** por su perfil (modelo de negocio principal). Ya hay **mínimo 10 terapeutas listos** y una comunidad previa construida (**Psicowork**) para arrancar el lado de la oferta.

**Diferenciador central (la razón de ser):** la forma **moderna, clara, cálida y coloquial** de explicar la terapia a pacientes que nunca se han acercado a la psicología. Traducimos el bagaje técnico ("Gestalt", "cognitivo-conductual") a lenguaje humano y fácil. Objetivo: **reducir las barreras de acceso a la terapia mediante una experiencia clara**.
- **Para el paciente:** herramienta confiable para entender las opciones terapéuticas y encontrar al profesional más adecuado para su situación.
- **Para el terapeuta:** mostrar su experiencia, estudios y nicho de forma moderna y atractiva, respaldada por una estrategia comercial.

## Rol y reglas de trabajo
Aplica el manual base 300 webs (`GROUND_RULES_300WEBS.md`), con estas prioridades:
- Con Gustavo: **ultra-directo**, ejecuta sin preámbulos.
- **Seguridad de archivos:** nunca borrar ni sobrescribir a ciegas; cada cambio en versión nueva (`_v2`, `_v3`…); respaldo antes de editar; Gustavo aprueba la versión oficial; un ajuste a la vez.
- **Verifica que corra/renderice** antes de entregar cada versión.
- Datos sensibles (salud mental): la privacidad no es negociable. Todo dato clínico va con acceso restringido.

## Stack técnico (decidido, con razón)
- **Frontend + backend:** **Next.js (React)** — un solo proyecto para UI y API; va con el trabajo previo en React.
- **Base de datos + login + almacenamiento + seguridad:** **Supabase** (Postgres, Auth, Storage, Row-Level Security). Tramo gratis generoso; RLS es clave para proteger expedientes clínicos.
- **Pagos:** **Stripe** (ver sección de pagos).
- **Hosting:** **Vercel** (nativo para Next.js, tramo gratis, escala solo).
- **Meta:** gasto mínimo. Todo lo anterior arranca cerca de **$0** en el MVP y se paga solo al crecer.

## Pagos y tema fiscal (arquitectura clave)
- **Stripe Connect:** cada terapeuta conecta **su propia cuenta de Stripe**. El dinero de las **sesiones** cae **directo en la cuenta del terapeuta**, no en la de la plataforma. Así Gustavo **nunca recibe ni redistribuye** el dinero ajeno → se minimiza la exposición fiscal.
- **Mensualidad del perfil:** se cobra aparte con **Stripe Billing** en la cuenta de la plataforma.
- **Comisión por cita (opcional, futuro):** posible "application fee" que Stripe separa automáticamente.
- **Cobro por niveles:** planes de suscripción escalonados en Stripe (ej. plan base vs. plan con expediente clínico).
- ⚠️ **Recordatorio:** Claude no es asesor fiscal. Confirmar con un contador la facturación/IVA/retenciones en México antes de lanzar.

## Agenda / calendario (decidido, con razón)
- **La construimos nosotros** sobre Supabase (disponibilidad del terapeuta + reserva de cita del paciente). Motivo: Calendly u otros cobran **por usuario**, no escala para un marketplace, y no se integra con pagos/anticipos/confirmaciones.
- Cada terapeuta gestiona su propia disponibilidad.
- **Login con Google (OAuth):** el acceso a la plataforma es con cuenta de Google. Esto da, en el mismo login, el permiso al calendario del terapeuta → habilita la sincronización sin fricción.
- **Sincronización con Google Calendar: al final de la Fase 1** (no Fase 2), aprovechando el permiso obtenido en el login. Google es lo que más usan los clientes.
- Teleconsulta: para el MVP, el terapeuta indica su enlace (Zoom/Meet); videollamada integrada = Fase 2 (decisión a confirmar).

## Alcance por fases

### MVP (Fase 1)
- **Perfiles de terapeutas** con: contacto, áreas de especialización, enfoque terapéutico, nicho de clientes, descripción personal ("quién soy"), idiomas, estudios y experiencia clínica (cédula, másters, posgrados). Todo en **lenguaje coloquial** (diferenciador).
- **Verificación de credenciales** (cédula/títulos) como sello de confianza.
- **Buscador con filtros:** género, especialidad, enfoque terapéutico, costo, ubicación, y terapia en línea (sí/no).
- **Reserva de cita** con agenda propia.
- **Pago de sesión** vía Stripe Connect (a la cuenta del terapeuta).
- **Mensualidad del terapeuta** vía Stripe Billing.
- **Reseñas / calificaciones** de terapeutas.
- **Cuentas** para paciente y terapeuta (roles distintos), con **login de Google (OAuth)**.
- **Cierre de Fase 1:** sincronización con **Google Calendar** (aprovechando el permiso del login de Google).

### Fase 2 (después del MVP)
- **Expediente clínico** de pacientes (plan premium, dato sensible con RLS).
- Administración de sesiones, **anticipos**, **recordatorios y confirmaciones automatizadas** (email/WhatsApp).
- Videollamada integrada (teleconsulta dentro de la plataforma).
- **Biblioteca de conocimiento / cursos** para terapeutas (capacitaciones, videos de marca personal) — diferenciador importante.
- **Personaje/mascota** de marca para elevar la UX.

## Marca y diseño
- **Paleta:** azul petróleo + arena + blanco.
- **Estilo:** súper moderno y limpio, tipo **Apple / startup moderna**, que **transmita confianza** y se vea muy cool.
- **Personalidad:** alegre, con personalidad, que conecte de inmediato con las personas. (Personaje/mascota en Fase 2.)
- **Referencias:**
  - **Doctoralia** — excelente posicionamiento SEO (aspirar a eso).
  - **Neopraxis** — competencia directa; idea 10/10 pero página fea/saturada (superarla en claridad y diseño).
  - **Psychology Today** — similar, se ve vieja y aburrida (superarla en modernidad).

## Decisiones abiertas para confirmar en el Project
1. ¿Solo español al inicio? (asumido: sí.)
2. ¿MVP solo con mensualidad, sin comisión por cita? (asumido: sí; la comisión es opcional a futuro.)
3. Teleconsulta MVP: ¿enlace externo del terapeuta (recomendado) vs. integrada?
4. Categorías/enfoques terapéuticos exactos para los filtros (lista a definir con los 10 terapeutas).
5. Nombre y dominio definitivos (Northstar es provisional).

## Primeros pasos sugeridos al abrir el Project
1. Conectar una carpeta para el código del proyecto.
2. Definir el modelo de datos (terapeuta, paciente, cita, reseña, suscripción).
3. Montar el esqueleto Next.js + Supabase + Auth (roles paciente/terapeuta).
4. Construir primero el **perfil de terapeuta y el buscador** (el corazón del diferenciador), y de ahí crecer al agendamiento y pagos.
