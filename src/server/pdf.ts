import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface WriteOptions {
  size?: number;
  bold?: boolean;
  color?: ReturnType<typeof rgb>;
  gap?: number;
}

export const PDF_NAVY = rgb(0.08, 0.14, 0.23);

/**
 * A plain US Letter text document: wrapped paragraphs, new pages as needed. Standard fonts only
 * cover printable ASCII, so other characters become spaces rather than failing the render.
 */
export async function textPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 740;
  const margin = 56;
  const width = 612 - margin * 2;
  const write = (text: string, opts: WriteOptions = {}) => {
    const size = opts.size ?? 10.5;
    const f: PDFFont = opts.bold ? boldFont : font;
    const words = text.replace(/[^\x20-\x7E\n]/g, " ").split(/\s+/);
    let line = "";
    const flush = () => {
      if (y < 72) {
        page = pdf.addPage([612, 792]);
        y = 740;
      }
      page.drawText(line, { x: margin, y, size, font: f, color: opts.color ?? rgb(0.1, 0.12, 0.16) });
      y -= size * 1.45;
      line = "";
    };
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) > width) flush();
      line = line ? `${line} ${w}` : w;
    }
    if (line) flush();
    y -= opts.gap ?? 4;
  };
  const space = (pt: number) => void (y -= pt);
  const save = async (meta: { title: string; producer: string }) => {
    pdf.setTitle(meta.title);
    pdf.setProducer(meta.producer);
    return Buffer.from(await pdf.save());
  };
  return { write, space, save };
}
