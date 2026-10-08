import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../env";
import { decryptBuffer, encryptBuffer, randomToken } from "../crypto";

/**
 * Object storage for uploads and generated documents. Objects are encrypted by the application
 * (AES-256-GCM) before they leave the process; S3 adds SSE-KMS on top. Keys are opaque and
 * never contain names or case details. Files are only ever served through the authorized,
 * audited download route, never by public or long-lived URLs.
 */
export interface StorageProvider {
  put(data: Buffer, prefix: string): Promise<string>;
  get(key: string): Promise<Buffer>;
}

class LocalStorage implements StorageProvider {
  constructor(private readonly root: string) {}
  private resolve(key: string) {
    if (!/^[a-z0-9/_-]+$/i.test(key)) throw new Error("Invalid storage key");
    return path.join(this.root, key);
  }
  async put(data: Buffer, prefix: string) {
    const key = `${prefix}/${new Date().toISOString().slice(0, 7)}/${randomToken(18)}`;
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, encryptBuffer(data), { mode: 0o600 });
    return key;
  }
  async get(key: string) {
    return decryptBuffer(await readFile(this.resolve(key)));
  }
}

class S3Storage implements StorageProvider {
  private readonly client: S3Client;
  constructor(
    private readonly bucket: string,
    region: string,
    private readonly kmsKeyId: string | undefined,
  ) {
    this.client = new S3Client({ region });
  }
  async put(data: Buffer, prefix: string) {
    const key = `${prefix}/${new Date().toISOString().slice(0, 7)}/${randomToken(18)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: encryptBuffer(data),
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: this.kmsKeyId,
        ContentType: "application/octet-stream",
      }),
    );
    return key;
  }
  async get(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return decryptBuffer(Buffer.from(bytes));
  }
}

let instance: StorageProvider | null = null;
export function storage(): StorageProvider {
  if (instance) return instance;
  if (env.STORAGE_PROVIDER === "s3") {
    if (!env.S3_BUCKET || !env.S3_REGION) throw new Error("S3 storage selected but not configured");
    instance = new S3Storage(env.S3_BUCKET, env.S3_REGION, env.S3_KMS_KEY_ID);
  } else {
    instance = new LocalStorage(path.resolve(env.STORAGE_LOCAL_DIR));
  }
  return instance;
}
