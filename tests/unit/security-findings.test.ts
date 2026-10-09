import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFindings } from "../../scripts/security-findings";

describe("automated source checks", () => {
  it("flags console logging, hard-coded keys and tracking hosts", () => {
    const dir = mkdtempSync(join(tmpdir(), "lb-sec-"));
    writeFileSync(join(dir, "a.ts"), 'console.log("patient", p);\nconst k = "AKIAABCDEFGHIJKLMNOP";\nconst s = "https://connect.facebook.net/en_US/fbevents.js";\n');
    const checks = sourceFindings(dir).map((f) => f.check);
    expect(checks).toEqual(expect.arrayContaining(["logging", "secrets", "tracking"]));
  });

  it("passes on this repository's source", () => {
    expect(sourceFindings("src")).toEqual([]);
  });
});
