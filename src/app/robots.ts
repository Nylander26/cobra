import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Superficie privada o con token: nada que indexar.
        disallow: ["/dashboard", "/api/", "/pagada/"],
      },
    ],
    sitemap: "https://micobra.es/sitemap.xml",
  };
}
