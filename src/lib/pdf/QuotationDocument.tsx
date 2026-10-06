import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatTaxRate } from "../finance";
import { formatPaise, paiseToWords } from "../money";
import type { BusinessProfileRecord } from "../invoices";
import { stateNameForCode } from "../invoices";
import { perPersonPaise, type QuotationItemRecord, type QuotationRecord } from "../quotations";
import type { InvoicePolicyList } from "../siteContent";
import {
  BusinessBlock,
  GOLD,
  INK,
  MUTED,
  MetaLine,
  PdfFooter,
  RULE,
  SignaturePanel,
  baseStyles,
  formatPdfDate,
} from "./shared";

/**
 * The quotation document. Its siblings are InvoiceDocument.tsx and
 * ReceiptDocument.tsx; the letterhead all three share is in shared.tsx.
 *
 * Like the other two it does no lookups — everything it draws was passed in.
 * Unlike them it is a SALES document, and three things follow from that:
 *
 *   1. It prints the per-person figure in a band of its own. "Ten people, about
 *      ₹1,04,500 each" is the number being negotiated; the grand total is the
 *      consequence. An invoice has no equivalent, because by then the deal is
 *      done.
 *
 *   2. It prints inclusions and exclusions. The invoice deliberately does not
 *      (Decision 8 of docs/finance-expenses-and-invoicing.md): restating
 *      marketing copy on a demand for money invites an argument about whether a
 *      promise was kept. A quotation is SOLD on them — a customer comparing us
 *      to the agent down the road is comparing hotel distance and meal plan, not
 *      the total.
 *
 *   3. It states when it stops being true. An offer with no expiry is not an
 *      offer, so the validity date is in the header AND in a closing line.
 *
 * It carries no GSTIN and no "TAX INVOICE" title: a quotation is not a taxable
 * supply, and showing tax identifiers on one invites it to be filed as a bill.
 * The tax LINES still print when GST is switched on, because a quoted total the
 * customer cannot reconcile against the eventual invoice is worse than useless.
 *
 * ---------------------------------------------------------------------------
 * On lineHeight, which is not the CSS rule it looks like.
 *
 * @react-pdf/renderer resolves a unitless `lineHeight` into an ABSOLUTE value
 * using the fontSize in THE SAME style object, and that absolute value then
 * inherits. `page` sets fontSize 9 / lineHeight 1.45, so everything beneath it
 * inherits a 13.05pt line box — including any larger type, whose glyphs then
 * draw straight over the line below.
 *
 * SO ANY STYLE THAT CHANGES fontSize MUST RESTATE lineHeight BESIDE IT. This
 * document has more type sizes than the invoice (the per-person band, two
 * content lists, the annexure), so it has more chances to get this wrong.
 * scripts/render-quotation-check.mts measures the rendered output for exactly
 * this, because nothing throws when it is wrong.
 * ---------------------------------------------------------------------------
 */

