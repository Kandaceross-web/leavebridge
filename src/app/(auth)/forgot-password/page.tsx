import Link from "next/link";
import type { Metadata } from "next";
import { siteSettings } from "@/server/web/public";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage() {
  const { brand } = await siteSettings();
  return (
    <div className="auth-wrap">
      <div className="auth-card card stack">
        <h1>Reset your password</h1>
        <p className="muted">
          Self-service password reset is not available in this build yet. Please email{" "}
          <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> from the address on your
          account and our team will verify your identity before resetting access.
        </p>
        <Link href="/sign-in">Back to sign in</Link>
      </div>
    </div>
  );
}
