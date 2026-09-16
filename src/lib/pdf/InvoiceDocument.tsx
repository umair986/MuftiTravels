/*
 * jsx-a11y/alt-text fires on <Image>, but this is @react-pdf/renderer's Image,
 * which draws into a PDF and has no alt prop at all — there is no assistive
 * technology on the other side of it to serve. Disabled for the file rather
 * than line by line, since every Image here is the same non-DOM element.
 */
/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatTaxRate, paymentMethodLabel, taxModeLabel } from "../finance";
import { formatPaise, paiseToWords } from "../money";
import type {
  BusinessProfileRecord,
  InvoiceItemRecord,
  InvoicePayment,
  InvoiceRecord,
} from "../invoices";
import { stateNameForCode } from "../invoices";
import type { InvoicePolicyList } from "../siteContent";
import { PDF_FONT_FAMILY, registerPdfFonts } from "./fonts";

/**
 * The invoice document, and the receipt that follows it.
 *
 * Everything it draws comes from the invoice row, the payments and the business
 * profile that were passed in — it does no lookups, because an issued invoice
 * is a historical fact and must render identically in a year's time.
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

registerPdfFonts();

const INK = "#06131D";
const MUTED = "#526168";
const GOLD = "#997A15";
const RULE = "#D9D2C7";
const PAID = "#1E7A4B";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: INK,
    paddingTop: 32,
    paddingBottom: 42,
    paddingHorizontal: 36,
    lineHeight: 1.45,
  },

  row: { flexDirection: "row" },
  spread: { flexDirection: "row", justifyContent: "space-between" },

  brandName: { fontSize: 16, lineHeight: 1.45, fontWeight: 600 },
  logo: { height: 46, width: 150, objectFit: "contain", marginBottom: 8 },
  muted: { color: MUTED },
  tiny: { fontSize: 7.5, lineHeight: 1.45, color: MUTED },
  strongLine: { fontSize: 11, lineHeight: 1.45, fontWeight: 600 },

  title: {
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 600,
    letterSpacing: 1.6,
    color: GOLD,
    textAlign: "right",
  },

  divider: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 10 },

  panel: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 3,
    padding: 8,
    flex: 1,
  },
  panelHeading: {
    fontSize: 7.5,
    lineHeight: 1.45,
    fontWeight: 600,
    letterSpacing: 1,
    color: GOLD,
    marginBottom: 2,
  },

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
  colPayDate: { width: 76 },
  colPayMethod: { width: 86 },
  colQty: { width: 34, textAlign: "right" },
  colRate: { width: 66, textAlign: "right" },
  colAmount: { width: 76, textAlign: "right" },

  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalLabel: { color: MUTED },
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

  /* The line the customer actually looks for on a part-paid bill. */
  balanceDue: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 3,
    fontSize: 11,
    lineHeight: 1.45,
    fontWeight: 600,
  },

  words: {
    marginTop: 8,
    backgroundColor: "#FFFCF3",
    borderWidth: 1,
    borderColor: "#EBD9A0",
    borderRadius: 3,
    padding: 7,
  },

  signature: { height: 34, width: 96, objectFit: "contain" },

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

  /* ------------------------------------------------------------ policies */

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

  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * One row of the payments table.
 *
 * A function rather than inline JSX because the first row is drawn inside the
 * block that keeps it with the table head, and the rest after it — two call
 * sites that must produce identical rows.
 */
function paymentRow(payment: InvoicePayment, index: number) {
  return (
    <View key={payment.id} style={styles.tableRow} wrap={false}>
      <Text style={styles.colIndex}>{index + 1}</Text>
      <Text style={styles.colPayDate}>{formatDate(payment.paid_on)}</Text>
      <Text style={styles.colPayMethod}>
        {paymentMethodLabel(payment.method)}
      </Text>
      <Text style={styles.colDescription}>{payment.reference || "—"}</Text>
      <Text style={styles.colAmount}>{formatPaise(payment.amount_paise)}</Text>
    </View>
  );
}

