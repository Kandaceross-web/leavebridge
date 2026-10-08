import Link from "next/link";
import type { Metadata } from "next";
import { Lockup } from "@/components/ui";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="auth-wrap">
      <div className={`auth-card card stack text-center ${styles.centered}`}>
        <Lockup />
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist or is no longer available.</p>
        <div className={`btn-row ${styles.centerRow}`}>
          <Link href="/" className="btn btn-primary">
            Go to the home page
          </Link>
          <Link href="/contact" className="btn btn-quiet">
            Contact us
          </Link>
        </div>
        <p className="small muted">
          Not an emergency service. If you are in crisis, see <Link href="/crisis">crisis resources</Link>.
        </p>
      </div>
    </main>
  );
}
