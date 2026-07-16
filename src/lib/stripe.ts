import Stripe from "stripe";

// Cliente de servidor — nunca importar esto desde un componente de cliente.
// Una sola instancia reutilizada entre server actions / route handlers.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// IDs de los objetos de Stripe (Productos/Precios/Cupón) — se crean una vez
// desde el Dashboard de Stripe (no vía API, para no depender de red saliente
// en este entorno) y se pegan aquí como variables de entorno.
export const STRIPE_PRICE_BASE = process.env.STRIPE_PRICE_BASE!;
export const STRIPE_PRICE_PLUS = process.env.STRIPE_PRICE_PLUS!;
export const STRIPE_COUPON_FOUNDER = process.env.STRIPE_COUPON_FOUNDER;

export const FOUNDING_MEMBER_LIMIT = 30;
export const TRIAL_DAYS = 15;
