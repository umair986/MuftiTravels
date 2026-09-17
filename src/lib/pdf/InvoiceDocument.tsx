import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatTaxRate, taxModeLabel } from "../finance";
import { formatPaise, paiseToWords } from "../money";
import type {
  BusinessProfileRecord,
  InvoiceItemRecord,
  InvoicePayment,
  InvoiceRecord,
} from "../invoices";
import { stateNameForCode } from "../invoices";
import type { InvoicePolicyList } from "../siteContent";
import {
  BusinessBlock,
  GOLD,
  INK,
  MUTED,
  MetaLine,
  PAID,
  PdfFooter,
  RULE,
  SignaturePanel,
  baseStyles,
  formatPdfDate,
} from "./shared";

/**
 * The invoice document. Its companion, the per-payment receipt, is
 * ReceiptDocument.tsx; the letterhead both share is in shared.tsx.
 *
 * Everything it draws comes from the invoice row, the payments and the business
 * profile that were passed in — it does no lookups, because an issued invoice
 * is a historical fact and must render identically in a year's time.
 *
 * It exists in two states, each stored as its own file (invoicePdfPath):
 *   - as issued: the bill, ending on "Payment pending" and the total.
 *   - settled: the same bill, plus the receipts that cleared it and a nil
 *     balance, stamped PAID. This is the final statement the customer keeps —
 *     the same invoice number, never a second invoice.
 *
 * Amounts print without the ₹ glyph in the items table (the column header says
 * so) and with it on the totals, which keeps the numeric columns aligned while
 * still being unambiguous where it matters.
 *
 * ---------------------------------------------------------------------------
 * On lineHeight, which is not the CSS rule it looks like.
 *
 * @react-pdf/renderer resolves a unitless `lineHeight` into an ABSOLUTE value
 * using the fontSize found in THE SAME style object, and then that absolute
 * value inherits. `page` here sets fontSize 9 and lineHeight 1.45, so every
 * descendant inherits a 13.05pt line box — including the 16pt business name,
 * whose glyphs are ~21.8pt tall. It drew straight over the address beneath it.
 *
 * So any style that changes fontSize MUST restate lineHeight beside it. Both
 * numbers have to sit in one object to multiply together; splitting them is
 * what caused the overlap. Checked in scripts/render-invoice-check.mts, which
 * measures the header offsets in the rendered file rather than trusting this
 * comment.
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
      paddingVertical: 5,
      paddingHorizontal: 4,
    },

    colIndex: { width: 20 },
    colDescription: { flex: 1, paddingRight: 8 },
    colSac: { width: 46 },
    colQty: { width: 34, textAlign: "right" },
    colRate: { width: 66, textAlign: "right" },
    colAmount: { width: 76, textAlign: "right" },

    /* The receipts list on a settled invoice. Smaller than the items table:
       it sits in the otherwise empty space beside the totals, so listing the
       payments costs the page no height at all for the usual two or three. */
    receiptsHead: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: RULE,
      paddingBottom: 2,
      fontSize: 7,
      lineHeight: 1.45,
      fontWeight: 600,
      letterSpacing: 0.5,
      color: MUTED,
    },
    receiptsRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#EFEAE2",
      paddingVertical: 2,
      fontSize: 8,
      lineHeight: 1.45,
    },
    colReceipt: { flex: 1, paddingRight: 6 },
    colReceiptDate: { width: 62 },
    colReceiptAmount: { width: 66, textAlign: "right" },

    grandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderColor: RULE,
      marginTop: 4,
      paddingTop: 5,
      fontSize: 11,
      lineHeight: 1.45,
      fontWeight: 600,
    },

    /* CANCELLED and PAID. One line, positioned absolutely and outside the flow,
       which is why this is the one place a tighter lineHeight is safe. */
    stamp: {
      position: "absolute",
      top: 250,
      left: 90,
      fontSize: 62,
      lineHeight: 1.1,
      fontWeight: 600,
      opacity: 0.16,
      transform: "rotate(-24deg)",
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
    /* A bullet row, not a "• " prefix on the text: a prefix makes the second
       line of a wrapped clause hang under the dot instead of under the words. */
    bulletRow: { flexDirection: "row", paddingVertical: 1.5 },
    bulletDot: { width: 10, color: GOLD },
    bulletText: { flex: 1, fontSize: 8, lineHeight: 1.4, color: MUTED },
  }),
};

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function InvoiceDocument({
  invoice,
  items,
  business,
  payments,
  policies,
}: {
  invoice: InvoiceRecord;
  items: InvoiceItemRecord[];
  business: BusinessProfileRecord;
  /**
   * The receipts against this invoice, oldest first. Printed only once the
   * invoice is settled — before that the bill says "Payment pending" and the
   * progress lives on the receipts, each of which states its own balance.
   */
  payments?: InvoicePayment[];
  /**
   * The policies and important notes to print, already resolved by the caller
   * — an issued invoice hands over its frozen snapshot, a draft the live site
   * lists. This component does no lookups of its own, for the same reason it
   * does none for anything else: the same inputs must draw the same page in a
   * year's time.
   */
  policies?: InvoicePolicyList[];
}) {
  // "Tax invoice" is a specific thing under GST. Calling a document that
  // charges no tax by that name would be wrong, so the title follows the mode.
  const isTaxInvoice = invoice.tax_mode !== "none";

  /**
   * Settled follows `paid_in_full`, which migration 023 keeps in step with
   * the payments ledger. One value drives the stamp, the balance band and the
   * receipts list, so the page can never stamp PAID over a balance due.
   */
  const isSettled = invoice.paid_in_full;
  const received = isSettled ? (payments ?? []) : [];
  const receivedPaise = received.reduce((sum, row) => sum + row.amount_paise, 0);
  const lastPaidOn = received.length
    ? received[received.length - 1].paid_on
    : null;

  const documentTitle = isTaxInvoice ? "TAX INVOICE" : "INVOICE";

  const customerState =
    invoice.customer_state || stateNameForCode(invoice.customer_state_code);

  // `show_policies` is undefined on a row read before migration 021; an
  // invoice that predates the column still prints nothing, because its
  // snapshot is empty and a caller that knows nothing about policies passes
  // none.
  const policyLists = (
    invoice.show_policies === false ? [] : (policies ?? [])
  ).filter((list) => list.items.length > 0);

  const hasBank = Boolean(
    business.bank_name ||
      business.bank_account_number ||
      business.upi_id,
  );

  return (
    <Document
      title={`Invoice ${invoice.number ?? ""}`.trim()}
      author={business.legal_name}
      subject={`Invoice for ${invoice.customer_name}`}
    >
      <Page size="A4" style={styles.page}>
        {invoice.status === "cancelled" ? (
          <Text style={[styles.stamp, { color: "#D64545" }]} fixed>
            CANCELLED
          </Text>
        ) : isSettled ? (
          <Text style={[styles.stamp, { color: PAID, left: 130 }]} fixed>
            PAID
          </Text>
        ) : null}

        {/* ------------------------------------------------------- header --- */}
        <View style={styles.spread}>
          <BusinessBlock business={business} />

          <View style={{ width: 190 }}>
            <Text style={styles.title}>{documentTitle}</Text>
            <View style={{ marginTop: 8 }}>
              <MetaLine
                label="Invoice no."
                value={invoice.number ?? "DRAFT"}
                strong
              />
              <MetaLine label="Date" value={formatPdfDate(invoice.issue_date)} />
              {invoice.due_date ? (
                <MetaLine label="Due" value={formatPdfDate(invoice.due_date)} />
              ) : null}
              {isTaxInvoice && customerState ? (
                <MetaLine
                  label="Place of supply"
                  value={`${customerState}${
                    invoice.customer_state_code
                      ? ` (${invoice.customer_state_code})`
                      : ""
                  }`}
                />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* --------------------------------------------------- bill to ---- */}
        <View style={styles.row}>
          <View style={styles.panel}>
            <Text style={styles.panelHeading}>BILL TO</Text>
            <Text style={styles.strongLine}>
              {invoice.customer_name || "—"}
            </Text>
            {invoice.customer_address ? (
              <Text style={styles.muted}>{invoice.customer_address}</Text>
            ) : null}
            {customerState ? (
              <Text style={styles.muted}>{customerState}</Text>
            ) : null}
            {invoice.customer_phone ? (
              <Text style={styles.muted}>{invoice.customer_phone}</Text>
            ) : null}
            {invoice.customer_email ? (
              <Text style={styles.muted}>{invoice.customer_email}</Text>
            ) : null}
            {invoice.customer_gstin ? (
              <Text style={{ marginTop: 2 }}>
                GSTIN: {invoice.customer_gstin}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ----------------------------------------------------- items ----- */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.tableHead} fixed>
            <Text style={styles.colIndex}>#</Text>
            <Text style={styles.colDescription}>DESCRIPTION</Text>
            <Text style={styles.colSac}>SAC</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colRate}>RATE (INR)</Text>
            <Text style={styles.colAmount}>AMOUNT (INR)</Text>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.colIndex}>{index + 1}</Text>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colSac}>{item.sac_code || "—"}</Text>
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
        {/* wrap={false}: the receipts list and the totals it adds up to are
            one statement, and must not be split across a page break. */}
        <View style={[styles.spread, { marginTop: 12 }]} wrap={false}>
          <View style={{ flex: 1, paddingRight: 18 }}>
            {received.length ? (
              <>
                <Text style={styles.panelHeading}>PAYMENTS RECEIVED</Text>
                <View style={styles.receiptsHead}>
                  <Text style={styles.colReceipt}>RECEIPT</Text>
                  <Text style={styles.colReceiptDate}>DATE</Text>
                  <Text style={styles.colReceiptAmount}>AMOUNT (INR)</Text>
                </View>
                {received.map((payment) => (
                  <View key={payment.id} style={styles.receiptsRow}>
                    <Text style={styles.colReceipt}>
                      {payment.receipt_number ?? "—"}
                    </Text>
                    <Text style={styles.colReceiptDate}>
                      {formatPdfDate(payment.paid_on)}
                    </Text>
                    <Text style={styles.colReceiptAmount}>
                      {formatPaise(payment.amount_paise)}
                    </Text>
                  </View>
                ))}
                {/* Here rather than under the balance band: the left column
                    has room to spare, the totals column does not, and one
                    more line under the band is what pushed the notes onto a
                    second page. */}
                <Text style={[styles.tiny, { color: PAID, marginTop: 4 }]}>
                  No dues. Paid in full
                  {lastPaidOn ? ` on ${formatPdfDate(lastPaidOn)}` : ""}.
                </Text>
              </>
            ) : null}

            {/* Beside the totals rather than in a full-width row beneath them.
                The full-width row cost a line of height the page did not
                have: with it, a settled invoice pushed its notes onto a
                second page. This column is otherwise empty on a bill that is
                not yet paid. */}
            <View style={[styles.words, received.length ? {} : { marginTop: 0 }]}>
              <Text style={[styles.wordsLabel, { width: "auto" }]}>
                AMOUNT IN WORDS
              </Text>
              <Text>
                {invoice.amount_in_words || paiseToWords(invoice.total_paise)}
              </Text>
            </View>
          </View>

          <View style={{ width: 250 }}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text>{formatPaise(invoice.subtotal_paise)}</Text>
            </View>

            {invoice.discount_paise > 0 ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text>- {formatPaise(invoice.discount_paise)}</Text>
              </View>
            ) : null}

            {isTaxInvoice ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Taxable value</Text>
                <Text>{formatPaise(invoice.taxable_paise)}</Text>
              </View>
            ) : null}

            {invoice.tax_mode === "cgst_sgst" ? (
              <>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>
                    CGST @ {formatTaxRate(invoice.tax_rate_bp / 2)}
                  </Text>
                  <Text>{formatPaise(invoice.cgst_paise)}</Text>
                </View>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>
                    SGST @ {formatTaxRate(invoice.tax_rate_bp / 2)}
                  </Text>
                  <Text>{formatPaise(invoice.sgst_paise)}</Text>
                </View>
              </>
            ) : null}

            {invoice.tax_mode === "igst" ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>
                  IGST @ {formatTaxRate(invoice.tax_rate_bp)}
                </Text>
                <Text>{formatPaise(invoice.igst_paise)}</Text>
              </View>
            ) : null}

            {invoice.round_off_paise !== 0 ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Round off</Text>
                <Text>
                  {invoice.round_off_paise > 0 ? "+ " : "- "}
                  {formatPaise(Math.abs(invoice.round_off_paise))}
                </Text>
              </View>
            ) : null}

            <View style={styles.grandTotal}>
              <Text>Total</Text>
              <Text>₹{formatPaise(invoice.total_paise)}</Text>
            </View>

            {received.length ? (
              <View style={[styles.totalLine, { marginTop: 4 }]}>
                <Text style={styles.totalLabel}>
                  {received.length === 1
                    ? "Received (1 receipt)"
                    : `Received (${received.length} receipts)`}
                </Text>
                <Text>- {formatPaise(receivedPaise)}</Text>
              </View>
            ) : null}

            <View
              style={[
                styles.balanceDue,
                isSettled
                  ? { backgroundColor: "#EAF5EE", color: PAID }
                  : { backgroundColor: "#FFFCF3", color: INK },
              ]}
            >
              <Text>{isSettled ? "Balance" : "Payment pending"}</Text>
              <Text>₹{formatPaise(isSettled ? 0 : invoice.total_paise)}</Text>
            </View>

            {/* Settled with no receipts to list — marked paid by hand before
                migration 023 — keeps the line under the band. */}
            {isSettled && !received.length ? (
              <Text style={[styles.tiny, { color: PAID, textAlign: "right" }]}>
                No dues. Paid in full.
              </Text>
            ) : null}
          </View>
        </View>

        {/* -------------------------------------------- bank and sign ----- */}
        {/* There used to be a TERMS panel between these two. The policies
            annexure says all of that and says it properly, so it was removed
            along with the field that fed it (migration 022). */}
        <View style={[styles.row, { marginTop: 12, gap: 10 }]}>
          {hasBank ? (
            <View style={styles.panel}>
              <Text style={styles.panelHeading}>PAYMENT DETAILS</Text>
              {business.bank_name ? <Text>{business.bank_name}</Text> : null}
              {business.bank_account_name ? (
                <Text style={styles.muted}>{business.bank_account_name}</Text>
              ) : null}
              {business.bank_account_number ? (
                <Text style={styles.muted}>
                  A/C {business.bank_account_number}
                </Text>
              ) : null}
              {business.bank_ifsc ? (
                <Text style={styles.muted}>IFSC {business.bank_ifsc}</Text>
              ) : null}
              {business.upi_id ? (
                <Text style={styles.muted}>UPI {business.upi_id}</Text>
              ) : null}
            </View>
          ) : (
            // Holds the signature to the right when there are no bank details.
            <View style={{ flex: 1 }} />
          )}

          <SignaturePanel business={business} />
        </View>

        {invoice.notes ? (
          // Same one-row treatment as the amount in words, and for the same
          // reason: a two-word heading does not deserve a line of its own on a
          // page that is one line from spilling.
          <View style={[styles.row, { marginTop: 9 }]}>
            <Text style={[styles.panelHeading, { width: 78, marginBottom: 0 }]}>
              NOTES
            </Text>
            <Text style={[styles.muted, { flex: 1 }]}>{invoice.notes}</Text>
          </View>
        ) : null}

        {invoice.status === "cancelled" ? (
          <Text style={{ marginTop: 10, color: "#B3261E" }}>
            This invoice was cancelled
            {invoice.cancel_reason ? `: ${invoice.cancel_reason}` : "."}
          </Text>
        ) : null}

        <PdfFooter label={invoice.number ?? "Draft"} business={business} />

        {!isTaxInvoice ? (
          <Text style={[styles.tiny, { marginTop: 6 }]}>
            {taxModeLabel("none")} — this document is not a tax invoice.
          </Text>
        ) : null}

        {/* ------------------------------------------------- policies ----- */}
        {/* On its own page. These are the same clauses the package pages
            publish, and they run to thirty-odd lines — threaded in under the
            signature they would push the bill itself onto a second page and
            bury the amount due. `break` makes the bill one page and the terms
            an annexure, which is also how the customer reads them. */}
        {policyLists.length ? (
          <View break>
            <Text style={styles.annexTitle}>POLICIES &amp; IMPORTANT NOTES</Text>
            <Text style={[styles.tiny, { marginTop: 3 }]}>
              These terms form part of {invoice.number ?? "this invoice"} and
              are the terms published on{" "}
              {business.website || "our website"} at the time it was issued.
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
                  <View key={`${index}-${item.slice(0, 24)}`} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}

            <Text style={[styles.tiny, { marginTop: 9 }]}>
              Payment against this invoice is taken as acceptance of the terms
              above.
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
