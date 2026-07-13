import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // www.micobra.es sirve el mismo contenido que el apex (duplicado para SEO):
  // 301 al dominio canónico conservando ruta y query.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.micobra.es" }],
        destination: "https://micobra.es/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
