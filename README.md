# Northstar

Marketplace de psicoterapeutas para Oaxaca. Ver `INSTRUCCIONES_PROJECT_NORTHSTAR.md` (fuente de verdad del proyecto) y `SETUP.md` (cuentas pendientes: Supabase, Google Cloud, GitHub/Vercel).

## Stack
Next.js (App Router) + Supabase (DB/Auth/Storage) + Stripe (Connect + Billing) + Vercel. Login con Google.

## Desarrollo local
```bash
npm install
cp .env.example .env.local   # llenar con tus llaves de Supabase (ver SETUP.md)
npm run dev
```

## Estructura
- `src/app/` — rutas (home, `/buscar`, `/dashboard`, `/auth/callback`)
- `src/lib/supabase/` — clientes de Supabase (browser y server)
- `src/middleware.ts` — refresco de sesión en cada request
- `supabase/migrations/` — modelo de datos (correr con el CLI de Supabase una vez creado el proyecto)

## Estado
Esqueleto inicial: login con Google, modelo de datos completo (terapeuta, paciente, cita, reseña, suscripción), buscador placeholder sin filtros aún. Siguiente paso: perfil de terapeuta + filtros del buscador.
