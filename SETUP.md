# Setup — cuentas pendientes

Nombre oficial del proyecto: **Lemy**. Dominio y correo de Workspace ya en proceso — usa tu cuenta @lemy.com (no tu Gmail personal) para crear todo lo de abajo, en este orden.

## 0. Ya en proceso
- [x] Dominio `lemy.com` / `lemy.mx` — comprando.
- [x] Google Workspace — creando el usuario (ej. hola@lemy.com o gustavo@lemy.com).

## 1. Supabase
1. Entra a supabase.com con tu cuenta @lemy.com → "New project".
2. Nombre: `lemy`. Región: la más cercana a México (si no hay una en México, usa la de EE.UU. más cercana). Guarda el password de la DB en un lugar seguro.
3. Cuando termine de aprovisionar (~2 min): Project Settings → API. Copia:
   - Project URL
   - `anon` `public` key
   - `service_role` key (secreta, no la compartas fuera de este proyecto)
4. Pégame las tres — corro las migraciones de `supabase/migrations/` con el CLI de Supabase.

## 2. Google Cloud (OAuth + Calendar)
1. console.cloud.google.com, con tu cuenta @lemy.com → crea proyecto "Lemy".
2. APIs & Services → OAuth consent screen → **External** (no "Internal" — "Internal" solo dejaría entrar a cuentas @lemy.com, y tus pacientes/terapeutas usan sus propios Gmail). Nombre "Lemy", tu correo de soporte @lemy.com. Modo "Testing" está bien por ahora (no requiere revisión de Google todavía).
3. APIs & Services → Library → busca "Google Calendar API" → Enable.
4. En Supabase: Authentication → Providers → Google → copia la Redirect URL que te muestra ahí (algo como `https://tuproyecto.supabase.co/auth/v1/callback`).
5. De vuelta en Google Cloud: APIs & Services → Credentials → Create Credentials → OAuth client ID → "Web application" → pega esa Redirect URL en "Authorized redirect URIs".
6. Copia el Client ID y Client Secret que te da Google → pégalos en Supabase (mismo panel de Google Provider) y activa el provider.
7. En el consent screen, agrega tu correo y los de los 10 terapeutas piloto como "Test users" (mientras esté en modo Testing, solo esos correos pueden loguearse).

## 3. GitHub + Vercel
1. Crea un repo privado vacío en GitHub llamado `lemy` (no lo inicialices con README, ya tengo uno). Puedes usar tu GitHub personal o crear uno nuevo con el correo @lemy.com — cualquiera funciona, GitHub no depende del dominio.
2. Pégame la URL del repo — yo agrego el remoto y hago push del scaffold que ya está commiteado localmente.
3. vercel.com → sign in con GitHub → "Add New Project" → importa `lemy`.
4. En Vercel, Settings → Environment Variables: copia ahí las mismas variables del `.env.example` (las de Supabase que ya tienes, las de Stripe llegan después).

## Trademark
Búsqueda fonética en el IMPI (impi.gob.mx) para descartar marca registrada en México, antes de invertir más en identidad de marca completa (logo, etc.). No soy abogado — si quieres avanzar en serio, vale la pena una revisión profesional.

## Nota sobre el flujo de teleconsulta que pediste
Lo que describiste (bloquear agenda al pagar anticipo → crear evento + link de Google Meet → aparece en ambos calendarios → dashboard del terapeuta) requiere:
- El `scope` de Calendar en el login de Google (ya lo dejé pedido en el botón de login).
- Guardar el `refresh_token` de Google del terapeuta la primera vez que inicia sesión (dejé el TODO marcado en `src/app/auth/callback/route.ts`).
- Un endpoint que, cuando Stripe confirme el pago del anticipo (webhook), llame a la API de Google Calendar (`events.insert` con `conferenceData` para el Meet) usando ese refresh_token.
- Esto mueve la sincronización de Calendar de "cierre de Fase 1" a "parte del flujo de pago", que es justo lo que pediste. Lo construimos cuando lleguemos a agenda + pagos; el perfil/buscador va primero.
