import { describe, expect, it } from "vitest";
import { buildReport, envelope, parseDsn, reportingConfig } from "@/server/error-reporting";

const DSN = "https://abc123@o1.ingest.us.sentry.io/4500000000000001";

describe("Sentry error reporting (SEC-11)", () => {
  it("stays off without a signed BAA or a valid DSN", () => {
    expect(reportingConfig({ SENTRY_DSN: DSN })).toBeNull();
    expect(reportingConfig({ SENTRY_DSN: "not a url", SENTRY_BAA_SIGNED: "1" })).toBeNull();
    expect(reportingConfig({ SENTRY_DSN: DSN, SENTRY_BAA_SIGNED: "1" })?.envelopeUrl).toBe("https://o1.ingest.us.sentry.io/api/4500000000000001/envelope/");
  });

  it("never sends the error message, the real path or request headers", () => {
    const err = new Error("Fictional Patient jane@example.test answered yes to Q4");
    const report = buildReport(err, { method: "POST" }, { routePath: "/portal/cases/[id]", routeType: "action" });
    const body = envelope(report, parseDsn(DSN)!, "test");
    expect(body).not.toContain("jane@example.test");
    expect(body).not.toContain("Fictional Patient");
    expect(body).toContain("/portal/cases/[id]");
    expect(body).toContain("(message withheld)");
    expect(report.frames.length).toBeGreaterThan(0);
    expect(JSON.stringify(report.frames)).not.toContain("Q4");
  });
});
