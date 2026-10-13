import type { SupabaseClient } from "@supabase/supabase-js";

// Elimina por completo la conexión de Google de un usuario: primero le pide
// a Google que revoque el token (así deja de servir aunque alguien lo
// tuviera), y luego borra el secreto cifrado de Vault y su registro (ver
// migración 0044). Se llama al cerrar la cuenta (terapeuta o paciente).
//
// Todo es "mejor esfuerzo" y nunca truena: cerrar la cuenta no debe fallar
// porque Google no respondió. Si la revocación falla, de todos modos se borra
// el token de nuestro lado, que es lo que importa para la retención.
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export async function purgeGoogleToken(serviceClient: SupabaseClient, userId: string): Promise<void> {
  try {
    const { data: refreshToken } = await serviceClient.rpc("get_google_refresh_token", {
      p_user_id: userId,
    });

    if (refreshToken) {
      try {
        await fetch(REVOKE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: refreshToken as string }),
        });
      } catch (err) {
        console.error("No se pudo revocar el token de Google (se borra de todos modos):", err);
      }
    }

    const { error } = await serviceClient.rpc("delete_google_refresh_token", { p_user_id: userId });
    if (error) {
      console.error("No se pudo borrar el token de Google:", error.message);
    }
  } catch (err) {
    console.error("Error limpiando el token de Google al cerrar cuenta:", err);
  }
}
