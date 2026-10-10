import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { PDF_NAVY } from "./pdf";

/**
 * Layout for issued, verifiable documents (screening records and work excuse letters). Every page
 * carries the document number, the issue time and the verification address; the first page carries
 * a QR code to the public verification page. The returned PDFDocument is signed by src/server/signing.ts.
 */
export interface IssuedPdfInput {
  title: string;
  /** Short line under the title, e.g. "Automated screening record. Not a clinician examination." */
  subtitle: string;
  documentNumber: string;
  issuedAt: Date;
  verifyUrl: string;
  brand: string;
  practice: string;
  /** Label/value pairs printed under the header (patient name, date of birth, completed on...). */
  facts: { label: string; value: string }[];
  sections: { heading: string; lines: string[] }[];
  /** Printed at the end: signature statement, disclaimers. */
  closing: string[];
}

const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.35, 0.38, 0.42);
const PAGE: [number, number] = [612, 792];
const MARGIN = 56;

/** Printable ASCII only: the standard fonts cannot encode anything else. */
const ascii = (t: string) =>
  t
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, " ");

export function issuedStamp(d: Date): string {
  const central = d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "long",
    timeStyle: "short",
  });
  return `${central} Central (${d.toISOString().replace(/\.\d{3}Z$/, "Z")})`;
}

function drawQr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size / (n + 8);
  const ox = x + cell * 4;
  const oy = y + cell * 4;
  page.drawRectangle({ x, y, width: size, height: size, color: rgb(1, 1, 1) });
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c))
        page.drawRectangle({
          x: ox + c * cell,
          y: oy + (n - 1 - r) * cell,
          width: cell,
          height: cell,
          color: rgb(0, 0, 0),
        });
    }
  }
}

export async function renderIssuedPdf(input: IssuedPdfInput): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE[0] - MARGIN * 2;
  const stamp = issuedStamp(input.issuedAt);
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const newPage = () => {
    page = pdf.addPage(PAGE);
    pages.push(page);
    y = PAGE[1] - MARGIN;
  };

  const write = (
    text: string,
    opts: {
      size?: number;
      f?: PDFFont;
      color?: ReturnType<typeof rgb>;
      gap?: number;
      maxWidth?: number;
    } = {},
  ) => {
    const size = opts.size ?? 10.5;
    const f = opts.f ?? font;
    const max = opts.maxWidth ?? width;
    for (const para of ascii(text).split("\n")) {
      let line = "";
      const flush = () => {
        if (y < MARGIN + 40) newPage();
        page.drawText(line, { x: MARGIN, y, size, font: f, color: opts.color ?? INK });
        y -= size * 1.45;
        line = "";
      };
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(next, size) > max && line) flush();
        line = line ? `${line} ${w}` : w;
      }
      if (line) flush();
    }
    y -= opts.gap ?? 4;
  };

  newPage();
  // Header: brand, title, QR on the right.
  const qrSize = 104;
  drawQr(page, input.verifyUrl, PAGE[0] - MARGIN - qrSize, PAGE[1] - MARGIN - qrSize + 8, qrSize);
  const headWidth = width - qrSize - 16;
  write(input.brand, { size: 11, f: bold, color: PDF_NAVY, gap: 2, maxWidth: headWidth });
  write(input.title, { size: 16, f: bold, color: PDF_NAVY, gap: 4, maxWidth: headWidth });
  write(input.subtitle, { size: 9.5, color: MUTED, gap: 8, maxWidth: headWidth });
  write(`Document number: ${input.documentNumber}`, {
    size: 10,
    f: bold,
    gap: 1,
    maxWidth: headWidth,
  });
  write(`Issued: ${stamp}`, { size: 9.5, gap: 1, maxWidth: headWidth });
  write(`Issuing practice: ${input.practice}`, { size: 9.5, gap: 1, maxWidth: headWidth });
  write(`Verify: ${input.verifyUrl}`, { size: 9, color: MUTED, gap: 12, maxWidth: headWidth });
  y = Math.min(y, PAGE[1] - MARGIN - qrSize - 12);

  for (const fact of input.facts) {
    write(fact.label, { size: 9, f: bold, color: MUTED, gap: 0 });
    write(fact.value, { gap: 6 });
  }
  y -= 4;
  for (const s of input.sections) {
    write(s.heading, { size: 12, f: bold, color: PDF_NAVY, gap: 4 });
    for (const line of s.lines) write(line, { gap: 6 });
    y -= 4;
  }
  for (const line of input.closing) write(line, { size: 9, color: MUTED, gap: 4 });

  // Footer on every page: document number, issue time, verification and tamper notice.
  pages.forEach((p, i) => {
    const footer = ascii(
      `${input.documentNumber} | Issued ${stamp} | Page ${i + 1} of ${pages.length}`,
    );
    const long = ascii(
      `Digitally signed. Any change to this file invalidates the signature. Verify at ${input.verifyUrl}`,
    );
    const footer2 =
      font.widthOfTextAtSize(long, 7.5) <= width
        ? long
        : ascii(`Digitally signed. Verify at ${input.verifyUrl}`);
    p.drawText(footer, { x: MARGIN, y: 34, size: 7.5, font, color: MUTED });
    p.drawText(footer2, { x: MARGIN, y: 24, size: 7.5, font, color: MUTED });
  });

  pdf.setTitle(`${input.title} ${input.documentNumber}`);
  pdf.setSubject(input.subtitle);
  pdf.setProducer(input.brand);
  pdf.setCreator(input.brand);
  pdf.setCreationDate(input.issuedAt);
  pdf.setModificationDate(input.issuedAt);
  return pdf;
}

