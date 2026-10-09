import { describe, expect, it } from "vitest";
import { publicCopySignedOff, staticHtml } from "../../scripts/export-public-site";

describe("static public-site export", () => {
  it("strips scripts, script preloads, nonces and internal review codes", () => {
    const html = staticHtml(
      `<head><link rel="preload" as="script" href="/_next/a.js"/><link rel="stylesheet" href="/_next/static/x.css"/><style nonce="abc">a{}</style></head>` +
        `<body><script nonce="abc">self.__next_f.push(1)</script><script src="/_next/b.js" async=""></script>` +
        `<p><span class="badge b-review">LEGAL_REVIEW_REQUIRED</span></p><h1>Hi <span class="badge b-review">STATE_RULE_REQUIRED</span></h1></body>`,
    );
    expect(html).not.toMatch(/<script|nonce=|as="script"|_REQUIRED/);
    expect(html).toContain('<link rel="stylesheet" href="/_next/static/x.css"/>');
    expect(html).toContain("<style>a{}</style>");
  });

  it("allows indexing only when LEG-05 and LEG-17 are both closed", () => {
    const table = (a: string, b: string) => `| LEG-05 | Public copy | ${a} |\n| LEG-17 | Guides | ${b} |`;
    expect(publicCopySignedOff(table("Open", "Open"))).toBe(false);
    expect(publicCopySignedOff(table("Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived)", "Open"))).toBe(false);
    expect(publicCopySignedOff(table("Closed (2026-10-09, x)", "Closed (2026-10-09, x)"))).toBe(true);
  });
});
