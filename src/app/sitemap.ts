import type { MetadataRoute } from "next";
import { env } from "@/server/env";
import { legalPages, publishedResources, statePages } from "@/server/web/public";

export const dynamic = "force-dynamic";

const origin = () => env.SITE_ORIGIN.replace(/\/$/, "");

const PAGES = ["", "/how-it-works", "/services", "/pricing", "/employers", "/faq", "/resources", "/contact", "/about", "/availability", "/crisis"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [legal, resources, states] = await Promise.all([legalPages(), publishedResources(), statePages()]);
  return [
    ...PAGES.map((p) => ({ url: `${origin()}${p || "/"}` })),
    ...resources.map((r) => ({ url: `${origin()}/resources/${r.key.replace(/^resource\./, "")}`, lastModified: r.updatedAt })),
    ...states.map((s) => ({ url: `${origin()}/states/${s.slug}`, lastModified: s.updatedAt })),
    ...legal.map((l) => ({ url: `${origin()}/legal/${l.key.replace(/^legal\./, "")}` })),
  ];
}
