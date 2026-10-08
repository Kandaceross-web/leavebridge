import { describe, expect, it } from "vitest";
import { decrypt, decryptBuffer, encrypt, encryptBuffer, hmac, safeEqual } from "@/server/crypto";
import { base32Decode, base32Encode, totpAt, verifyTotp } from "@/server/auth/totp";
import { hashPassword, passwordProblems, verifyPassword } from "@/server/auth/password";
import { detectType, scanUpload } from "@/server/providers/scan";
import { flagsFor, type OpsCaseRow } from "@/server/services/ops";

describe("field encryption", () => {
  it("round-trips and never stores plaintext", () => {
    const ct = encrypt("fictional secret");
    expect(ct).not.toContain("fictional");
    expect(ct.startsWith("v1.")).toBe(true);
    expect(decrypt(ct)).toBe("fictional secret");
    expect(encrypt("x")).not.toBe(encrypt("x"));
  });
  it("detects tampering", () => {
    const parts = encrypt("abc").split(".");
    parts[4] = Buffer.from("zzz").toString("base64");
    expect(() => decrypt(parts.join("."))).toThrow();
  });
  it("encrypts files", () => {
    const data = Buffer.from("%PDF-1.4 fictional");
    expect(decryptBuffer(encryptBuffer(data)).equals(data)).toBe(true);
  });
  it("hmac is stable and safeEqual compares", () => {
    expect(hmac("a")).toBe(hmac("a"));
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});

describe("TOTP (RFC 6238)", () => {
  it("matches the RFC test vector for SHA-1", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
    expect(totpAt(secret, Math.floor(59 / 30))).toBe("287082");
  });
  it("accepts the current code and rejects others", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    const now = Date.now();
    expect(verifyTotp(secret, totpAt(secret, Math.floor(now / 30000)), now)).toBe(true);
    expect(verifyTotp(secret, "000000", now) && totpAt(secret, Math.floor(now / 30000)) !== "000000").toBe(false);
  });
});

describe("passwords", () => {
  it("hashes with scrypt and verifies", async () => {
    const h = await hashPassword("Fictional-pass-123");
    expect(h).not.toContain("Fictional");
    expect(await verifyPassword("Fictional-pass-123", h)).toBe(true);
    expect(await verifyPassword("wrong-password-1", h)).toBe(false);
  });
  it("requires a reasonable length", () => {
    expect(passwordProblems("short")).not.toBeNull();
    expect(passwordProblems("a-long-enough-passphrase")).toBeNull();
  });
});

describe("upload scanning", () => {
  it("identifies types by content, not extension", () => {
    expect(detectType(Buffer.from("%PDF-1.7\n"))).toBe("application/pdf");
    expect(detectType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectType(Buffer.from("MZ executable"))).toBeNull();
  });
  it("rejects the EICAR test string and unknown types", async () => {
    const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    expect((await scanUpload(eicar)).ok).toBe(false);
    expect((await scanUpload(Buffer.from("<script>alert(1)</script>"))).ok).toBe(false);
  });
});

describe("ops flags", () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  const row = (patch: Partial<OpsCaseRow>): OpsCaseRow => ({
    id: "1", reference: "LB-AAAAAA", patientName: "Fictional", status: "submitted", stage: "new_requests", priority: "normal", serviceName: null,
    jurisdictionCode: "TX", clinicianId: null, clinicianName: null, deadline: null, createdAt: new Date(now - 86_400_000), submittedAt: new Date(now - 86_400_000),
    lastActivityAt: new Date(now - 86_400_000), screeningReview: "none", openRequests: 0, formsCount: 0, formsUnreviewed: 0, requiresForm: false,
    measuresToReview: 0, safetyOpen: 0, docsToSign: 0, docsSignedUndelivered: 0, nextAppointment: null, idvPending: false, paid: true, isFixture: true, ...patch,
  });
  const t = { agingDays: 5, abandonedDays: 7, followUpDays: 3, deadlineWarningDays: 3 };
  it("flags new, unassigned submissions", () => {
    expect(flagsFor(row({}), t, now)).toEqual(expect.arrayContaining(["new", "unassigned", "awaiting_clinician"]));
  });
  it("flags aging, abandoned, safety and deadlines", () => {
    expect(flagsFor(row({ submittedAt: new Date(now - 10 * 86_400_000) }), t, now)).toContain("aging");
    expect(flagsFor(row({ status: "started", stage: null, lastActivityAt: new Date(now - 9 * 86_400_000) }), t, now)).toContain("abandoned");
    expect(flagsFor(row({ safetyOpen: 1 }), t, now)).toContain("safety");
    expect(flagsFor(row({ deadline: "2026-10-09" }), t, now)).toContain("deadline_soon");
  });
});