/**
 * Clinical correspondence layout (owner's document spec, 2026-10-10), used for excuse letters and meant
 * for later clinical letters: brand header with a rule, left-aligned title, document information with
 * the verification QR code to its right, patient information, the letter, a signature block and a short
 * footer. US Letter, 0.65 in top and bottom margins, 0.8 in side margins, Helvetica throughout.
 */
export interface LetterPdfInput {
  heading: string;
  documentType: string;
  /** Printed status; documents are only rendered when issued, so this is always the valid wording. */
  status: string;
  documentNumber: string;
  issuedAt: Date;
  verifyUrl: string;
  brand: string;
  patient: { label: string; value: string }[];
  salutation: string;
  before: string[];
  absence: [string, string][];
  after: string[];
  signature: { name: string; lines: string[] };
}

const L_INK = rgb(0x24 / 255, 0x32 / 255, 0x47 / 255);
const L_ACCENT = rgb(0x17 / 255, 0x3b / 255, 0x46 / 255);
const L_SECONDARY = rgb(0x59 / 255, 0x67 / 255, 0x73 / 255);
const L_RULE = rgb(0.78, 0.81, 0.84);
const IN = 72;
const L_TOP = 0.65 * IN;
const L_BOTTOM = 0.65 * IN;
const L_SIDE = 0.8 * IN;
/** The drawn box includes a 4-module quiet zone on each side; the code itself is about 1.05 in. */
const QR = 1.3 * IN;

/** WinAnsi-safe text: keeps the en dash, which the standard fonts can encode. */
const winAnsi = (t: string) =>
  t
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "-")
    .replace(/[^\x20-\x7E\n–]/g, " ");

export const letterDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
export const letterDateTime = (d: Date) =>
  `${letterDate(d)} at ${d.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" })} Central`;