const styles = {
  ...baseStyles,
  ...StyleSheet.create({
    tableHead: {
      flexDirection: "row",
      backgroundColor: "#F3EFEA",
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: RULE,
      paddingVertical: 5,
      paddingHorizontal: 4,
      fontSize: 7.5,
      lineHeight: 1.45,
      fontWeight: 600,
      letterSpacing: 0.6,
      color: MUTED,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#EFEAE2",
      paddingVertical: 4,
      paddingHorizontal: 4,
    },

    colIndex: { width: 20 },
    colDescription: { flex: 1, paddingRight: 8 },
    colQty: { width: 36, textAlign: "right" },
    colRate: { width: 78, textAlign: "right" },
    colAmount: { width: 82, textAlign: "right" },

    grandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderColor: RULE,
      marginTop: 4,
      paddingTop: 5,
      /* 11.5pt, not the 11pt the invoice uses, and the half point is not
         decoration: baseStyles.strongLine is 11pt and sets the customer's name,
         so at 11pt "is the total on this page?" could be answered yes by the
         name alone. render-quotation-check.mts needs to locate the totals block
         exactly — it is what the per-person band must never be separated from —
         and a size used nowhere else is what makes that measurable. It also
         reads correctly: this is the headline figure on the page. */
      fontSize: 11.5,
      lineHeight: 1.45,
      fontWeight: 600,
    },

    /* The figure the customer asked for. Gold, because it is the one line on
       the page they will read out loud to whoever is travelling with them. */
    perPerson: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 5,
      paddingVertical: 5,
      paddingHorizontal: 7,
      backgroundColor: "#FFFCF3",
      borderWidth: 1,
      borderColor: "#EBD9A0",
      borderRadius: 3,
      /* 10.5pt is deliberately a size NOTHING else on this page uses. It keeps
         the figure just under the grand total in the visual hierarchy, and it
         lets render-quotation-check.mts count this band's runs exactly rather
         than inferring them from a diff of 11pt runs. */
      fontSize: 10.5,
      lineHeight: 1.45,
      fontWeight: 600,
      color: GOLD,
    },
    perPersonMeta: {
      fontSize: 7.5,
      lineHeight: 1.45,
      fontWeight: 400,
      color: MUTED,
    },

    /* ------------------------------------------- inclusions / exclusions */

    listPanel: {
      borderWidth: 1,
      borderColor: RULE,
      borderRadius: 3,
      padding: 8,
      flex: 1,
    },
    /* A bullet row, not a "• " prefix on the text: a prefix makes the second
       line of a wrapped item hang under the dot instead of under the words. */
    bulletRow: { flexDirection: "row", paddingVertical: 0.5 },
    bulletDot: { width: 9, color: GOLD },
    bulletText: { flex: 1, fontSize: 8, lineHeight: 1.35, color: MUTED },
    crossDot: { width: 9, color: MUTED },

    validity: {
      marginTop: 9,
      borderWidth: 1,
      borderColor: "#EBD9A0",
      borderRadius: 3,
      paddingVertical: 5,
      paddingHorizontal: 8,
      backgroundColor: "#FFFCF3",
    },

    /* ---------------------------------------------------------- policies */

    annexTitle: {
      fontSize: 13,
      lineHeight: 1.45,
      fontWeight: 600,
      letterSpacing: 1.6,
      color: GOLD,
    },
    policyBlock: {
      borderWidth: 1,
      borderColor: RULE,
      borderRadius: 3,
      padding: 9,
      marginTop: 9,
    },
    policyHeading: {
      fontSize: 9.5,
      lineHeight: 1.45,
      fontWeight: 600,
      letterSpacing: 0.5,
      color: GOLD,
      borderBottomWidth: 1,
      borderBottomColor: RULE,
      paddingBottom: 4,
      marginBottom: 5,
    },
  }),
};

