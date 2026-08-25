// Íconos de redes sociales — usados en el hero estilo "link in bio" del
// perfil público del terapeuta (justo debajo de la foto).

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M14.5 8.5H16V6h-1.5C12.6 6 11.3 7.3 11.3 9.3V11H9.5v3h1.8v7h3v-7h2.1l.4-3h-2.5V9.5c0-.6.2-1 1-1z" />
    </svg>
  );
}

export function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.4 2.2 1.8 3.6 4 3.9v2.6c-1.4 0-2.7-.4-3.9-1.2v6.4c0 3-2.4 5.3-5.3 5.3S6 17.7 6 14.7c0-2.9 2.3-5.3 5.2-5.3.3 0 .6 0 .9.1v2.7c-.3-.1-.6-.2-.9-.2-1.4 0-2.6 1.2-2.6 2.7s1.2 2.7 2.6 2.7 2.7-1.1 2.7-2.7V3h2.6z" />
    </svg>
  );
}

// No es un ícono social, pero vive aquí junto a los demás — mismo estilo
// (outline, currentColor) usado en el toggle de notificaciones del
// dashboard, en vez del emoji 🔔 que se veía fuera de tono con la paleta.
export function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L2.8 21.2l4.6-1.3A9.2 9.2 0 1 0 12 2.8zm0 1.7a7.5 7.5 0 0 1 6.4 11.4l-.2.3.7 2.5-2.6-.7-.3.2A7.5 7.5 0 1 1 12 4.5zm-3.2 4c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.5 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.1-.2 0-.4.1-.5.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4z" />
    </svg>
  );
}
