/**
 * Tests for the guide copy parser and the guide registry.
 *
 * Guides make claims about visas and vaccines, so a link that silently fails
 * to render (and leaves raw `[label](url)` on the page) or a claim with no
 * source behind it is worth catching before it ships.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GUIDES, parseInline, plainText } from "./guides";

describe("parseInline", () => {
  it("splits links and bold out of plain text", () => {
    assert.deepEqual(
      parseInline("See **Nusuk** at [the portal](https://umrah.nusuk.sa/) now."),
      [
        { kind: "text", text: "See " },
        { kind: "bold", text: "Nusuk" },
        { kind: "text", text: " at " },
        { kind: "link", text: "the portal", href: "https://umrah.nusuk.sa/" },
        { kind: "text", text: " now." },
      ],
    );
  });

  it("leaves other punctuation alone", () => {
    assert.deepEqual(parseInline("Cash (above SAR 60,000) * [note]"), [
      { kind: "text", text: "Cash (above SAR 60,000) * [note]" },
    ]);
  });

  it("gives plain text for schema and meta tags", () => {
    assert.equal(plainText("A [link](https://x.gov.in) and **bold**."), "A link and bold.");
  });
});

describe("GUIDES", () => {
  it("has unique slugs", () => {
    const slugs = GUIDES.map((guide) => guide.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  for (const guide of GUIDES) {
    it(`${guide.slug}: every link in the copy is an https source or a site path`, () => {
      const texts = [
        ...guide.intro,
        ...guide.sections.flatMap((section) =>
          section.blocks.flatMap((block) =>
            block.type === "list" || block.type === "checklist"
              ? block.items
              : [block.text],
          ),
        ),
      ];
      for (const text of texts) {
        assert.ok(!/\]\(/.test(plainText(text)), `unparsed link in: ${text}`);
        for (const piece of parseInline(text)) {
          if (piece.kind === "link") {
            assert.match(piece.href, /^(https:\/\/|\/)/, piece.href);
          }
        }
      }
    });

    it(`${guide.slug}: cites sources and has valid dates`, () => {
      assert.ok(guide.sources.length > 0);
      assert.ok(!Number.isNaN(Date.parse(guide.published)));
      assert.ok(guide.reviewed >= guide.published);
    });
  }
});
