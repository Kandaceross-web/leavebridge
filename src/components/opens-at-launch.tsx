import type { ReactNode } from "react";
import { isPublicPreview } from "@/server/env";

/** Wraps a form on a public page. The static public preview can't receive submissions, so it shows a notice instead. */
export function OpensAtLaunch({ children }: { children: ReactNode }) {
  if (!isPublicPreview) return children;
  return (
    <div className="card card-sun stack stack-sm">
      <h3>This form opens at launch</h3>
      <p>
        LeaveBridge Health isn&rsquo;t open yet, so we can&rsquo;t receive messages here. Please
        check back soon.
      </p>
    </div>
  );
}
