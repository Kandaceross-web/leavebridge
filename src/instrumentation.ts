import type { Instrumentation } from "next";

/** Server errors go to Sentry only when configured with a signed BAA; see src/server/error-reporting.ts (SEC-11). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { reportError } = await import("./server/error-reporting");
  await reportError(err, { method: request.method }, { routePath: context.routePath, routeType: context.routeType });
};
