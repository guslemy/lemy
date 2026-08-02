import Stripe from "stripe";

// Cliente de servidor — nunca importar esto desde un componente de cliente.
//
// OJO: antes esto era `export const stripe = new Stripe(...)` instanciado
// al importar el módulo. Eso hace que Next.js truene TODO el build en
// Vercel ("Neither apiKey nor config.authenticator provided") en el paso
// de "Collecting page data" si STRIPE_SECRET_KEY no está disponible en ese
// momento — aunque el webhook nunca se llegue a ejecutar. Con una función
// diferida, el cliente solo se crea cuando de verdad se usa (en tiempo de
// request), no al cargar el módulo durante el build.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Falta la variable de entorno STRIPE_SECRET_KEY.");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// IDs de los objetos de Stripe (Productos/Precios/Cupón) — se crean una vez
// desde el Dashboard de Stripe (no vía API, para no depender de red saliente
// en este entorno) y se pegan aquí como variables de entorno.
export const STRIPE_PRICE_BASE = process.env.STRIPE_PRICE_BASE!;
export const STRIPE_PRICE_PLUS = process.env.STRIPE_PRICE_PLUS!;
export const STRIPE_COUPON_FOUNDER = process.env.STRIPE_COUPON_FOUNDER;

export const FOUNDING_MEMBER_LIMIT = 30;
export const TRIAL_DAYS = 15;
