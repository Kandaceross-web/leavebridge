import "server-only";
import { isPublicPreview } from "@/server/env";

/**
 * Href for a link from a public page into the app (screening, sign-in). The static public preview has no app behind it,
 * so those links go to /opening-soon instead.
 */
export const appHref = (href: string) => (isPublicPreview ? "/opening-soon" : href);
