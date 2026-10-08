import { describe, expect, it } from "vitest";
import { cleanEntry, clean, decodeAttribution, encodeAttribution, nextAttribution, touchFromRequest } from "@/domain/attribution";

const t = (qs: string, referrer: string | null = null, landingPath = "/") =>
  touchFromRequest({ params: new URLSearchParams(qs), referrer, ownHosts: ["leavebridge.example"], landingPath, now: new Date("2026-10-08T00:00:00Z") });

describe("first-party attribution", () => {
  it("classifies paid search from a Google click id without storing the id", () => {
    const touch = t("gclid=abc123SECRET&utm_campaign=Stress-Leave&utm_term=fmla%20paperwork%20anxiety");
    expect(touch?.channel).toBe("paid_search");
    expect(touch?.clickNetwork).toBe("google");
    expect(touch?.term).toBe("fmla paperwork anxiety");
    expect(JSON.stringify(touch)).not.toContain("abc123SECRET");
  });

  it("classifies organic search, social, partner and plain referrals", () => {
    expect(t("", "https://www.google.com/")?.channel).toBe("organic_search");
    expect(t("", "https://www.reddit.com/r/FMLA/comments/x")?.channel).toBe("organic_social");
    expect(t("ref=acme-logistics")?.channel).toBe("partner");
    expect(t("", "https://someblog.example/post")?.channel).toBe("referral");
    expect(t("utm_source=newsletter&utm_medium=email")?.channel).toBe("email");
  });

  it("keeps only the referring host, never the path or query", () => {
    const touch = t("", "https://www.reddit.com/r/FMLA/comments/123/my_anxiety_story?x=1");
    expect(touch?.referrerHost).toBe("reddit.com");
    expect(JSON.stringify(touch)).not.toContain("anxiety_story");
  });

  it("ignores self-referrals and visits without a signal", () => {
    expect(t("", "https://leavebridge.example/pricing")).toBeNull();
    expect(t("")).toBeNull();
  });

  it("drops values that look like personal data", () => {
    expect(clean("jane.doe@example.com")).toBeNull();
    expect(clean("6015551234567")).toBeNull();
    expect(clean("Spring <script>")).toBe("spring script");
  });

  it("keeps first touch and only moves last touch on a new signal", () => {
    const first = t("utm_source=google&utm_medium=cpc&utm_campaign=a")!;
    const start = nextAttribution(null, first, "/")!;
    expect(start.first).toEqual(first);
    expect(nextAttribution(start, null, "/pricing")).toBeNull();
    const second = t("", "https://www.bing.com/")!;
    const after = nextAttribution(start, second, "/")!;
    expect(after.first).toEqual(first);
    expect(after.last.channel).toBe("organic_search");
    expect(nextAttribution(null, null, "/faq")!.first.channel).toBe("direct");
  });

  it("round-trips the cookie and rejects tampered values", () => {
    const a = nextAttribution(null, t("utm_source=x&utm_medium=social"), "/")!;
    expect(decodeAttribution(encodeAttribution(a))).toEqual(a);
    expect(decodeAttribution("not-base64-json")).toBeNull();
    const bad = Buffer.from(JSON.stringify({ first: { ...a.first, channel: "hacked" }, last: a.last })).toString("base64url");
    expect(decodeAttribution(bad)).toBeNull();
  });

  it("accepts only simple CTA labels", () => {
    expect(cleanEntry("home-hero")).toBe("home-hero");
    expect(cleanEntry("Home Hero")).toBeNull();
    expect(cleanEntry("x".repeat(41))).toBeNull();
  });
});
