import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { env, isIndexable } from "@/server/env";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LeaveBridge Health", template: "%s · LeaveBridge Health" },
  description:
    "Independent mental-health leave assessments by licensed clinicians, by secure telehealth.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL(env.SITE_ORIGIN),
  openGraph: { type: "website", siteName: "LeaveBridge Health", locale: "en_US" },
  // Only production (or a signed-off public preview) is indexable; staging and preview hosts never appear in search results.
  robots: isIndexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F7F3EC" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Every page renders per request: the CSP nonce in src/proxy.ts and live settings (prices, active states) need it.
  await connection();
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
