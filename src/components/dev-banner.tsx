import { env } from "@/server/env";

/** Visible on every non-production page so nobody mistakes fixtures or placeholder text for the real thing. */
export function DevBanner() {
  if (env.APP_ENV === "production") return null;
  return (
    <div className="dev-banner" role="note">
      {env.APP_ENV.toUpperCase()} BUILD · fictional data only · legal and clinical text is
      placeholder pending review
    </div>
  );
}
