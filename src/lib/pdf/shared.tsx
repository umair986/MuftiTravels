/*
 * jsx-a11y/alt-text fires on <Image>, but this is @react-pdf/renderer's Image,
 * which draws into a PDF and has no alt prop at all. See InvoiceDocument.tsx.
 */
/* eslint-disable jsx-a11y/alt-text */
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BusinessProfileRecord } from "../invoices";
import { PDF_FONT_FAMILY, registerPdfFonts } from "./fonts";

/**
 * What the invoice and the receipt have in common: the palette, the base
 * styles, the business header, the signature block and the footer.
 *
 * Shared rather than copied because a customer holds both documents side by
 * side, and a letterhead that differs by a few points between them looks like
 * two different companies.
 *
 * Every style here that sets a fontSize restates lineHeight beside it — see
 * the note at the top of InvoiceDocument.tsx for why that is not optional.
 */

registerPdfFonts();

export const INK = "#06131D";
export const MUTED = "#526168";
export const GOLD = "#997A15";
export const RULE = "#D9D2C7";
export const PAID = "#1E7A4B";

export const baseStyles = StyleSheet.create({
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

  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalLabel: { color: MUTED },

  /* The line the customer actually looks for. */
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
  wordsLabel: {
    width: 78,
    fontSize: 7.5,
    lineHeight: 1.45,
    color: GOLD,
    fontWeight: 600,
  },

  signature: { height: 34, width: 96, objectFit: "contain" },

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

export function formatPdfDate(value: string | null): string {
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

/**
 * Logo, name, address and contact lines — the left half of the header.
 *
 * `showTaxIds` is off on the receipt: it states money received, not a taxable
 * supply, and the GSTIN and PAN belong on the invoice it points to.
 */
export function BusinessBlock({
  business,
  showTaxIds = true,
}: {
  business: BusinessProfileRecord;
  showTaxIds?: boolean;
}) {
  const addressLines = [
    business.address_line1,
    business.address_line2,
    [business.city, business.pincode].filter(Boolean).join(" "),
    business.state,
  ].filter(Boolean);

  return (
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
          <Image src={business.logo_data_uri} style={baseStyles.logo} />
          <Text style={baseStyles.strongLine}>
            {business.legal_name || "Mufti Travels"}
          </Text>
        </>
      ) : (
        <Text style={baseStyles.brandName}>
          {business.legal_name || "Mufti Travels"}
        </Text>
      )}
      {business.trade_name ? (
        <Text style={baseStyles.muted}>{business.trade_name}</Text>
      ) : null}
      {addressLines.map((line) => (
        <Text key={line} style={baseStyles.muted}>
          {line}
        </Text>
      ))}
      {business.phone ? (
        <Text style={baseStyles.muted}>Phone: {business.phone}</Text>
      ) : null}
      {business.email ? (
        <Text style={baseStyles.muted}>{business.email}</Text>
      ) : null}
      {showTaxIds && business.gstin ? (
        <Text style={{ marginTop: 3 }}>GSTIN: {business.gstin}</Text>
      ) : null}
      {showTaxIds && business.pan ? <Text>PAN: {business.pan}</Text> : null}
    </View>
  );
}

/** One label/value line in the header's right-hand column. */
export function MetaLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={baseStyles.totalLine}>
      <Text style={baseStyles.totalLabel}>{label}</Text>
      <Text style={strong ? { fontWeight: 600 } : undefined}>{value}</Text>
    </View>
  );
}

/**
 * "For Mufti Travels", the signature, "Authorised signatory".
 *
 * A fixed width, not flex: `baseStyles.panel` sets `flex: 1`, which is
 * flexGrow 1 / flexShrink 1 / flexBasis 0, and overriding only flexGrow leaves
 * the shrink in place — the panel collapses to a sliver with the heading
 * stacked one word per line. All three are overridden.
 */
export function SignaturePanel({
  business,
}: {
  business: BusinessProfileRecord;
}) {
  return (
    <View
      style={[
        baseStyles.panel,
        { alignItems: "flex-end", flexGrow: 0, flexShrink: 0, flexBasis: 200 },
      ]}
    >
      <Text style={[baseStyles.panelHeading, { alignSelf: "flex-start" }]}>
        FOR {(business.legal_name || "MUFTI TRAVELS").toUpperCase()}
      </Text>
      {business.signature_data_uri ? (
        <Image
          src={business.signature_data_uri}
          style={baseStyles.signature}
        />
      ) : (
        <View style={{ height: 34 }} />
      )}
      <Text style={baseStyles.tiny}>Authorised signatory</Text>
    </View>
  );
}

export function PdfFooter({
  label,
  business,
}: {
  label: string;
  business: BusinessProfileRecord;
}) {
  return (
    <View style={baseStyles.footer} fixed>
      <Text style={baseStyles.tiny}>
        {label} · {business.legal_name}
        {business.website ? ` · ${business.website}` : ""}
      </Text>
      <Text
        style={baseStyles.tiny}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}
