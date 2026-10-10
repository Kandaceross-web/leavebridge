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
const ascii = (t: string) => t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E\n]/g, " ");

export function issuedStamp(d: Date): string {
  const central = d.toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" });
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
      if (qr.modules.get(r, c)) page.drawRectangle({ x: ox + c * cell, y: oy + (n - 1 - r) * cell, width: cell, height: cell, color: rgb(0, 0, 0) });
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

  const write = (text: string, opts: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; maxWidth?: number } = {}) => {
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
  write(`Document number: ${input.documentNumber}`, { size: 10, f: bold, gap: 1, maxWidth: headWidth });
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
    const footer = ascii(`${input.documentNumber} | Issued ${stamp} | Page ${i + 1} of ${pages.length}`);
    const long = ascii(`Digitally signed. Any change to this file invalidates the signature. Verify at ${input.verifyUrl}`);
    const footer2 = font.widthOfTextAtSize(long, 7.5) <= width ? long : ascii(`Digitally signed. Verify at ${input.verifyUrl}`);
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
