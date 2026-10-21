import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { computeReceiptFigures, paymentMethodLabel } from "../finance";
import { formatPaise, paiseToWords } from "../money";
import type {
  BusinessProfileRecord,
  InvoicePayment,
  InvoiceRecord,
} from "../invoices";
import { stateNameForCode } from "../invoices";
import {
  BusinessBlock,
  GOLD,
  INK,
  MUTED,
  MetaLine,
  PAID,
  PdfFooter,
  RULE,
  baseStyles,
  formatPdfDate,
} from "./shared";

/**
 * The receipt for ONE payment.
 *
 * Deliberately short. The invoice carries the items, the tax and the policies;
 * this only acknowledges money: who paid, against which invoice, what was due,
 * what arrived, what is left. No line items, no GST breakdown, no annexure —
 * a customer paying in three instalments gets three of these, and each should
 * read in five seconds on a phone.
 *
 * The one term it does repeat is the cancellation policy, because a payment is
 * the moment the customer is most likely to ask what they get back. It comes
 * from the invoice's frozen `policy_snapshot`, never the live site lists, so
 * the receipt states the terms this booking was actually issued under.
 *
 * No signature: the receipt says it is system generated instead.
 *
 * Every figure comes from the payment row and the invoice total. "Due before"
 * uses `paid_before_paise`, which the database froze when the payment was
 * recorded (migration 023), so this document renders the same in a year even
 * if an earlier payment is later removed.
 */

const styles = {
  ...baseStyles,
  ...StyleSheet.create({
    statement: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: RULE,
      borderRadius: 3,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    statementLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: "#EFEAE2",
      fontSize: 10,
      lineHeight: 1.45,
    },
    /* The payment itself — the reason the document exists — gets the gold
       band the invoice uses for the amount in words. */
    receivedLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginVertical: 5,
      paddingVertical: 5,
      paddingHorizontal: 7,
      backgroundColor: "#FFFCF3",
      borderWidth: 1,
      borderColor: "#EBD9A0",
      borderRadius: 3,
      fontSize: 11,
      lineHeight: 1.45,
      fontWeight: 600,
    },
    policyBlock: {
      marginTop: 12,
      borderWidth: 1,
      borderColor: RULE,
      borderRadius: 3,
      padding: 8,
    },
    /* Same bullet row as the invoice annexure: a "• " prefix would hang a
       wrapped clause's second line under the dot. */
    bulletRow: { flexDirection: "row", paddingVertical: 1 },
    bulletDot: { width: 10, color: GOLD },
    bulletText: { flex: 1, fontSize: 8, lineHeight: 1.4, color: MUTED },
    receivedMeta: {
      fontSize: 8,
      lineHeight: 1.45,
      fontWeight: 400,
      color: MUTED,
    },
  }),
};

