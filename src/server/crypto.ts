import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Application-layer field encryption (AES-256-GCM) with a keyring so keys can rotate.
 * Format: "v1.<keyId>.<iv b64url>.<tag b64url>.<ciphertext b64url>".
 * In production the keyring is supplied from the secret manager; a KMS-backed data-key
 * provider can replace `loadKeyring` without changing callers.
 */
type Keyring = { activeId: string; keys: Map<string, Buffer> };

function loadKeyring(): Keyring {
  const keys = new Map<string, Buffer>();
  let activeId = "";
  for (const entry of env.ENCRYPTION_KEYS.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [id, b64] = entry.split(":");
    if (!id || !b64) throw new Error("Malformed ENCRYPTION_KEYS entry");
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) throw new Error(`Encryption key ${id} must be 32 bytes`);
    keys.set(id, key);
    if (!activeId) activeId = id;
  }
  if (!activeId) throw new Error("ENCRYPTION_KEYS is empty");
  return { activeId, keys };
}

const keyring = loadKeyring();

export function encrypt(plaintext: string): string {
  const key = keyring.keys.get(keyring.activeId)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", keyring.activeId, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [v, keyId, ivB64, tagB64, ctB64] = payload.split(".");
  if (v !== "v1" || !keyId || !ivB64 || !tagB64 || ctB64 === undefined) throw new Error("Unrecognized ciphertext format");
  const key = keyring.keys.get(keyId);
  if (!key) throw new Error("Unknown encryption key id");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]).toString("utf8");
}

export const encryptJson = (value: unknown) => encrypt(JSON.stringify(value));
export function decryptJson<T>(payload: string | null | undefined, fallback: T): T {
  if (!payload) return fallback;
  return JSON.parse(decrypt(payload)) as T;
}
export const encryptOptional = (v: string | null | undefined) => (v ? encrypt(v) : null);
export const decryptOptional = (v: string | null | undefined) => (v ? decrypt(v) : null);

/** Binary encryption for stored files. Layout: [12 iv][16 tag][ciphertext], key id prefix line. */
export function encryptBuffer(data: Buffer): Buffer {
  const key = keyring.keys.get(keyring.activeId)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  const header = Buffer.from(`${keyring.activeId}\n`, "utf8");
  return Buffer.concat([header, iv, cipher.getAuthTag(), ct]);
}

export function decryptBuffer(blob: Buffer): Buffer {
  const nl = blob.indexOf(0x0a);
  const keyId = blob.subarray(0, nl).toString("utf8");
  const key = keyring.keys.get(keyId);
  if (!key) throw new Error("Unknown encryption key id");
  const iv = blob.subarray(nl + 1, nl + 13);
  const tag = blob.subarray(nl + 13, nl + 29);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(nl + 29)), decipher.final()]);
}

export const sha256Hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
export const hmac = (data: string) => createHmac("sha256", env.HMAC_SECRET).update(data).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
