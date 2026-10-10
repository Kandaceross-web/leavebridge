import "server-only";
import { createHash, createPrivateKey, generateKeyPairSync, randomBytes, sign as cryptoSign, verify as cryptoVerify, X509Certificate, type KeyObject } from "node:crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import type { PDFDocument } from "pdf-lib";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import signpdf from "@signpdf/signpdf";
import { Signer } from "@signpdf/utils";
import { env } from "./env";
import { log } from "./logger";

/**
 * Cryptographic signing of issued PDFs: a CMS (PKCS#7) detached signature over the whole file
 * ("adbe.pkcs7.detached", the PAdES-compatible form PDF readers check), with signed content-type,
 * signing-time, message-digest and ESS signing-certificate-v2 attributes.
 *
 * The practice's key and certificate come from the secret manager as PEM (DOCUMENT_SIGNING_KEY,
 * DOCUMENT_SIGNING_CERT). Production refuses to start without them (src/server/env.ts). Development
 * and tests generate a self-signed certificate once per process; it says so in its name and is not
 * trusted by anything.
 *
 * The CMS structure is built and parsed with pkijs/asn1js; every RSA operation (signing and checking)
 * is done by Node's own crypto (OpenSSL).
 */

interface LoadedSigner {
  key: KeyObject;
  certDer: Buffer;
  chainDer: Buffer[];
  fingerprint: string;
  subject: string;
  development: boolean;
}

let cached: LoadedSigner | null = null;

const OID = {
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  signingCertificateV2: "1.2.840.113549.1.9.16.2.47",
  sha256: "2.16.840.1.101.3.4.2.1",
  rsaEncryption: "1.2.840.113549.1.1.1",
  sha256WithRSA: "1.2.840.113549.1.1.11",
  commonName: "2.5.4.3",
  organization: "2.5.4.10",
  basicConstraints: "2.5.29.19",
  keyUsage: "2.5.29.15",
};

const fingerprintOf = (der: Buffer) => createHash("sha256").update(der).digest("hex").toUpperCase();
const sha256 = (b: Buffer | Uint8Array) => createHash("sha256").update(b).digest();
const ab = (b: Buffer | Uint8Array): ArrayBuffer => Uint8Array.from(b).buffer;

/** Accepts PEM text or PEM that was base64-encoded to fit in one environment variable. */
function pemText(v: string): string {
  return v.includes("-----BEGIN") ? v : Buffer.from(v, "base64").toString("utf8");
}

function pemCertificates(v: string): Buffer[] {
  return [...pemText(v).matchAll(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/g)].map((m) => Buffer.from(m[1]!.replace(/\s+/g, ""), "base64"));
}

/** A self-signed development certificate (2048-bit RSA, one year) as PEM. Never used in production. */
export function generateDevelopmentSigner(commonName = "LeaveBridge Health DEVELOPMENT document signing (not trusted)"): { keyPem: string; certPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048, publicExponent: 0x10001 });
  const name = () =>
    new pkijs.RelativeDistinguishedNames({
      typesAndValues: [
        new pkijs.AttributeTypeAndValue({ type: OID.commonName, value: new asn1js.Utf8String({ value: commonName }) }),
        new pkijs.AttributeTypeAndValue({ type: OID.organization, value: new asn1js.Utf8String({ value: "Development only" }) }),
      ],
    });
  const cert = new pkijs.Certificate();
  cert.version = 2;
  const serial = randomBytes(16);
  serial[0] = (serial[0]! & 0x7f) | 0x01;
  cert.serialNumber = new asn1js.Integer({ valueHex: ab(serial) });
  cert.issuer = name();
  cert.subject = name();
  cert.notBefore.value = new Date(Date.now() - 60_000);
  cert.notAfter.value = new Date(Date.now() + 365 * 86_400_000);
  cert.subjectPublicKeyInfo = pkijs.PublicKeyInfo.fromBER(ab(publicKey.export({ type: "spki", format: "der" })));
  cert.extensions = [
    new pkijs.Extension({ extnID: OID.basicConstraints, critical: true, extnValue: new pkijs.BasicConstraints({ cA: false }).toSchema().toBER(false) }),
    // digitalSignature (bit 0) and nonRepudiation (bit 1).
    new pkijs.Extension({ extnID: OID.keyUsage, critical: true, extnValue: new asn1js.BitString({ valueHex: new Uint8Array([0xc0]).buffer, unusedBits: 6 }).toBER(false) }),
  ];
  const alg = () => new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256WithRSA, algorithmParams: new asn1js.Null() });
  cert.signature = alg();
  cert.signatureAlgorithm = alg();
  const tbs = cert.encodeTBS().toBER(false);
  cert.tbsView = new Uint8Array(tbs);
  cert.signatureValue = new asn1js.BitString({ valueHex: ab(cryptoSign("sha256", Buffer.from(tbs), privateKey)) });
  const der = Buffer.from(cert.toSchema().toBER(false));
  const certPem = `-----BEGIN CERTIFICATE-----\n${der.toString("base64").replace(/.{64}/g, "$&\n")}\n-----END CERTIFICATE-----\n`;
  return { keyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(), certPem };
}