export default function ReceiptDocument({
  invoice,
  payment,
  business,
}: {
  invoice: InvoiceRecord;
  payment: InvoicePayment;
  business: BusinessProfileRecord;
}) {
  const figures = computeReceiptFigures(
    invoice.total_paise,
    payment.paid_before_paise ?? 0,
    payment.amount_paise,
  );
  const isSettled = figures.dueAfterPaise <= 0;
  const isOverpaid = figures.dueAfterPaise < 0;
  const receiptNumber = payment.receipt_number ?? "—";
  const invoiceNumber = invoice.number ?? "—";

  const customerState =
    invoice.customer_state || stateNameForCode(invoice.customer_state_code);

  // `show_policies` / `policy_snapshot` are undefined on a row read before
  // migration 021; that receipt simply prints no policy.
  const cancellation =
    invoice.show_policies === false
      ? undefined
      : (invoice.policy_snapshot ?? []).find(
          (list) => /cancel/i.test(list.title) && list.items.length > 0,
        );

  const paymentMeta = [
    paymentMethodLabel(payment.method),
    payment.reference ? `Ref. ${payment.reference}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document
      title={`Receipt ${receiptNumber}`}
      author={business.legal_name}
      subject={`Payment receipt for ${invoice.customer_name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* ------------------------------------------------------- header --- */}
        <View style={styles.spread}>
          <BusinessBlock business={business} showTaxIds={false} />

          <View style={{ width: 200 }}>
            <Text style={styles.title}>PAYMENT RECEIPT</Text>
            <View style={{ marginTop: 8 }}>
              <MetaLine label="Receipt no." value={receiptNumber} strong />
              <MetaLine label="Date" value={formatPdfDate(payment.paid_on)} />
              <MetaLine label="Against invoice" value={invoiceNumber} />
              <MetaLine
                label="Invoice date"
                value={formatPdfDate(invoice.issue_date)}
              />
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* -------------------------------------------- received from ---- */}
        <View style={styles.row}>
          <View style={styles.panel}>
            <Text style={styles.panelHeading}>RECEIVED FROM</Text>
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
          </View>
        </View>

        {/* ------------------------------------------------ statement ---- */}
        <View style={styles.statement}>
          <View style={styles.statementLine}>
            <Text style={styles.muted}>Invoice total</Text>
            <Text>₹{formatPaise(invoice.total_paise)}</Text>
          </View>
          {/* Only once something was paid before: on a first payment "due
              before" equals the total, and printing both says it twice. */}
          {figures.dueBeforePaise !== invoice.total_paise ? (
            <>
              <View style={styles.statementLine}>
                <Text style={styles.muted}>Received earlier</Text>
                <Text>- ₹{formatPaise(payment.paid_before_paise ?? 0)}</Text>
              </View>
              <View style={styles.statementLine}>
                <Text style={{ fontWeight: 600 }}>Due before this payment</Text>
                <Text style={{ fontWeight: 600 }}>
                  ₹{formatPaise(figures.dueBeforePaise)}
                </Text>
              </View>
            </>
          ) : null}

          <View style={styles.receivedLine}>
            <View>
              <Text>Received on {formatPdfDate(payment.paid_on)}</Text>
              {paymentMeta ? (
                <Text style={styles.receivedMeta}>{paymentMeta}</Text>
              ) : null}
            </View>
            <Text>- ₹{formatPaise(figures.receivedPaise)}</Text>
          </View>

          <View
            style={[
              styles.balanceDue,
              { marginTop: 0, marginBottom: 2 },
              isSettled
                ? { backgroundColor: "#EAF5EE", color: PAID }
                : { backgroundColor: "#F3EFEA", color: INK },
            ]}
          >
            <Text>
              {isOverpaid
                ? "Received in excess"
                : isSettled
                  ? "Balance due"
                  : "Balance still due"}
            </Text>
            <Text>
              ₹
              {formatPaise(
                isOverpaid ? -figures.dueAfterPaise : Math.max(figures.dueAfterPaise, 0),
              )}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.tiny,
            { textAlign: "right", marginTop: 3 },
            isSettled ? { color: PAID } : { color: GOLD },
          ]}
        >
          {isSettled
            ? `No dues. Invoice ${invoiceNumber} is paid in full.`
            : `Please pay the balance against invoice ${invoiceNumber}${
                invoice.due_date ? ` by ${formatPdfDate(invoice.due_date)}` : ""
              }.`}
        </Text>

        <View style={[styles.words, styles.row]}>
          <Text style={styles.wordsLabel}>AMOUNT RECEIVED</Text>
          <Text style={{ flex: 1 }}>{paiseToWords(payment.amount_paise)}</Text>
        </View>

        {cancellation ? (
          <View style={styles.policyBlock} wrap={false}>
            <Text style={styles.panelHeading}>
              {cancellation.title.toUpperCase()}
            </Text>
            {cancellation.items.map((item, index) => (
              <View
                key={`${index}-${item.slice(0, 24)}`}
                style={styles.bulletRow}
              >
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {invoice.status === "cancelled" ? (
          <Text style={{ marginTop: 10, color: "#B3261E" }}>
            Invoice {invoiceNumber} has since been cancelled
            {invoice.cancel_reason ? `: ${invoice.cancel_reason}` : "."}
          </Text>
        ) : null}

        <Text style={[styles.tiny, { marginTop: 10 }]}>
          This receipt acknowledges payment only. Items, taxes and the full
          terms are on invoice {invoiceNumber}.
        </Text>
        <Text style={[styles.tiny, { marginTop: 3, fontWeight: 600 }]}>
          This is a system generated receipt and does not require a signature.
        </Text>

        <PdfFooter
          label={`Receipt ${receiptNumber} · Invoice ${invoiceNumber}`}
          business={business}
        />
      </Page>
    </Document>
  );
}
