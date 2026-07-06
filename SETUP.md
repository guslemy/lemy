# Setup — cuentas pendientes

Tres cuentas por crear (todas gratis para arrancar). Cuando tengas cada dato, pégamelo en el chat y lo conecto.

## 1. Supabase
1. Ve a supabase.com → sign up (con tu Google está bien) → "New project".
2. Nombre: `northstar`. Región: la más cercana a México (si no hay una en México, usa la de EE.UU. más cercana). Guarda el password de la base de datos en un lugar seguro.
3. Cuando termine de aprovisionar (~2 min): Project Settings → API. Copia:
   - Project URL
   - `anon` `public` key
   - `service_role` key (secreta, no la compartas fuera de este proyecto)
4. Corre las migraciones que ya dejé en `supabase/migrations/` (te lo hago yo en cuanto tenga las llaves, usando el CLI de Supabase).

## 2. Google Cloud (OAuth + Calendar)
1. console.cloud.google.com → crea proyecto "Northstar".
2. APIs & Services → OAuth consent screen → External → nombre "Northstar", tu correo de soporte. Modo "Testing" está bien por ahora (no requiere revisión de Google todavía).
3. APIs & Services → Library → busca "Google Calendar API" → Enable.
4. APIs & Services → Credentials → Create Credentials → OAuth client ID → tipo "Web application".
   - Authorized redirect URI: lo da Supabase una vez creado el proyecto (Authentication → Providers → Google te muestra la URL exacta, algo como `https://<tu-proyecto>.supabase.co/auth/v1/callback`).
5. Copia Client ID y Client Secret → se pegan en Supabase (Authentication → Providers → Google), no en Vercel.
6. Mientras el consent screen esté en "Testing", agrega tu correo (y los de los 10 terapeutas piloto) como "Test users" para que puedan loguearse.

## 3. GitHub + Vercel
1. Crea un repo vacío y privado en GitHub: `northstar`.
2. En Vercel (vercel.com) → sign in con GitHub → "Add New Project" → importa el repo.
3. Antes de importar, yo hago el primer `git init` + commit local; tú solo agregas el remoto y haces push, o me pasas acceso y lo hago yo.
4. En Vercel, Environment Variables: copia las mismas del `.env.example`.

## Nota sobre el flujo de teleconsulta que pediste
Lo que describiste (bloquear agenda al pagar anticipo → crear evento + link de Google Meet → aparece en ambos calendarios → dashboard del terapeuta) requiere:
- El `scope` de Calendar en el login de Google (ya lo dejé pedido en el botón de login).
- Guardar el `refresh_token` de Google del terapeuta la primera vez que inicia sesión (dejé el TODO marcado en `src/app/auth/callback/route.ts`).
- Un endpoint que, cuando Stripe confirme el pago del anticipo (webhook), llame a la API de Google Calendar (`events.insert` con `conferenceData` para el Meet) usando ese refresh_token.
- Esto mueve la sincronización de Calendar de "cierre de Fase 1" a "parte del flujo de pago", que es justo lo que pediste. Lo construimos cuando lleguemos a agenda + pagos; el perfil/buscador va primero.
