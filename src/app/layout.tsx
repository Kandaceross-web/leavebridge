import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LeaveBridge Health", template: "%s · LeaveBridge Health" },
  description: "Independent mental-health leave assessments by licensed clinicians, by secure telehealth.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#15233B" };

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
