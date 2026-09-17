/**
 * Re-encode an image data URI into something @react-pdf/renderer draws
 * faithfully. Browser only — it needs a canvas.
 *
 * Why this exists: the renderer's PNG decoder (pdfkit's png-js) mis-reads
 * palette PNGs with a bit depth below 8. A 4-bit logo — exactly what
 * TinyPNG-style compressors produce when squeezing a file under the 400 KB
 * cap — is unpacked at the wrong row width and prints as TWO squashed copies
 * side by side, with the palette colours shifted. Nothing throws, and the
 * settings preview looks perfect, because the browser's own decoder is fine.
 * Reproduced by rendering the same logo as 1-, 2-, 4- and 8-bit PNGs: only
 * the 8-bit ones survive.
 *
 * A canvas always encodes 8-bit RGBA, non-interlaced, so a round trip through
 * one sidesteps the whole class. Rejected: sniffing the IHDR and re-encoding
 * only the bad cases — it would have to track png-js's bugs one by one, and
 * the round trip of a logo-sized image costs a few milliseconds.
 *
 * JPEG is passed through untouched: pdfkit embeds it as-is rather than
 * decoding it, and turning a photo into a PNG only makes it heavier. Anything
 * else the browser can decode (WebP, GIF, BMP) comes out as PNG, which the
 * renderer would otherwise refuse outright.
 */
export async function toPdfSafeImage(
  dataUri: string,
  /** Scale down (never up) to fit this box, in pixels. */
  maxBox?: { width: number; height: number },
): Promise<string> {
  if (!dataUri || typeof document === "undefined") return dataUri;
  if (/^data:image\/jpe?g[;,]/i.test(dataUri)) return dataUri;

  const image = new Image();
  image.src = dataUri;
  await image.decode();

  const scale = maxBox
    ? Math.min(
        1,
        maxBox.width / image.naturalWidth,
        maxBox.height / image.naturalHeight,
      )
    : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return dataUri;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
