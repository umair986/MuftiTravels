/**
 * Renders a JSON-LD block.
 *
 * Kept as one component so every schema on the site is escaped the same way:
 * `<` is replaced so a stray character in package copy can never close the
 * script tag early.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
