import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { MetaPixel } from "@/components/meta-pixel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display editorial de la marca: titulares y wordmark.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://micobra.es"),
  title: {
    default: "Cobra — Recordatorios de cobro para autónomos",
    template: "%s · Cobra",
  },
  description:
    "Recordatorios de pago automáticos, educados y en tu nombre. Cobra persigue tus facturas vencidas hasta que se pagan, con el interés de demora de la Ley 3/2004 calculado solo.",
  verification: {
    // Google Search Console — propiedad micobra.es
    google: "qCwL6DmjaJsME0GngzFHFS81pYHYANrxclTjiyrbCiE",
    // Meta Business — verificación del dominio. Sin dominio verificado no se
    // pueden priorizar eventos (AEM) y la optimización en iOS va a ciegas.
    // Vive en env porque el token lo da Meta al crear el portfolio; si no está,
    // no se emite la etiqueta.
    ...(process.env.META_DOMAIN_VERIFICATION
      ? {
          other: {
            "facebook-domain-verification":
              process.env.META_DOMAIN_VERIFICATION,
          },
        }
      : {}),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* El banner lee la cookie solo en el navegador: no fuerza dinamismo. */}
        <ConsentBanner />
        {/* El píxel sí usa usePathname() (un PageView por navegación), que es
            un valor de request. Aislado en su propio Suspense, el resto de la
            página se sigue prerenderizando; el fallback es null porque este
            componente no pinta nada. */}
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
