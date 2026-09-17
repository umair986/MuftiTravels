/**
 * Guides — the informational articles (/guides/…).
 *
 * The SEO audit's slowest lever: pages that answer the questions pilgrims ask
 * before they are ready to book ("what documents do I need for Umrah"), which
 * is how an operator earns the authority to rank for the commercial terms.
 *
 * Articles live in code, as typed data under src/content/guides, rather than
 * in the admin. They are written rarely, carefully and with sources, and a
 * wrong statement about visas or vaccines is worse than no article — so each
 * one goes through review like any other change. If guides start being written
 * weekly, that is the point to move them into Supabase.
 *
 * Every factual claim should be traceable to an entry in `sources`, and
 * `reviewed` is the date those sources were last checked. Rules change —
 * re-check before bumping it.
 */

import { howToPerformUmrah } from "@/content/guides/how-to-perform-umrah";
import { umrahDocumentsFromIndia } from "@/content/guides/umrah-documents-from-india";

/**
 * Inline text. `[label](https://…)` becomes a link and `**text**` bold;
 * nothing else is interpreted, so copy can contain any other character.
 */
export type RichText = string;

export type GuideBlock =
  | { type: "p"; text: RichText }
  | { type: "list"; items: RichText[]; ordered?: boolean }
  | { type: "callout"; tone: "info" | "warning"; title: string; text: RichText }
  | { type: "checklist"; items: RichText[] };

export type GuideSection = {
  /** Anchor id for the table of contents. */
  id: string;
  heading: string;
  blocks: GuideBlock[];
};

export type Guide = {
  slug: string;
  /** Visible <h1>. */
  title: string;
  /** <title>. Keep under ~60 characters. */
  metaTitle: string;
  /** Meta description and the card summary on /guides. */
  description: string;
  /** One line above the heading. */
  eyebrow: string;
  /** ISO dates. */
  published: string;
  reviewed: string;
  readingMinutes: number;
  image: { src: string; alt: string };
  intro: RichText[];
  sections: GuideSection[];
  faqs: { question: string; answer: string }[];
  sources: { label: string; url: string }[];
};

/** Newest first. */
export const GUIDES: Guide[] = [howToPerformUmrah, umrahDocumentsFromIndia];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** `[label](url)` and `**bold**`, split into renderable pieces. */
export type InlinePiece =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string };

export function parseInline(text: RichText): InlinePiece[] {
  const pieces: InlinePiece[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ kind: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) {
      pieces.push({ kind: "link", text: match[1], href: match[2] });
    } else {
      pieces.push({ kind: "bold", text: match[3] });
    }
    last = index + match[0].length;
  }
  if (last < text.length) pieces.push({ kind: "text", text: text.slice(last) });
  return pieces;
}

/** Plain text of a rich string, for FAQ schema and meta tags. */
export function plainText(text: RichText): string {
  return parseInline(text)
    .map((piece) => piece.text)
    .join("");
}
