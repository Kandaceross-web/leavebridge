import type { MetadataRoute } from "next";
import { env, isIndexable } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal", "/ops", "/start", "/sign-in", "/sign-up", "/api", "/r/"],
    },
    sitemap: `${env.SITE_ORIGIN.replace(/\/$/, "")}/sitemap.xml`,
  };
}
