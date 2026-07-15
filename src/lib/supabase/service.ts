import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la service_role key — ignora RLS por completo.
// SOLO usar en código de servidor (route handlers, server actions).
// NUNCA importar esto desde un componente de cliente ni exponer el resultado
// al navegador: la service_role key da acceso total a la base de datos.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
