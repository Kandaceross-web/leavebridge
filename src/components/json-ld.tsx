import { headers } from "next/headers";

/**
 * Structured data for search engines. Inline scripts need the per-request CSP nonce. Content must
 * describe the service truthfully: no ratings, reviews, or outcome claims are ever emitted.
 */
export async function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Escape "<" so content can never close the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />;
}
