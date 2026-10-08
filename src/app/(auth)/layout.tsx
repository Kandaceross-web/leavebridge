import Link from "next/link";
import type { ReactNode } from "react";
import { Lockup } from "@/components/ui";
import { DevBanner } from "@/components/dev-banner";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DevBanner />
      <header className="app-header">
        <div className="container bar">
          <Lockup />
          <div className="end">
            <Link href="/crisis">Crisis resources</Link>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
    </>
  );
}
