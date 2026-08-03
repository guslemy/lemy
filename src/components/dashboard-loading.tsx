import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Se usa como loading.tsx en cada subruta de /dashboard. Sin esto, Next
// deja la página anterior congelada mientras espera las consultas a
// Supabase (varias de las páginas del dashboard hacen 2-3 queries), y para
// cuando el contenido nuevo llega, el fade de PageTransition ya pasó
// desapercibido — se sentía como si no hubiera animación. Este esqueleto
// aparece de inmediato al hacer click, dando feedback visual instantáneo,
// y PageTransition sigue encargándose del fade una vez que el contenido real
// está listo.
export function DashboardLoading() {
  return (
    <>
      <SiteHeader />
      <main className="px-6 py-16 sm:px-8 md:py-20">
        <div className="mx-auto max-w-[720px] animate-pulse">
          <div className="h-3 w-32 rounded-full bg-forest/10" />
          <div className="mt-3 h-8 w-64 rounded-full bg-forest/10" />
          <div className="signature-corner mt-8 rounded-[28px] border border-line bg-card p-7">
            <div className="h-3 w-24 rounded-full bg-forest/10" />
            <div className="mt-3 h-5 w-48 rounded-full bg-forest/10" />
            <div className="mt-4 h-4 w-full max-w-[420px] rounded-full bg-forest/10" />
            <div className="mt-2 h-4 w-full max-w-[340px] rounded-full bg-forest/10" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
