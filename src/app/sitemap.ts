import type { MetadataRoute } from "next";
import { env } from "@/server/env";
import { legalPages } from "@/server/web/public";

export const dynamic = "force-dynamic";

const origin = () => env.SITE_ORIGIN.replace(/\/$/, "");

const PAGES = ["", "/how-it-works", "/services", "/pricing", "/employers", "/faq", "/contact", "/about", "/availability", "/crisis"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const legal = await legalPages();
  return [
    ...PAGES.map((p) => ({ url: `${origin()}${p || "/"}` })),
    ...legal.map((l) => ({ url: `${origin()}/legal/${l.key.replace(/^legal\./, "")}` })),
  ];
}
