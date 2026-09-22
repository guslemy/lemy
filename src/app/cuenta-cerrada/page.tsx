import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function CuentaCerradaPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-6 py-20 sm:px-8 md:py-28">
        <div className="mx-auto max-w-[480px] text-center">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-rose-deep">Cuenta cerrada</p>
          <h1 className="mt-2.5 font-display text-[1.9rem] font-medium text-forest sm:text-[2.3rem]">
            Listo, tu cuenta quedó cerrada
          </h1>
          <p className="mt-4 text-[0.95rem] text-[#3E4B44]">
            Te mandamos un correo de confirmación. Gracias por haber sido parte de Lemy.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
