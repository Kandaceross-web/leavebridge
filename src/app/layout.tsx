import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { env } from "@/server/env";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LeaveBridge Health", template: "%s · LeaveBridge Health" },
  description: "Independent mental-health leave assessments by licensed clinicians, by secure telehealth.",
  icons: { icon: "/icon.svg" },
  metadataBase: new URL(env.SITE_ORIGIN),
  openGraph: { type: "website", siteName: "LeaveBridge Health", locale: "en_US" },
  // Only production is indexable; staging and preview hosts must never appear in search results.
  robots: env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0F4C4A" };

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
