# Plantillas de correo de Supabase Auth (con la marca de Lemy)

Estos correos NO salen del código de Lemy: los manda Supabase. Hay que pegar cada
plantilla a mano en el panel de Supabase.

Panel: Authentication -> Emails (o "Email Templates") -> elegir la plantilla ->
pegar el asunto en "Subject" y el contenido en "Message body" (modo HTML) -> Save.

| Plantilla de Supabase | Archivo | Asunto (Subject) |
|---|---|---|
| Confirm sign up | confirm-signup.html | Confirma tu correo en Lemy |
| Invite user | invite.html | Te invitaron a Lemy |
| Magic link | magic-link.html | Tu enlace para entrar a Lemy |
| Change email address | email-change.html | Confirma tu nuevo correo en Lemy |
| Reset password | recovery.html | Restablece tu contraseña de Lemy |
| Reauthentication | reauthentication.html | Tu código de verificación de Lemy |

Las variables entre llaves dobles ({{ .ConfirmationURL }}, {{ .NewEmail }}, {{ .Token }})
son de Supabase: no se tocan.

## IMPORTANTE: cómo arman el link estas plantillas

El código de Lemy confirma cuentas en /auth/confirm, que espera `token_hash` y
`type` en la URL (y es ahí donde se crea el perfil del usuario). Por eso las
plantillas de confirmar cuenta, magic link, cambio de correo e invitación usan
`{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=...` en vez de
`{{ .ConfirmationURL }}` (que mandaba a una ruta que no entiende ese formato y
mostraba "No pudimos iniciar tu sesión").

La plantilla de "Reset password" se queda con {{ .ConfirmationURL }} porque la
app todavía no tiene pantalla para cambiar contraseña.