export function documentSigner(): LoadedSigner {
  if (cached) return cached;
  let keyPem: string;
  let certPem: string;
  let development = false;
  if (env.DOCUMENT_SIGNING_KEY && env.DOCUMENT_SIGNING_CERT) {
    keyPem = pemText(env.DOCUMENT_SIGNING_KEY);
    certPem = env.DOCUMENT_SIGNING_CERT;
  } else {
    if (env.APP_ENV === "production") throw new Error("DOCUMENT_SIGNING_KEY and DOCUMENT_SIGNING_CERT are required in production");
    ({ keyPem, certPem } = generateDevelopmentSigner());
    development = true;
    log.info("generated a development document-signing certificate", { event: "signing_cert_generated" });
  }
  const key = createPrivateKey({ key: keyPem, passphrase: env.DOCUMENT_SIGNING_KEY_PASSPHRASE });
  if (key.asymmetricKeyType !== "rsa") throw new Error("The document-signing key must be RSA");
  const [certDer, ...chainDer] = pemCertificates(certPem);
  if (!certDer) throw new Error("DOCUMENT_SIGNING_CERT has no certificate");
  const x509 = new X509Certificate(certDer);
  if (!x509.checkPrivateKey(key)) throw new Error("DOCUMENT_SIGNING_KEY does not match the first certificate in DOCUMENT_SIGNING_CERT");
  cached = { key, certDer, chainDer, fingerprint: fingerprintOf(certDer), subject: x509.subject.replace(/\n/g, ", "), development };
  return cached;
}

/** Builds the CMS SignedData that @signpdf embeds: detached, SHA-256 with RSA, one signer. */
class CmsSigner extends Signer {
  constructor(private readonly s: LoadedSigner) {
    super();
  }

  override async sign(pdfBuffer: Buffer, signingTime: Date = new Date()): Promise<Buffer> {
    const cert = pkijs.Certificate.fromBER(ab(this.s.certDer));
    const chain = this.s.chainDer.map((d) => pkijs.Certificate.fromBER(ab(d)));
    // SigningCertificateV2 { certs: [ ESSCertIDv2 { certHash } ] }; SHA-256 is the default hash, so it is omitted.
    const signingCertificateV2 = new asn1js.Sequence({
      value: [new asn1js.Sequence({ value: [new asn1js.Sequence({ value: [new asn1js.OctetString({ valueHex: ab(sha256(this.s.certDer)) })] })] })],
    });
    const signedAttrs = new pkijs.SignedAndUnsignedAttributes({
      type: 0,
      attributes: [
        new pkijs.Attribute({ type: OID.contentType, values: [new asn1js.ObjectIdentifier({ value: OID.data })] }),
        new pkijs.Attribute({ type: OID.signingTime, values: [new asn1js.UTCTime({ valueDate: signingTime })] }),
        new pkijs.Attribute({ type: OID.messageDigest, values: [new asn1js.OctetString({ valueHex: ab(sha256(pdfBuffer)) })] }),
        new pkijs.Attribute({ type: OID.signingCertificateV2, values: [signingCertificateV2] }),
      ],
    });
    // The signature covers the attributes DER-encoded as a SET (tag 0x31), not the [0] form stored.
    const toSign = new Uint8Array(signedAttrs.toSchema().toBER(false));
    toSign[0] = 0x31;
    const signature = cryptoSign("sha256", toSign, this.s.key);

    const signerInfo = new pkijs.SignerInfo({
      version: 1,
      sid: new pkijs.IssuerAndSerialNumber({ issuer: cert.issuer, serialNumber: cert.serialNumber }),
      digestAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256, algorithmParams: new asn1js.Null() }),
      signedAttrs,
      signatureAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID.rsaEncryption, algorithmParams: new asn1js.Null() }),
      signature: new asn1js.OctetString({ valueHex: ab(signature) }),
    });
    const signedData = new pkijs.SignedData({
      version: 1,
      digestAlgorithms: [new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256, algorithmParams: new asn1js.Null() })],
      encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: OID.data }),
      certificates: [cert, ...chain],
      signerInfos: [signerInfo],
    });
    const contentInfo = new pkijs.ContentInfo({ contentType: OID.signedData, content: signedData.toSchema(true) });
    return Buffer.from(contentInfo.toSchema().toBER(false));
  }
}