export async function renderLetterPdf(input: LetterPdfInput): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE[0] - L_SIDE * 2;
  const right = PAGE[0] - L_SIDE;
  const footerRule = L_BOTTOM + 8 * 1.4 * 2 + 14;
  const footerTop = footerRule + 12;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage(PAGE);
    pages.push(page);
    y = PAGE[1] - L_TOP;
  };

  /** Wraps and draws text; `y` is the top of the line box. Returns nothing; advances `y`. */
  const text = (
    t: string,
    o: {
      size: number;
      f?: PDFFont;
      color?: ReturnType<typeof rgb>;
      x?: number;
      maxWidth?: number;
      lead?: number;
      after?: number;
    },
  ) => {
    const f = o.f ?? font;
    const x = o.x ?? L_SIDE;
    const max = o.maxWidth ?? width;
    const lead = o.lead ?? 1.4;
    const words = winAnsi(t).split(/\s+/).filter(Boolean);
    let line = "";
    const flush = () => {
      if (y - o.size < footerTop) newPage();
      page.drawText(line, { x, y: y - o.size, size: o.size, font: f, color: o.color ?? L_INK });
      y -= o.size * lead;
      line = "";
    };
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && f.widthOfTextAtSize(next, o.size) > max) flush();
      line = line ? `${line} ${w}` : w;
    }
    if (line) flush();
    y -= o.after ?? 0;
  };
  /** "Label: value" on one line, label in the secondary color. */
  const pair = (
    label: string,
    value: string,
    size: number,
    o: { maxWidth?: number; labelFont?: PDFFont; after?: number } = {},
  ) => {
    const lf = o.labelFont ?? bold;
    const max = o.maxWidth ?? width;
    // A fixed gap after the colon, not a space character: viewers that substitute Helvetica render it narrower.
    const l = winAnsi(`${label}:`);
    const lw = lf.widthOfTextAtSize(l, size) + size * 0.4;
    if (y - size < footerTop) newPage();
    page.drawText(l, { x: L_SIDE, y: y - size, size, font: lf, color: L_SECONDARY });
    text(value, { size, x: L_SIDE + lw, maxWidth: max - lw, after: o.after });
  };
  const rule = (at: number) =>
    page.drawLine({
      start: { x: L_SIDE, y: at },
      end: { x: right, y: at },
      thickness: 0.6,
      color: L_RULE,
    });

  newPage();
  // Header: the approved "Pause" mark (brand/logo/, vector), brand, descriptor, rule.
  const mark = 34;
  const k = mark / 48;
  const mx = L_SIDE - 8 * k;
  const my = y + 4;
  page.drawSvgPath("M8 18.5C13 8 35 8 40 18.5", {
    x: mx,
    y: my,
    scale: k,
    borderColor: rgb(0xb4 / 255, 0x9a / 255, 0x68 / 255),
    borderWidth: 2.6,
    borderLineCap: 1,
  });
  for (const px of [13, 28.5])
    page.drawRectangle({
      x: mx + px * k,
      y: my - 41 * k,
      width: 6.5 * k,
      height: 24 * k,
      color: rgb(0x26 / 255, 0x3d / 255, 0x34 / 255),
    });
  const tx = L_SIDE + mark - 4;
  text(input.brand.toUpperCase(), { size: 17, f: bold, color: L_ACCENT, lead: 1.25, x: tx });
  text("Clinical Documentation Services", { size: 10, color: L_SECONDARY, lead: 1.3, x: tx });
  y -= 6;
  rule(y);
  y -= 16;

  // Title and document information, with the QR code to the right.
  const blockTop = y;
  const infoWidth = width - QR - 24;
  text(input.heading, {
    size: 15,
    f: bold,
    color: L_ACCENT,
    maxWidth: infoWidth,
    lead: 1.3,
    after: 6,
  });
  pair("Document ID", input.documentNumber, 10, { maxWidth: infoWidth, after: 2 });
  pair("Date Issued", letterDate(input.issuedAt), 10, { maxWidth: infoWidth, after: 2 });
  pair("Document Status", input.status, 10, { maxWidth: infoWidth, after: 2 });
  pair("Document Type", input.documentType, 10, { maxWidth: infoWidth });
  const qrX = right - QR;
  const qrY = blockTop - QR;
  drawQr(page, input.verifyUrl, qrX, qrY, QR);
  // Captions centered under the code, kept inside the right margin.
  const caption = (t: string, f: PDFFont, dy: number) => {
    const w = f.widthOfTextAtSize(t, 9);
    page.drawText(t, {
      x: Math.min(qrX + (QR - w) / 2, right - w),
      y: qrY - dy,
      size: 9,
      font: f,
      color: f === bold ? L_ACCENT : L_SECONDARY,
    });
  };
  caption("VERIFY DOCUMENT", bold, 11);
  caption("Scan to confirm authenticity.", font, 23);
  y = Math.min(y, qrY - 30) - 8;

  // Patient information.
  rule(y);
  y -= 14;
  text("PATIENT INFORMATION", { size: 10, f: bold, color: L_ACCENT, lead: 1.6 });
  for (const p of input.patient) pair(p.label, p.value, 10.5, { after: 2 });
  y -= 10;
  rule(y);
  y -= 18;

  // Letter.
  text(input.salutation, { size: 11, after: 7 });
  for (const p of input.before) text(p, { size: 11, after: 7 });
  for (const [label, value] of input.absence) pair(label, value, 11, { after: 2 });
  y -= 7;
  for (const p of input.after) text(p, { size: 11, after: 7 });
  y -= 4;
  text("Sincerely,", { size: 11, after: 10 });

  // Signature block.
  text(input.signature.name, { size: 10.5, f: bold, color: L_ACCENT, lead: 1.45 });
  for (const l of input.signature.lines) text(l, { size: 10.5, lead: 1.45 });

  // Footer on every page.
  pages.forEach((p, i) => {
    const top = footerRule;
    p.drawLine({
      start: { x: L_SIDE, y: top },
      end: { x: right, y: top },
      thickness: 0.6,
      color: L_RULE,
    });
    const lines = [
      `${input.brand} | Confidential Clinical Documentation${pages.length > 1 ? ` | Page ${i + 1} of ${pages.length}` : ""}`,
      `Document ID: ${input.documentNumber}`,
      "Verify authenticity using the QR code above.",
    ];
    lines.forEach((l, k) =>
      p.drawText(winAnsi(l), {
        x: L_SIDE,
        y: top - 12 - k * 8 * 1.4,
        size: 8,
        font,
        color: L_SECONDARY,
      }),
    );
  });

  pdf.setTitle(`${input.heading} ${input.documentNumber}`);
  pdf.setSubject(`${input.documentType}. Verify with the QR code.`);
  pdf.setProducer(input.brand);
  pdf.setCreator(input.brand);
  pdf.setCreationDate(input.issuedAt);
  pdf.setModificationDate(input.issuedAt);
  return pdf;
}