/**
 * "invoice" is the bill, frozen at issue and never re-rendered.
 * "receipt" is the running account: the same document plus every payment
 * received to date, the balance, and — once that balance reaches zero — a PAID
 * stamp and a no-dues line. It is regenerated as payments come in, which is
 * exactly why it is a separate document and not an edit to the first one.
 */
export type InvoiceDocumentVariant = "invoice" | "receipt";

export default function InvoiceDocument({
  invoice,
  items,
  business,
  payments,
  policies,
  variant = "invoice",
}: {
  invoice: InvoiceRecord;
  items: InvoiceItemRecord[];
  business: BusinessProfileRecord;
  payments?: InvoicePayment[];
  /**
   * The policies and important notes to print, already resolved by the caller
   * — an issued invoice hands over its frozen snapshot, a draft the live site
   * lists. This component does no lookups of its own, for the same reason it
   * does none for anything else: the same inputs must draw the same page in a
   * year's time.
   */
  policies?: InvoicePolicyList[];
  variant?: InvoiceDocumentVariant;
}) {
  // "Tax invoice" is a specific thing under GST. Calling a document that
  // charges no tax by that name would be wrong, so the title follows the mode.
  const isTaxInvoice = invoice.tax_mode !== "none";

  const isReceipt = variant === "receipt";
  const received = payments ?? [];
  const paidPaise = received.reduce((sum, row) => sum + row.amount_paise, 0);
  const balancePaise = invoice.total_paise - paidPaise;

  /**
   * Settled — but the two documents establish it differently, and that is the
   * point rather than an oversight.
   *
   * A RECEIPT is an account: it adds up the payments it was handed and reports
   * what that leaves. (Paying a few paise over settles a bill; it does not
   * create a credit note. A zero-total invoice with nothing received is not
   * settled, it is empty.)
   *
   * An INVOICE states one thing, chosen by the admin: paid, or pending. It
   * goes out once the money has cleared — part payments are what receipts are
   * for — so a running balance on it would be noise, and worse, would have to
   * stay true for years after the ledger moved on. This is what was broken
   * before: the invoice, frozen at issue, said nothing about payment at all
   * while the receipt said PAID.
   */
  const isSettled = isReceipt
    ? received.length > 0 && balancePaise <= 0
    : invoice.paid_in_full;

  // Instalments belong on the receipt. The invoice says paid or pending.
  const showPayments = isReceipt;

  const documentTitle = isReceipt
    ? isSettled
      ? "RECEIPT"
      : "PAYMENT STATEMENT"
    : isTaxInvoice
      ? "TAX INVOICE"
      : "INVOICE";

  const addressLines = [
    business.address_line1,
    business.address_line2,
    [business.city, business.pincode].filter(Boolean).join(" "),
    business.state,
  ].filter(Boolean);

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
      title={`${isReceipt ? "Receipt" : "Invoice"} ${invoice.number ?? ""}`.trim()}
      author={business.legal_name}
      subject={`${isReceipt ? "Receipt" : "Invoice"} for ${invoice.customer_name}`}
    >
      <Page size="A4" style={styles.page}>
        {invoice.status === "cancelled" ? (
          <Text style={[styles.stamp, { color: "#D64545" }]} fixed>
            CANCELLED
          </Text>
        ) : isSettled ? (
          // On the receipt this follows the ledger; on the invoice it follows
          // the admin's Paid tick. Either way the stamp and the line under the
          // total are driven by one value, so the page can never stamp PAID
          // over a balance due.
          <Text style={[styles.stamp, { color: PAID, left: 130 }]} fixed>
            PAID
          </Text>
        ) : null}

        {/* ------------------------------------------------------- header --- */}
        <View style={styles.spread}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            {/* The logo is a WORDMARK — it already reads "Mufti Travels". Set
                a 16pt "Mufti Travels" directly beneath it and the header says
                the name twice, at two sizes, one of them an image and one of
                them not: the doubling reads as a layout mistake even though
                every element is where it was put.

                So the logo takes the heading's job when there is one, and the
                legal name drops to the 11pt line beneath. It is not dropped
                altogether, because a tax invoice has to NAME its supplier in
                text — a GST officer, a bank and a screen reader all read the
                text layer, and none of them read the picture. */}
            {business.logo_data_uri ? (
              <>
                <Image src={business.logo_data_uri} style={styles.logo} />
                <Text style={styles.strongLine}>
                  {business.legal_name || "Mufti Travels"}
                </Text>
              </>
            ) : (
              <Text style={styles.brandName}>
                {business.legal_name || "Mufti Travels"}
              </Text>
            )}
            {business.trade_name ? (
              <Text style={styles.muted}>{business.trade_name}</Text>
            ) : null}
            {addressLines.map((line) => (
              <Text key={line} style={styles.muted}>
                {line}
              </Text>
            ))}
            {business.phone ? (
              <Text style={styles.muted}>Phone: {business.phone}</Text>
            ) : null}
            {business.email ? (
              <Text style={styles.muted}>{business.email}</Text>
            ) : null}
            {business.gstin ? (
              <Text style={{ marginTop: 3 }}>GSTIN: {business.gstin}</Text>
            ) : null}
            {business.pan ? <Text>PAN: {business.pan}</Text> : null}
          </View>

          <View style={{ width: 190 }}>
            <Text style={styles.title}>{documentTitle}</Text>
            <View style={{ marginTop: 8 }}>
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Invoice no.</Text>
                <Text style={{ fontWeight: 600 }}>
                  {invoice.number ?? "DRAFT"}
                </Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Date</Text>
                <Text>{formatDate(invoice.issue_date)}</Text>
              </View>
              {invoice.due_date ? (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Due</Text>
                  <Text>{formatDate(invoice.due_date)}</Text>
                </View>
              ) : null}
              {isTaxInvoice && customerState ? (
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Place of supply</Text>
                  <Text>
                    {customerState}
                    {invoice.customer_state_code
                      ? ` (${invoice.customer_state_code})`
                      : ""}
                  </Text>
                </View>
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
        <View style={[styles.spread, { marginTop: 12 }]}>
          <View style={{ flex: 1, paddingRight: 18 }} />

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

            {/* The receipt itemises: what was received, what that leaves. */}
            {isReceipt ? (
              <View style={[styles.totalLine, { marginTop: 4 }]}>
                <Text style={styles.totalLabel}>
                  {received.length === 1
                    ? "Paid (1 payment)"
                    : `Paid (${received.length} payments)`}
                </Text>
                <Text>- {formatPaise(paidPaise)}</Text>
              </View>
            ) : null}

            {/* Both documents end on the same band, so a customer looking for
                "what do I owe" finds it in the same place on either. */}
            <View
              style={[
                styles.balanceDue,
                isSettled
                  ? { backgroundColor: "#EAF5EE", color: PAID }
                  : { backgroundColor: "#FFFCF3", color: INK },
              ]}
            >
              <Text>
                {isSettled
                  ? "Balance"
                  : isReceipt
                    ? "Balance due"
                    : "Payment pending"}
              </Text>
              <Text>
                ₹
                {formatPaise(
                  isSettled
                    ? 0
                    : isReceipt
                      ? balancePaise
                      : invoice.total_paise,
                )}
              </Text>
            </View>

            {isSettled ? (
              <Text style={[styles.tiny, { color: PAID, textAlign: "right" }]}>
                No dues. Paid in full
                {/* Only the receipt knows a DATE — it was handed the payments.
                    The invoice knows only that the money arrived, so it says
                    that and stops rather than inventing a day. */}
                {isReceipt && received.length
                  ? ` on ${formatDate(received[received.length - 1].paid_on)}`
                  : ""}
                .
              </Text>
            ) : null}
          </View>
        </View>

        {/* Label and amount on ONE row rather than stacked. The stacked
            version spent a whole line on two words, and a bill that spills
            onto a second page over 13pt is a worse document than a slightly
            denser one — it is also a second page to send over WhatsApp. */}
        <View style={[styles.words, styles.row]}>
          <Text
            style={{
              width: 78,
              fontSize: 7.5,
              lineHeight: 1.45,
              color: GOLD,
              fontWeight: 600,
            }}
          >
            AMOUNT IN WORDS
          </Text>
          <Text style={{ flex: 1 }}>
            {invoice.amount_in_words || paiseToWords(invoice.total_paise)}
          </Text>
        </View>

        {/* -------------------------------------------- payments received --- */}
        {showPayments ? (
          <View style={{ marginTop: 14 }}>
            {/* The head is bound to the FIRST payment inside one wrap={false}
                block, rather than left to fend for itself with a
                minPresenceAhead hint — which this renderer ignores here, and
                which cost an afternoon to discover. Stranding "DATE · METHOD ·
                REFERENCE" at the foot of a page with the payments overleaf is
                at its worst on the one document that exists to show them. */}
            <View wrap={false}>
              <View style={styles.tableHead}>
                <Text style={styles.colIndex}>#</Text>
                <Text style={styles.colPayDate}>DATE</Text>
                <Text style={styles.colPayMethod}>METHOD</Text>
                <Text style={styles.colDescription}>REFERENCE</Text>
                <Text style={styles.colAmount}>AMOUNT (INR)</Text>
              </View>
              {received.length ? paymentRow(received[0], 0) : null}
            </View>

            {received.slice(1).map((payment, index) =>
              paymentRow(payment, index + 1),
            )}

            {!received.length ? (
              <View style={styles.tableRow}>
                <Text style={styles.muted}>
                  Nothing received against this invoice yet.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* -------------------------------------------- bank and sign ----- */}
        {/* There used to be a TERMS panel between these two, holding a
            sentence or so of payment terms. The policies annexure says all of
            that and says it properly — twenty-six clauses with the real
            cancellation schedule — so the panel was a worse copy of a better
            page, and two different answers to the same question on one
            document. Removed, along with the field that fed it. */}
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
          ) : null}

          {/* Without the terms panel between them, two flex:1 panels would
              split the page down the middle and leave the signature block
              stretched across half a page of nothing. Fixed width, with a
              spacer holding it right when there are no bank details either. */}
          {hasBank ? null : <View style={{ flex: 1 }} />}

          <View
            style={[
              styles.panel,
              // All three of these, not just a width: `styles.panel` sets
              // `flex: 1`, which is flexGrow 1 / flexShrink 1 / flexBasis 0.
              // Overriding only flexGrow leaves the shrink in place and the
              // panel collapses to a sliver with the heading stacked one word
              // per line.
              {
                alignItems: "flex-end",
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: 200,
              },
            ]}
          >
            <Text style={[styles.panelHeading, { alignSelf: "flex-start" }]}>
              FOR {(business.legal_name || "MUFTI TRAVELS").toUpperCase()}
            </Text>
            {business.signature_data_uri ? (
              <Image
                src={business.signature_data_uri}
                style={styles.signature}
              />
            ) : (
              <View style={{ height: 34 }} />
            )}
            <Text style={styles.tiny}>Authorised signatory</Text>
          </View>
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

        <View style={styles.footer} fixed>
          <Text style={styles.tiny}>
            {invoice.number ?? "Draft"}
            {isReceipt ? " · Receipt" : ""} · {business.legal_name}
            {business.website ? ` · ${business.website}` : ""}
          </Text>
          <Text
            style={styles.tiny}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

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