/** 2 -> "2", 2.5 -> "2.50". Quantity is numeric(10,2) in the database. */
function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function QuotationDocument({
  quotation,
  items,
  business,
  policies,
}: {
  quotation: QuotationRecord;
  items: QuotationItemRecord[];
  business: BusinessProfileRecord;
  /** The frozen snapshot once sent, the live lists for a draft. Caller decides. */
  policies?: InvoicePolicyList[];
}) {
  const hasTax = quotation.tax_mode !== "none" && quotation.tax_rate_bp > 0;
  const number = quotation.number ?? "DRAFT";

  const customerState =
    quotation.customer_state || stateNameForCode(quotation.customer_state_code);

  const perPerson = perPersonPaise(quotation.total_paise, quotation.pax);

  const inclusions = (quotation.inclusions ?? []).filter((line) => line.trim());
  const exclusions = (quotation.exclusions ?? []).filter((line) => line.trim());

  const policyLists = (
    quotation.show_policies === false ? [] : (policies ?? [])
  ).filter((list) => list.items.length > 0);

  const hasBank = Boolean(
    business.bank_name || business.bank_account_number || business.upi_id,
  );

  // Printed in the header beside the number, so a customer holding two copies
  // can tell which one is the later offer without comparing prices line by line.
  const revisionLabel =
    quotation.revision > 1 ? `Revision ${quotation.revision}` : "";

  return (
    <Document
      title={`Quotation ${quotation.number ?? ""}`.trim()}
      author={business.legal_name}
      subject={`Quotation for ${quotation.customer_name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* ------------------------------------------------------- header --- */}
        <View style={styles.spread}>
          {/* No GSTIN or PAN: this is not a taxable supply, and printing tax
              identifiers on a quotation invites it to be filed as a bill. */}
          <BusinessBlock business={business} showTaxIds={false} />

          <View style={{ width: 200 }}>
            <Text style={styles.title}>QUOTATION</Text>
            <View style={{ marginTop: 8 }}>
              <MetaLine label="Quotation no." value={number} strong />
              <MetaLine
                label="Date"
                value={formatPdfDate(quotation.sent_on ?? quotation.quote_date)}
              />
              {quotation.valid_until ? (
                <MetaLine
                  label="Valid until"
                  value={formatPdfDate(quotation.valid_until)}
                  strong
                />
              ) : null}
              {revisionLabel ? (
                <MetaLine label="Version" value={revisionLabel} />
              ) : null}
              {quotation.departure_city ? (
                <MetaLine label="Departure" value={quotation.departure_city} />
              ) : null}
              {quotation.travel_date ? (
                <MetaLine
                  label="Travel"
                  value={formatPdfDate(quotation.travel_date)}
                />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ------------------------------------------------ prepared for --- */}
        {/* "PREPARED FOR", not "BILL TO". Nothing is owed yet, and a heading
            that says otherwise on a first contact reads as presumptuous. */}
        <View style={styles.row}>
          <View style={styles.panel}>
            <Text style={styles.panelHeading}>PREPARED FOR</Text>
            <Text style={styles.strongLine}>
              {quotation.customer_name || "—"}
            </Text>
            {quotation.customer_address ? (
              <Text style={styles.muted}>{quotation.customer_address}</Text>
            ) : null}
            {customerState ? (
              <Text style={styles.muted}>{customerState}</Text>
            ) : null}
            {quotation.customer_phone ? (
              <Text style={styles.muted}>{quotation.customer_phone}</Text>
            ) : null}
            {quotation.customer_email ? (
              <Text style={styles.muted}>{quotation.customer_email}</Text>
            ) : null}
          </View>
        </View>

        {/* ----------------------------------------------------- items ----- */}
        {/* The rate column says PER PERSON and the quantity column says PAX,
            because that is the shape of the conversation this document is
            answering. On an invoice the same columns are RATE and QTY. */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.tableHead} fixed>
            <Text style={styles.colIndex}>#</Text>
            <Text style={styles.colDescription}>DESCRIPTION</Text>
            <Text style={styles.colQty}>PAX</Text>
            <Text style={styles.colRate}>PER PERSON (INR)</Text>
            <Text style={styles.colAmount}>AMOUNT (INR)</Text>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.colIndex}>{index + 1}</Text>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>
                {formatQuantity(Number(item.quantity))}
              </Text>
              <Text style={styles.colRate}>
                {formatPaise(item.unit_price_paise)}
              </Text>
              <Text style={styles.colAmount}>
                {formatPaise(item.line_total_paise)}
              </Text>
            </View>
          ))}
        </View>

        {/* ---------------------------------------------------- totals ----- */}
        {/* wrap={false}: the amount in words and the figure it spells out are
            one statement and must not be split across a page break. */}
        <View style={[styles.spread, { marginTop: 12 }]} wrap={false}>
          <View style={{ flex: 1, paddingRight: 18 }}>
            <View style={[styles.words, { marginTop: 0 }]}>
              <Text style={[styles.wordsLabel, { width: "auto" }]}>
                AMOUNT IN WORDS
              </Text>
              <Text>
                {quotation.amount_in_words || paiseToWords(quotation.total_paise)}
              </Text>
            </View>
          </View>

          <View style={{ width: 250 }}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text>{formatPaise(quotation.subtotal_paise)}</Text>
            </View>

            {quotation.discount_paise > 0 ? (
              <View style={styles.totalLine}>
                {/* The percentage is the concession that was negotiated. A bare
                    rupee figure throws away the reason it was given. */}
                <Text style={styles.totalLabel}>
                  Discount
                  {quotation.discount_mode === "percent" &&
                  quotation.discount_percent_bp > 0
                    ? ` (${formatTaxRate(quotation.discount_percent_bp)})`
                    : ""}
                </Text>
                <Text>- {formatPaise(quotation.discount_paise)}</Text>
              </View>
            ) : null}

            {hasTax ? (
              <>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Taxable value</Text>
                  <Text>{formatPaise(quotation.taxable_paise)}</Text>
                </View>
                {quotation.tax_mode === "cgst_sgst" ? (
                  <>
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>
                        CGST @ {formatTaxRate(quotation.tax_rate_bp / 2)}
                      </Text>
                      <Text>{formatPaise(quotation.cgst_paise)}</Text>
                    </View>
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>
                        SGST @ {formatTaxRate(quotation.tax_rate_bp / 2)}
                      </Text>
                      <Text>{formatPaise(quotation.sgst_paise)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>
                      IGST @ {formatTaxRate(quotation.tax_rate_bp)}
                    </Text>
                    <Text>{formatPaise(quotation.igst_paise)}</Text>
                  </View>
                )}
              </>
            ) : null}

            {quotation.round_off_paise !== 0 ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Round off</Text>
                <Text>
                  {quotation.round_off_paise < 0 ? "- " : ""}
                  {formatPaise(Math.abs(quotation.round_off_paise))}
                </Text>
              </View>
            ) : null}

            <View style={styles.grandTotal}>
              <Text>Total</Text>
              <Text>₹{formatPaise(quotation.total_paise)}</Text>
            </View>

            {perPerson !== null && quotation.pax && quotation.pax > 1 ? (
              <View style={styles.perPerson}>
                <View>
                  <Text>Per person</Text>
                  <Text style={styles.perPersonMeta}>
                    {quotation.pax} travellers
                  </Text>
                </View>
                {/* "approx." because this is a floor of a division that rarely
                    comes out even, and a quotation that implies false precision
                    about a per-head rate invites an argument at the counter. */}
                <Text>≈ ₹{formatPaise(perPerson)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ------------------------------------------- what this includes --- */}
        {inclusions.length || exclusions.length ? (
          <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
            {inclusions.length ? (
              <View style={styles.listPanel}>
                <Text style={styles.panelHeading}>WHAT THIS INCLUDES</Text>
                {inclusions.map((line, index) => (
                  <View
                    key={`inc-${index}-${line.slice(0, 24)}`}
                    style={styles.bulletRow}
                  >
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {exclusions.length ? (
              <View style={styles.listPanel}>
                <Text style={styles.panelHeading}>NOT INCLUDED</Text>
                {exclusions.map((line, index) => (
                  <View
                    key={`exc-${index}-${line.slice(0, 24)}`}
                    style={styles.bulletRow}
                  >
                    {/* An en dash rather than a cross: the list is informative,
                        not a warning. */}
                    <Text style={styles.crossDot}>–</Text>
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* -------------------------------------------------- validity ----- */}
        {/* One paragraph, not two. The first draft said "valid until" in a gold
            line and then said it again in the small print, which cost the page a
            line it did not have. */}
        <View style={styles.validity}>
          <Text style={{ color: GOLD, fontWeight: 600 }}>
            {quotation.valid_until
              ? `Valid until ${formatPdfDate(quotation.valid_until)}.`
              : "Subject to availability at the time of booking."}
            <Text style={styles.tiny}>
              {"  "}Rates are per person on the sharing shown and depend on
              flight and hotel availability. Seats confirm on receipt of the
              booking advance. This is a quotation, not an invoice — no payment
              is due against it.
            </Text>
          </Text>
        </View>

        {/* --------------------------------------------- how to proceed ---- */}
        <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
          {hasBank ? (
            <View style={styles.panel}>
              <Text style={styles.panelHeading}>TO CONFIRM YOUR BOOKING</Text>
              <Text style={styles.muted}>
                Confirm by reply and we will raise your invoice. Payment details,
                for when you are ready:
              </Text>
              {business.bank_name ? (
                <Text style={{ marginTop: 2 }}>{business.bank_name}</Text>
              ) : null}
              {business.bank_account_number ? (
                <Text style={styles.muted}>
                  A/c {business.bank_account_number}
                  {business.bank_ifsc ? ` · IFSC ${business.bank_ifsc}` : ""}
                </Text>
              ) : null}
              {business.upi_id ? (
                <Text style={styles.muted}>UPI {business.upi_id}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.panelHeading}>TO CONFIRM YOUR BOOKING</Text>
              <Text style={styles.muted}>
                Reply to confirm and we will raise your invoice with payment
                details.
              </Text>
            </View>
          )}

          <SignaturePanel business={business} />
        </View>

        {quotation.notes ? (
          <View style={[styles.row, { marginTop: 9 }]}>
            <Text style={[styles.panelHeading, { width: 78, marginBottom: 0 }]}>
              NOTES
            </Text>
            <Text style={[styles.muted, { flex: 1 }]}>{quotation.notes}</Text>
          </View>
        ) : null}

        <PdfFooter
          label={`Quotation ${number}${revisionLabel ? ` · ${revisionLabel}` : ""}`}
          business={business}
        />

        {/* ------------------------------------------------- policies ----- */}
        {/* On its own page, for the same reason the invoice puts them there:
            thirty-odd lines of terms threaded in above would push the price
            itself onto a second page and bury the thing the customer opened
            the file to see. */}
        {policyLists.length ? (
          <View break>
            <Text style={styles.annexTitle}>POLICIES &amp; IMPORTANT NOTES</Text>
            <Text style={[styles.tiny, { marginTop: 3 }]}>
              These terms would form part of your booking against{" "}
              {quotation.number ?? "this quotation"}, and are the terms published
              on {business.website || "our website"} at the time it was prepared.
            </Text>

            {policyLists.map((list) => (
              <View
                key={list.title}
                style={styles.policyBlock}
                // Keeps a heading from being the last thing on a page with its
                // clauses stranded overleaf.
                minPresenceAhead={48}
              >
                <Text style={styles.policyHeading}>{list.title}</Text>
                {list.items.map((item, index) => (
                  <View
                    key={`${index}-${item.slice(0, 24)}`}
                    style={styles.bulletRow}
                  >
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}

            <Text style={[styles.tiny, { marginTop: 9, color: INK }]}>
              Confirming this quotation is taken as acceptance of the terms above.
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
