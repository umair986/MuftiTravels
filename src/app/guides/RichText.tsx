import { Fragment } from "react";
import { parseInline, type RichText as RichTextValue } from "@/lib/guides";

/**
 * Renders guide copy. Only `[label](url)` and `**bold**` are interpreted, and
 * the result is built as React nodes — never injected as HTML.
 */
export default function RichText({ text }: { text: RichTextValue }) {
  return (
    <>
      {parseInline(text).map((piece, index) => {
        if (piece.kind === "bold") {
          return (
            <strong key={index} className="font-semibold text-[#06131D]">
              {piece.text}
            </strong>
          );
        }
        if (piece.kind === "link") {
          const external = /^https?:\/\//.test(piece.href);
          return (
            <a
              key={index}
              href={piece.href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="font-medium text-[#997A15] underline decoration-[#D4AF37]/50 underline-offset-2 transition hover:decoration-[#D4AF37]"
            >
              {piece.text}
            </a>
          );
        }
        return <Fragment key={index}>{piece.text}</Fragment>;
      })}
    </>
  );
}
