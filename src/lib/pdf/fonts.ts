import { Font } from "@react-pdf/renderer";

/**
 * Register the face that can actually draw a rupee sign.
 *
 * @react-pdf/renderer's built-in fonts are the PDF core set, which use
 * WinAnsiEncoding. U+20B9 has no slot in it, and the failure is silent and
 * plausible rather than obvious: measured against a real render, "₹100" comes
 * out as the byte 0xb9 followed by "100" — and 0xb9 in WinAnsi is "¹". The
 * invoice reads "¹100" and nothing errors.
 *
 *   core Helvetica  ->  <b9313030>
 *   Noto Sans       ->  <0001000200030003>   (real glyph ids)
 *
 * So this is not a nicety. Any change to the PDF font stack has to be checked
 * against a rendered file, never a preview.
 *
 * The files are served from /public, so the browser fetches them same-origin.
 * They are the full faces (~556 KB each): @react-pdf/renderer subsets what it
 * EMBEDS in the document — the four-glyph test PDF grew by only ~1.4 KB — but
 * the browser still downloads the whole face to do that subsetting. Acceptable
 * behind a dynamic import on an admin-only screen; not acceptable on a public
 * page, which is one more reason this never leaves /admin.
 */

export const PDF_FONT_FAMILY = "Noto Sans";

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: "/fonts/NotoSans-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/NotoSans-SemiBold.ttf", fontWeight: 600 },
    ],
  });

  // Without this, long unbroken strings (a UPI id, a URL in the terms) run off
  // the page rather than wrapping. The default hyphenation would break real
  // words in odd places on an invoice, so it is replaced with "never split".
  Font.registerHyphenationCallback((word) => [word]);
}
