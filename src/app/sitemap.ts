import type { MetadataRoute } from "next";

// Solo la superficie pública indexable. Sin lastModified: no hay fechas de
// edición fiables por ruta y una fecha inventada (new Date()) es peor que
// ninguna — además rompería la regla de cacheComponents.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://micobra.es";
  return [
    { url: base, priority: 1 },
    { url: `${base}/calculadora-intereses-demora`, priority: 0.9 },
    { url: `${base}/carta-reclamacion-factura-impagada`, priority: 0.9 },
    { url: `${base}/signup`, priority: 0.5 },
    { url: `${base}/legal/aviso-legal`, priority: 0.1 },
    { url: `${base}/legal/privacidad`, priority: 0.1 },
    { url: `${base}/legal/condiciones`, priority: 0.1 },
  ];
}
