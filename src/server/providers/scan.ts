import "server-only";
import net from "node:net";
import { env } from "../env";

/**
 * Upload validation and malware scanning. Every upload is held in "pending" and is unreadable
 * by anyone until it passes: (1) content-type detection by magic bytes (the extension and the
 * browser-reported type are ignored), (2) size limits, (3) structural checks, and (4) a malware
 * scan (ClamAV in production, or GuardDuty Malware Protection for S3). (SEC-06)
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type DetectedType = "application/pdf" | "image/png" | "image/jpeg" | "image/heic";

export function detectType(buf: Buffer): DetectedType | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  const ftyp = buf.subarray(4, 12).toString("latin1");
  if (/^ftyp(heic|heix|mif1|msf1)/.test(ftyp)) return "image/heic";
  return null;
}

export type ScanResult = { ok: true; mime: DetectedType } | { ok: false; reason: string };

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

function structuralCheck(buf: Buffer, mime: DetectedType): string | null {
  if (mime === "application/pdf") {
    const text = buf.toString("latin1");
    // Active content in a PDF is never needed for a leave form.
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(text)) return "PDF contains active content";
    if (/\/Encrypt\b/.test(text)) return "Password-protected PDFs cannot be reviewed";
  }
  return null;
}

async function clamavScan(buf: Buffer): Promise<string | null> {
  const [host, portStr] = (env.CLAMAV_HOST ?? "localhost:3310").split(":");
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: Number(portStr ?? 3310) }, () => {
      socket.write("zINSTREAM\0");
      for (let i = 0; i < buf.length; i += 64 * 1024) {
        const chunk = buf.subarray(i, i + 64 * 1024);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(chunk.length);
        socket.write(len);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    let response = "";
    socket.on("data", (d) => (response += d.toString()));
    socket.on("end", () => resolve(response.includes("FOUND") ? "Malware detected" : null));
    socket.on("error", reject);
    socket.setTimeout(30_000, () => socket.destroy(new Error("ClamAV timeout")));
  });
}

export async function scanUpload(buf: Buffer): Promise<ScanResult> {
  if (buf.length === 0) return { ok: false, reason: "File is empty" };
  if (buf.length > MAX_UPLOAD_BYTES) return { ok: false, reason: "File is larger than 15 MB" };
  const mime = detectType(buf);
  if (!mime) return { ok: false, reason: "Only PDF, JPG, PNG or HEIC files are accepted" };
  const structural = structuralCheck(buf, mime);
  if (structural) return { ok: false, reason: structural };
  if (buf.includes(Buffer.from(EICAR, "latin1"))) return { ok: false, reason: "Malware detected" };
  if (env.SCAN_PROVIDER === "clamav") {
    const found = await clamavScan(buf);
    if (found) return { ok: false, reason: found };
  }
  return { ok: true, mime };
}
