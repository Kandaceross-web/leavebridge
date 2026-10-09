import { env, isPublicPreview } from "@/server/env";

/** Visible on every non-production page so nobody mistakes fixtures or placeholder text for the real thing. */
export function DevBanner() {
  if (isPublicPreview) {
    return (
      <div className="dev-banner preview-banner" role="note">
        Opening soon: LeaveBridge Health is not booking assessments yet.
      </div>
    );
  }
  if (env.APP_ENV === "production") return null;
  return (
    <div className="dev-banner" role="note">
      {env.APP_ENV.toUpperCase()} BUILD · fictional data only · legal and clinical text is
      placeholder pending review
    </div>
  );
}
