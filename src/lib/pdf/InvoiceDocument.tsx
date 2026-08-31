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
import { formatTaxRate, taxModeLabel } from "../finance";
import { formatPaise, paiseToWords } from "../money";
import type {
  BusinessProfileRecord,
  InvoiceItemRecord,
  InvoiceRecord,
} from "../invoices";
import { stateNameForCode } from "../invoices";
import { PDF_FONT_FAMILY, registerPdfFonts } from "./fonts";

/**
 * The invoice document.
 *
 * Everything it draws comes from the invoice row and the business profile that
 * were passed in — it does no lookups, because an issued invoice is a
 * historical fact and must render identically in a year's time.
 *
 * Amounts print without the ₹ glyph in the items table (the column header says
 * so) and with it on the totals, which keeps the numeric columns aligned while
 * still being unambiguous where it matters.
 */

registerPdfFonts();

const INK = "#06131D";
const MUTED = "#526168";
const GOLD = "#997A15";
const RULE = "#D9D2C7";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9,
    color: INK,
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 36,
    lineHeight: 1.45,
  },

  row: { flexDirection: "row" },
  spread: { flexDirection: "row", justifyContent: "space-between" },

  brandName: { fontSize: 16, fontWeight: 600 },
  logo: { height: 40, width: 110, objectFit: "contain", marginBottom: 6 },
  muted: { color: MUTED },
  tiny: { fontSize: 7.5, color: MUTED },

  title: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1.6,
    color: GOLD,
    textAlign: "right",
  },

  divider: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 12 },

  panel: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 3,
    padding: 9,
    flex: 1,
  },
  panelHeading: {
    fontSize: 7.5,
    fontWeight: 600,
    letterSpacing: 1,
    color: GOLD,
    marginBottom: 3,
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
    fontWeight: 600,
    letterSpacing: 0.6,
    color: MUTED,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEAE2",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },

  colIndex: { width: 20 },
  colDescription: { flex: 1, paddingRight: 8 },
  colSac: { width: 46 },
  colQty: { width: 34, textAlign: "right" },
  colRate: { width: 66, textAlign: "right" },
  colAmount: { width: 76, textAlign: "right" },

  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
  },
  totalLabel: { color: MUTED },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: RULE,
    marginTop: 5,
    paddingTop: 6,
    fontSize: 11,
    fontWeight: 600,
  },

  words: {
    marginTop: 10,
    backgroundColor: "#FFFCF3",
    borderWidth: 1,
    borderColor: "#EBD9A0",
    borderRadius: 3,
    padding: 8,
  },

  signature: { height: 34, width: 96, objectFit: "contain" },

  cancelled: {
    position: "absolute",
    top: 250,
    left: 90,
    fontSize: 62,
    fontWeight: 600,
    color: "#D64545",
    opacity: 0.16,
    transform: "rotate(-24deg)",
  },

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

export default function InvoiceDocument({
  invoice,
  items,
  business,
}: {
  invoice: InvoiceRecord;
  items: InvoiceItemRecord[];
  business: BusinessProfileRecord;
}) {
  // "Tax invoice" is a specific thing under GST. Calling a document that
  // charges no tax by that name would be wrong, so the title follows the mode.
  const isTaxInvoice = invoice.tax_mode !== "none";
  const documentTitle = isTaxInvoice ? "TAX INVOICE" : "INVOICE";

  const addressLines = [
    business.address_line1,
    business.address_line2,
    [business.city, business.pincode].filter(Boolean).join(" "),
    business.state,
  ].filter(Boolean);

  const customerState =
    invoice.customer_state || stateNameForCode(invoice.customer_state_code);

  const hasBank = Boolean(
    business.bank_name ||
      business.bank_account_number ||
      business.upi_id,
  );

  return (
    <Document
      title={invoice.number ?? "Invoice"}
      author={business.legal_name}
      subject={`Invoice for ${invoice.customer_name}`}
    >
      <Page size="A4" style={styles.page}>
        {invoice.status === "cancelled" && (
          <Text style={styles.cancelled} fixed>
            CANCELLED
          </Text>
        )}

        {/* ------------------------------------------------------- header --- */}
        <View style={styles.spread}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            {business.logo_data_uri ? (
              <Image src={business.logo_data_uri} style={styles.logo} />
            ) : null}
            <Text style={styles.brandName}>
              {business.legal_name || "Mufti Travels"}
            </Text>
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
            <Text style={{ fontSize: 11, fontWeight: 600 }}>
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
        <View style={{ marginTop: 14 }}>
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
        <View style={[styles.spread, { marginTop: 14 }]}>
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
          </View>
        </View>

        <View style={styles.words}>
          <Text style={{ fontSize: 7.5, color: GOLD, fontWeight: 600 }}>
            AMOUNT IN WORDS
          </Text>
          <Text>
            {invoice.amount_in_words || paiseToWords(invoice.total_paise)}
          </Text>
        </View>

        {/* ------------------------------------------- bank, terms, sign --- */}
        <View style={[styles.row, { marginTop: 14, gap: 10 }]}>
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

          <View style={styles.panel}>
            <Text style={styles.panelHeading}>TERMS</Text>
            <Text style={styles.muted}>
              {invoice.terms || business.invoice_terms || "—"}
            </Text>
          </View>

          <View style={[styles.panel, { alignItems: "flex-end" }]}>
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
          <View style={{ marginTop: 10 }}>
            <Text style={styles.panelHeading}>NOTES</Text>
            <Text style={styles.muted}>{invoice.notes}</Text>
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
            {invoice.number ?? "Draft"} · {business.legal_name}
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
      </Page>
    </Document>
  );
}