/**
 * Adds a signature placeholder to the document, serializes it and signs the bytes. Any later change
 * to the file (a date, a name, an appended update) breaks the signature.
 */
export async function signPdf(pdfDoc: PDFDocument, meta: { reason: string; name: string; location: string; contactInfo: string; signingTime: Date }): Promise<{ bytes: Buffer; fingerprint: string }> {
  const signer = documentSigner();
  pdflibAddPlaceholder({ pdfDoc, reason: meta.reason, name: meta.name, location: meta.location, contactInfo: meta.contactInfo, signingTime: meta.signingTime, signatureLength: 8192 });
  const unsigned = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
  const bytes = await signpdf.sign(unsigned, new CmsSigner(signer), meta.signingTime);
  return { bytes, fingerprint: signer.fingerprint };
}

export type SignatureCheck =
  | { ok: true; fingerprint: string; signedAt: Date | null }
  | { ok: false; reason: "no_signature" | "multiple_signatures" | "not_whole_file" | "malformed" | "digest_mismatch" | "bad_signature" };

/**
 * Checks the PDF's embedded signature: exactly one signature, covering the whole file, whose signed
 * digest matches the bytes and whose RSA signature verifies against the embedded signer certificate.
 * Returns the certificate fingerprint so callers can compare it with the expected signer.
 */
export function verifyPdfSignature(pdf: Buffer): SignatureCheck {
  const text = pdf.toString("latin1");
  const ranges = [...text.matchAll(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g)];
  if (!ranges.length) return { ok: false, reason: "no_signature" };
  if (ranges.length > 1) return { ok: false, reason: "multiple_signatures" };
  const [a, b, c, d] = ranges[0]!.slice(1, 5).map(Number) as [number, number, number, number];
  if (a !== 0 || c + d !== pdf.length || b >= c) return { ok: false, reason: "not_whole_file" };
  if (text[b] !== "<" || text[c - 1] !== ">") return { ok: false, reason: "malformed" };
  const hex = text.slice(b + 1, c - 1).replace(/(00)+$/, "");
  if (!/^[0-9a-fA-F]*$/.test(hex)) return { ok: false, reason: "malformed" };
  const signedBytes = Buffer.concat([pdf.subarray(0, b), pdf.subarray(c, c + d)]);
  try {
    const parsed = asn1js.fromBER(ab(Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex")));
    if (parsed.offset === -1) return { ok: false, reason: "malformed" };
    const contentInfo = new pkijs.ContentInfo({ schema: parsed.result });
    if (contentInfo.contentType !== OID.signedData) return { ok: false, reason: "malformed" };
    const signedData = new pkijs.SignedData({ schema: contentInfo.content });
    if (signedData.signerInfos.length !== 1) return { ok: false, reason: "multiple_signatures" };
    const si = signedData.signerInfos[0]!;
    if (!si.signedAttrs || !si.signedAttrs.encodedValue.byteLength) return { ok: false, reason: "malformed" };

    let digest: Buffer | null = null;
    let signedAt: Date | null = null;
    for (const attr of si.signedAttrs.attributes) {
      const first = attr.values[0];
      if (attr.type === OID.messageDigest && first instanceof asn1js.OctetString) digest = Buffer.from(first.valueBlock.valueHexView);
      if (attr.type === OID.signingTime && (first instanceof asn1js.UTCTime || first instanceof asn1js.GeneralizedTime)) signedAt = first.toDate();
    }
    if (!digest || !digest.equals(sha256(signedBytes))) return { ok: false, reason: "digest_mismatch" };

    const sid = si.sid;
    if (!(sid instanceof pkijs.IssuerAndSerialNumber)) return { ok: false, reason: "malformed" };
    const signerCert = (signedData.certificates ?? []).find(
      (cert): cert is pkijs.Certificate => cert instanceof pkijs.Certificate && cert.issuer.isEqual(sid.issuer) && cert.serialNumber.isEqual(sid.serialNumber),
    );
    if (!signerCert) return { ok: false, reason: "malformed" };
    const certDer = Buffer.from(signerCert.toSchema().toBER(false));
    // pkijs keeps the signed attributes exactly as received, already re-tagged as a SET.
    const attrsDer = Buffer.from(si.signedAttrs.encodedValue);
    const signature = Buffer.from(si.signature.valueBlock.valueHexView);
    if (!cryptoVerify("sha256", attrsDer, new X509Certificate(certDer).publicKey, signature)) return { ok: false, reason: "bad_signature" };
    return { ok: true, fingerprint: fingerprintOf(certDer), signedAt };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
