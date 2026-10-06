/**
 * Measuring what a rendered PDF actually drew.
 *
 * Shared by render-invoice-check.mts and render-quotation-check.mts. Extracted
 * rather than copied because these functions encode hard-won facts about what
 * @react-pdf/renderer emits — that Tm comes before Tf, that a 62pt watermark
 * must be excluded from header spacing, that an embedded subset draws 4-hex-digit
 * glyph ids where a core font draws bytes — and a second copy is how one checker
 * would quietly stop testing what the other still does.
 *
 * Nothing here knows anything about invoices or quotations. It reads a PDF
 * buffer and reports geometry.
 */
import { readFileSync } from "node:fs";
import { create as createFont } from "fontkit";
import { inflateSync } from "node:zlib";

export function pageCount(buffer: Buffer): number {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

export type Matrix = [number, number, number, number, number, number];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

/**
 * Every string the page draws, with the size it was drawn at and where it
 * landed on the page, by walking the content stream with a CTM stack.
 *
 * Sizes and offsets are what a lineHeight bug actually corrupts — a document
 * that overlaps itself is still a valid PDF, so nothing short of measuring the
 * placements catches it.
 */
export function drawnLines(buffer: Buffer): { size: number; y: number }[] {
  const text = decompressedStreams(buffer).find(
    (stream) => stream.includes("BT") && stream.includes("Tf"),
  );
  return text ? drawnLinesIn(text) : [];
}

/** The same walk, over one already-decompressed page stream. */
export function drawnLinesIn(text: string): { size: number; y: number }[] {
  const lines: { size: number; y: number }[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  let size = 0;
  // Tm comes BEFORE Tf in what react-pdf emits, so the size belonging to a run
  // is only known once the run is drawn. Reading it at Tm time picks up the
  // PREVIOUS run's size and shifts every measurement by one line.
  let pendingY: number | null = null;

  for (const line of text.split("\n")) {
    const token = line.trim();
    if (token === "q") stack.push([...ctm] as Matrix);
    else if (token === "Q") ctm = stack.pop() ?? ctm;

    const cm = token.match(
      /^(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) cm$/,
    );
    if (cm) ctm = multiply(cm.slice(1).map(Number) as Matrix, ctm);

    const tf = token.match(/^\/\w+ ([\d.]+) Tf$/);
    if (tf) size = Number(tf[1]);

    const tm = token.match(
      /^(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) Tm$/,
    );
    if (tm) pendingY = multiply(tm.slice(1).map(Number) as Matrix, ctm)[5];

    if (pendingY !== null && /TJ$|Tj$/.test(token)) {
      lines.push({ size, y: pendingY });
      pendingY = null;
    }
  }
  return lines;
}

export function decompressedStreams(buffer: Buffer): string[] {
  const latin = buffer.toString("latin1");
  const out: string[] = [];
  let index = 0;
  for (;;) {
    const start = latin.indexOf("stream", index);
    if (start === -1) return out;
    const bodyStart = start + (latin[start + 6] === "\r" ? 8 : 7);
    const end = latin.indexOf("endstream", bodyStart);
    if (end === -1) return out;
    try {
      out.push(inflateSync(buffer.subarray(bodyStart, end)).toString("latin1"));
    } catch {
      /* a font file or an image, not a content stream */
    }
    index = end + 9;
  }
}

/* Noto Sans, per em. Ascent is what rises above a baseline, descent what hangs
 * below it — together they are the height a line of type actually occupies. */
export const ASCENT = 1.069;
export const DESCENT = 0.293;

/**
 * The business name is the first thing drawn after the logo, and the largest
 * thing in the header. Whatever follows it must clear its glyphs.
 *
 * Returns the baseline-to-baseline distance and the distance below which the
 * two lines start sharing pixels — the descenders of the line above reaching
 * into the ascenders of the line below.
 *
 * The lower bound is 10.5 rather than 14 because the name is set at two sizes:
 * 16pt when there is no logo, and 11pt under one, where the wordmark is
 * already carrying the brand. Both have to clear the address line under them,
 * and the 11pt case is the tighter of the two.
 */
export function headerSpacing(buffer: Buffer): { gap: number; needed: number } {
  const lines = drawnLines(buffer);
  // Upper bound because a CANCELLED or PAID watermark is drawn first, at 62pt.
  // It is positioned absolutely and sits outside the flow, so it neither
  // collides with anything nor says anything about the header's spacing.
  const index = lines.findIndex((line) => line.size >= 10.5 && line.size < 30);
  if (index === -1 || index + 1 >= lines.length) return { gap: 0, needed: 1 };

  const above = lines[index];
  const below = lines[index + 1];
  return {
    // PDF user space counts upward, so the line below has the smaller y.
    gap: above.y - below.y,
    needed: above.size * DESCENT + below.size * ASCENT,
  };
}

/**
 * How many runs are drawn at one font size, across every page.
 *
 * The policy clauses are the only thing InvoiceDocument sets to 8pt, so this
 * counts them without having to decode a subset font's glyph ids back into
 * text. A wrapped clause draws more than one run, which is why the assertions
 * below are lower bounds.
 */
export function linesAtSize(buffer: Buffer, size: number): number {
  return decompressedStreams(buffer)
    .filter((stream) => stream.includes("BT") && stream.includes("Tf"))
    .flatMap((stream) => drawnLinesIn(stream))
    .filter((line) => line.size === size).length;
}

/** How many times an image XObject is actually painted. */
export function imageDraws(buffer: Buffer): number {
  return decompressedStreams(buffer)
    .filter((stream) => stream.includes("BT"))
    .reduce(
      (count, stream) => count + (stream.match(/\/I\d+ Do/g) ?? []).length,
      0,
    );
}

/** Does any drawn string use multi-byte glyph ids (embedded font) rather than WinAnsi? */
export function usesEmbeddedGlyphs(buffer: Buffer): boolean {
  const text = buffer.toString("latin1");
  let index = 0;
  for (;;) {
    const start = text.indexOf("stream", index);
    if (start === -1) return false;
    const bodyStart = start + (text[start + 6] === "\r" ? 8 : 7);
    const end = text.indexOf("endstream", bodyStart);
    if (end === -1) return false;
    try {
      const inflated = inflateSync(buffer.subarray(bodyStart, end)).toString(
        "latin1",
      );
      // A byte-encoded core font draws <b9...>; an embedded subset draws
      // 4-hex-digit glyph ids, so the hex string length is a multiple of 4 and
      // is much longer than the visible character count.
      const hex = inflated.match(/<([0-9a-f]{8,})>/i);
      if (hex && hex[1].length % 4 === 0) return true;
    } catch {
      /* font file or raw stream */
    }
    index = end + 9;
  }
}

/**
 * Which pages drew a run at one font size, as 0-based page indices.
 *
 * `linesAtSize` counts across the whole document, which cannot answer "is the
 * price on the first page?" — and for a document that spills, that is the
 * question. Content streams come back in page order, so the index is the page.
 */
export function pagesWithSize(buffer: Buffer, size: number): number[] {
  return decompressedStreams(buffer)
    .filter((stream) => stream.includes("BT") && stream.includes("Tf"))
    .map((stream, page) =>
      drawnLinesIn(stream).some((line) => line.size === size) ? page : -1,
    )
    .filter((page) => page >= 0);
}

/* fontkit is @react-pdf/renderer's own font parser, already installed. Typed
   loosely here because it ships no types this script can reach, and cached
   because missingGlyphs is called once per source file per face. */
type Cmap = { glyphsForString: (text: string) => { id: number }[] };
const fontCache = new Map<string, Cmap>();

function openFont(fontPath: string): Cmap {
  const cached = fontCache.get(fontPath);
  if (cached) return cached;
  const font = createFont(readFileSync(fontPath)) as unknown as Cmap;
  fontCache.set(fontPath, font);
  return font;
}

/**
 * Which characters of `text` the font at `fontPath` has no glyph for.
 *
 * Checked against the FONT, not against a rendered page, because a rendered
 * page cannot answer the question. @react-pdf/renderer does not draw .notdef
 * for a character it cannot set and does not warn: it splits the text run and
 * the character is simply absent from the output. The PDF is valid, the layout
 * engine is happy, and the only difference is a figure with a symbol missing
 * from the front of it. That is how "≈ ₹1,04,500" shipped in the
 * quotation's per-person band — the ≈ was never drawn and nothing said so.
 *
 * So the check runs over the SOURCE: every non-ASCII character a document
 * hard-codes, against the cmap of the font it will be set in. Deduplicated, in
 * first-seen order, so a failure names the character once rather than once per
 * occurrence.
 */
export function missingGlyphs(text: string, fontPath: string): string[] {
  const font = openFont(fontPath);

  const missing: string[] = [];
  for (const char of new Set([...text])) {
    // ASCII is in every font worth registering, and skipping it keeps this
    // fast enough to run over a whole directory.
    if (char.codePointAt(0)! < 128) continue;
    const glyphs = font.glyphsForString(char);
    if (!glyphs.length || glyphs.some((glyph) => glyph.id === 0)) {
      missing.push(char);
    }
  }
  return missing;
}
