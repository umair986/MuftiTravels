import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatTaxRate } from "../finance";
import { formatRupees, paiseToWords } from "../money";
import type { BusinessProfileRecord } from "../invoices";
import { stateNameForCode } from "../invoices";
import {
  durationLabel,
  parseDescriptionLines,
  perPersonPaise,
  totalTravellers,
  travellerSummary,
  type QuotationItemRecord,
  type QuotationRecord,
} from "../quotations";
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
 * Unlike them it is a SALES document, and four things follow from that:
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
 *   3. It states the trip, not only the price: which hotels, how far from the
 *      Haram, how many nights, how many of the travellers are children who need
 *      a bed. These are migration 025's columns, and they are here because the
 *      Word document this replaces leads with all of them. Every block is
 *      conditional — a quotation that has not been asked these questions yet
 *      prints exactly what it printed before 025.
 *
 *   4. It states when it stops being true. An offer with no expiry is not an
 *      offer, so the validity date is in the header AND in a closing line.
 *
 * It carries no GSTIN and no "TAX INVOICE" title: a quotation is not a taxable
 * supply, and showing tax identifiers on one invites it to be filed as a bill.
 * The tax LINES still print when GST is switched on, because a quoted total the
 * customer cannot reconcile against the eventual invoice is worse than useless.
 *
 * ---------------------------------------------------------------------------
 * On the items table, which is drawn to a reference rather than to taste.
 *
 * It is a ruled grid — boxed, with vertical rules between the columns and a
 * shaded header band — where the invoice's table is a ruled LIST with no
 * verticals at all. That is not inconsistency. An invoice line is one phrase
 * against one amount, and verticals would be noise around it. A quotation line
 * is a package with two levels of itinerary nested inside a single cell, and
 * without a rule to its right the reader cannot tell where the description
 * stops and the rate it belongs to begins. See parseDescriptionLines for how
 * that nesting is carried in a plain text column.
 * ---------------------------------------------------------------------------
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
 * document has more type sizes than the invoice (the per-person band, the three
 * description depths, two content lists, the annexure), so it has more chances
 * to get this wrong. scripts/render-quotation-check.mts measures the rendered
 * output for exactly this, because nothing throws when it is wrong.
 * ---------------------------------------------------------------------------
 */

/** The shaded band behind the table head and the summary labels. */
const BAND = "#F5F3EF";

const styles = {
  ...baseStyles,
  ...StyleSheet.create({
    /* ---------------------------------------------------- trip details --- */

    detailRow: { flexDirection: "row", paddingVertical: 1 },
    detailLabel: { width: 78, color: MUTED },
    detailValue: { flex: 1, fontWeight: 600 },

    /* Four counts across. A column each, so the numbers line up under their
       labels however long the labels are. */
    paxCell: { flex: 1, alignItems: "center" },
    paxCount: {
      fontSize: 13,
      lineHeight: 1.3,
      fontWeight: 600,
      color: GOLD,
    },
    paxLabel: { fontSize: 7.5, lineHeight: 1.45, color: MUTED },

    /* -------------------------------------------------- accommodation --- */

    stayRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: "#EFEAE2",
      paddingTop: 3,
      marginTop: 3,
    },
    stayCity: { width: 54, fontWeight: 600 },
    stayHotel: { flex: 1, paddingRight: 6 },
    stayTimes: { width: 150, textAlign: "right" },

    /* --------------------------------------------------------- table --- */

    /* Boxed, unlike the invoice's. See the note at the top of the file. */
    table: { marginTop: 8, borderWidth: 1, borderColor: RULE },

    tableHead: {
      flexDirection: "row",
      backgroundColor: BAND,
      borderBottomWidth: 1,
      borderBottomColor: RULE,
      /* 8.5, deliberately not 8. render-quotation-check.mts counts 8pt runs to
         prove every inclusion and exclusion reached the page, and asserts the
         count is ZERO when both lists are empty. A table head at 8pt would put
         five runs into that count on every render and make the assertion
         unprovable — the check would pass for the wrong reason, or fail for
         no reason at all. */
      fontSize: 8.5,
      lineHeight: 1.45,
      fontWeight: 600,
      color: INK,
    },
    tableRow: { flexDirection: "row" },
    /* On every row but the first. The header already draws the line above row
       one, and a border on both would stack two rules into a 2pt bar. */
    tableRowRule: { borderTopWidth: 1, borderTopColor: "#EFEAE2" },

    cell: {
      paddingVertical: 3,
      paddingHorizontal: 5,
      borderRightWidth: 1,
      borderRightColor: RULE,
    },
    cellLast: { paddingVertical: 3, paddingHorizontal: 5 },

    colIndex: { width: 22, textAlign: "center" },
    colDescription: { flex: 1 },
    colQty: { width: 44, textAlign: "right" },
    colRate: { width: 72, textAlign: "right" },
    colAmount: { width: 80, textAlign: "right" },

    /* The three depths parseDescriptionLines produces. Each restates
       lineHeight beside its fontSize — see the header note. */
    itemTitle: { fontSize: 9, lineHeight: 1.3, fontWeight: 600, color: INK },
    itemLine: { fontSize: 8.5, lineHeight: 1.3, color: INK },
    itemDeep: { fontSize: 7.5, lineHeight: 1.4, color: MUTED },

    /* "3.00" over "PAX", as the reference prints it: the unit belongs to the
       figure, and setting it beside the number would widen the column past
       what the description can spare. */
    qtyUnit: { fontSize: 7, lineHeight: 1.1, color: MUTED, textAlign: "right" },

    /* ------------------------------------------------------- totals --- */

    wordsHead: { fontSize: 7.5, lineHeight: 1.45, color: MUTED },
    /* Semibold, not italic. The reference sets this line in italics, and
       fonts.ts registers exactly two faces of Noto Sans — Regular and SemiBold.
       Asking for an italic one throws at render time ("Could not resolve font
       for Noto Sans, fontWeight 600, fontStyle italic") rather than falling
       back, so the choice is a third font file in the bundle or a different way
       to set one line apart. Weight does the job. */
    wordsBody: { fontWeight: 600 },

    grandTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderColor: RULE,
      marginTop: 3,
      paddingTop: 4,
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
      marginTop: 4,
      paddingVertical: 4,
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
      padding: 7,
      flex: 1,
    },
    /* A bullet row, not a "• " prefix on the text: a prefix makes the second
       line of a wrapped item hang under the dot instead of under the words. */
    bulletRow: { flexDirection: "row", paddingVertical: 0 },
    bulletDot: { width: 9, color: GOLD },
    bulletText: { flex: 1, fontSize: 8, lineHeight: 1.3, color: MUTED },
    crossDot: { width: 9, color: MUTED },

    validity: {
      marginTop: 7,
      borderWidth: 1,
      borderColor: "#EBD9A0",
      borderRadius: 3,
      paddingVertical: 4,
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

/**
 * Quantity, always to two decimals.
 *
 * "3.00" rather than "3", matching the reference document, because this column
 * also carries halves — a child at half rate is 0.50 of a bed — and a column
 * that switches between "3" and "0.50" down its length does not scan as one
 * set of figures. The database holds numeric(10,2) either way.
 */
function formatQuantity(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

/**
 * Every rupee figure on this document, formatted one way.
 *
 * With the symbol and without a trailing ".00". The invoice prints bare paise
 * in its totals column because the column is headed in rupees and an accountant
 * reconciling it wants the paise; a quotation is read by the customer, in whose
 * hands "₹12,40,000" is the figure and "12,40,000.00" is a spreadsheet. Paise
 * that are not zero still print, because the per-person figure is a division
 * and lands on them.
 */
function money(paise: number): string {
  return formatRupees(paise, { trimZeroPaise: true });
}

/** Label/value line inside the trip-details panel. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
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

  /* -------------------------------------------------- 025's blocks ------ */
  /* Each is conditional on having been filled in. A quotation written before
     these fields existed, or one for a standalone visa where none of them
     apply, prints exactly what it printed before — no empty panels, no
     headings with a dash under them. */

  const duration = durationLabel(quotation.duration_days);

  const tripDetails = [
    { label: "Service", value: quotation.service_type },
    { label: "Package", value: quotation.package_type },
    { label: "Sharing", value: quotation.sharing_type },
    { label: "Departing", value: quotation.departure_city },
  ].filter((row) => row.value?.trim());

  const preparedBy = [quotation.sales_rep_name, quotation.sales_rep_phone]
    .filter((part) => part?.trim())
    .join(" · ");

  const travellers = travellerSummary(quotation);
  const showTravellers = totalTravellers(quotation) > 0;

  const stays = (quotation.accommodation ?? []).filter(
    (stay) => stay && (stay.hotel?.trim() || stay.city?.trim()),
  );

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

          {/* The meta column, BESIDE the letterhead rather than boxed under
              it. The reference this table was drawn from puts it in a ruled box
              across the page, and that box cost the document around seventy
              points of height it does not have — a plain one-line quotation
              went to two pages, with the price on the first and the signature
              stranded on the second. Beside the logo it is free: that space is
              empty anyway. */}
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
              {quotation.return_date ? (
                <MetaLine
                  label="Return"
                  value={formatPdfDate(quotation.return_date)}
                />
              ) : null}
              {duration ? (
                <MetaLine label="Duration" value={duration} />
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
            {quotation.customer_phone || quotation.customer_email ? (
              <Text style={styles.muted}>
                {[quotation.customer_phone, quotation.customer_email]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ---------------------------------------------- trip details ----- */}
        {tripDetails.length || preparedBy || showTravellers ? (
          <View style={[styles.row, { marginTop: 10, gap: 8 }]} wrap={false}>
            {tripDetails.length || preparedBy ? (
              <View style={styles.panel}>
                <Text style={styles.panelHeading}>WHAT IS BEING QUOTED</Text>
                {tripDetails.map((row) => (
                  <Detail key={row.label} label={row.label} value={row.value} />
                ))}
                {preparedBy ? (
                  <Detail label="Prepared by" value={preparedBy} />
                ) : null}
              </View>
            ) : null}

            {showTravellers ? (
              <View style={styles.panel}>
                <Text style={styles.panelHeading}>TRAVELLERS</Text>
                {/* All four print, zeros included. "0 infants" is an answer the
                    customer gave; a blank is a question never asked, and on a
                    document quoting a price per bed that difference is the
                    price. */}
                <View style={[styles.row, { marginTop: 2 }]}>
                  {travellers.map((row) => (
                    <View key={row.label} style={styles.paxCell}>
                      <Text style={styles.paxCount}>{row.count}</Text>
                      <Text style={styles.paxLabel}>{row.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* -------------------------------------------- accommodation ------ */}
        {stays.length ? (
          <View style={[styles.panel, { marginTop: 8 }]} wrap={false}>
            <Text style={styles.panelHeading}>ACCOMMODATION</Text>
            {stays.map((stay, index) => (
              <View
                key={`${stay.city}-${index}`}
                style={index === 0 ? styles.row : styles.stayRow}
              >
                <Text style={styles.stayCity}>{stay.city || "—"}</Text>
                <View style={styles.stayHotel}>
                  <Text>{stay.hotel || "—"}</Text>
                  {/* Distance is the single most compared fact on an Umrah
                      quotation, so it sits under the hotel name rather than in
                      a column of its own where a long name would push it off. */}
                  <Text style={styles.tiny}>
                    {[
                      stay.distance,
                      stay.room,
                      stay.nights ? `${stay.nights} nights` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                {stay.check_in || stay.check_out ? (
                  <View style={styles.stayTimes}>
                    {stay.check_in ? (
                      <Text style={styles.tiny}>Check-in {stay.check_in}</Text>
                    ) : null}
                    {stay.check_out ? (
                      <Text style={styles.tiny}>
                        Check-out {stay.check_out}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ----------------------------------------------------- items ----- */}
        <View style={styles.table}>
          <View style={styles.tableHead} fixed>
            <Text style={[styles.cell, styles.colIndex]}>#</Text>
            <Text style={[styles.cell, styles.colDescription]}>
              Item &amp; Description
            </Text>
            <Text style={[styles.cell, styles.colQty]}>Qty</Text>
            <Text style={[styles.cell, styles.colRate]}>Rate</Text>
            <Text style={[styles.cellLast, styles.colAmount]}>Amount</Text>
          </View>

          {items.map((item, index) => {
            const lines = parseDescriptionLines(item.description);
            return (
              <View
                key={item.id}
                style={
                  index === 0
                    ? styles.tableRow
                    : [styles.tableRow, styles.tableRowRule]
                }
                wrap={false}
              >
                <Text style={[styles.cell, styles.colIndex]}>{index + 1}</Text>

                {/* The nesting the reference puts inside one cell: a package,
                    the room under it, then its inclusions two levels deep. All
                    of it is ONE priced line — splitting it into rows would put
                    a rate beside "Zam Zam Water". */}
                <View style={[styles.cell, styles.colDescription]}>
                  {lines.length ? (
                    lines.map((line, lineIndex) => (
                      <Text
                        key={`${lineIndex}-${line.text.slice(0, 24)}`}
                        style={[
                          lineIndex === 0
                            ? styles.itemTitle
                            : line.depth >= 2
                              ? styles.itemDeep
                              : styles.itemLine,
                          line.bold && lineIndex > 0
                            ? { fontWeight: 600 }
                            : undefined,
                          line.depth
                            ? { paddingLeft: line.depth * 8 }
                            : undefined,
                        ]}
                      >
                        {line.text}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.itemTitle}>—</Text>
                  )}
                </View>

                <View style={[styles.cell, styles.colQty]}>
                  <Text>{formatQuantity(Number(item.quantity))}</Text>
                  <Text style={styles.qtyUnit}>PAX</Text>
                </View>

                {/* A zero rate prints BLANK, not "₹0". A line priced at
                    nothing is an inclusion carried inside the package above it
                    — the air ticket, the visa — and "₹0" against it reads as a
                    thing being given away rather than a thing already paid for.
                    The reference document leaves both cells empty. */}
                <Text style={[styles.cell, styles.colRate]}>
                  {item.unit_price_paise ? money(item.unit_price_paise) : ""}
                </Text>
                <Text style={[styles.cellLast, styles.colAmount]}>
                  {item.line_total_paise ? money(item.line_total_paise) : ""}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ---------------------------------------------------- totals ----- */}
        {/* wrap={false}: the amount in words and the figure it spells out are
            one statement and must not be split across a page break. */}
        <View style={[styles.spread, { marginTop: 8 }]} wrap={false}>
          <View style={{ flex: 1, paddingRight: 18 }}>
            <Text style={styles.wordsHead}>Total in words:</Text>
            <Text style={styles.wordsBody}>
              {quotation.amount_in_words || paiseToWords(quotation.total_paise)}
            </Text>

            {quotation.notes ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.wordsHead}>Notes:</Text>
                <Text style={styles.muted}>{quotation.notes}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ width: 230 }}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Sub Total</Text>
              <Text>{money(quotation.subtotal_paise)}</Text>
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
                <Text>- {money(quotation.discount_paise)}</Text>
              </View>
            ) : null}

            {hasTax ? (
              <>
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Taxable value</Text>
                  <Text>{money(quotation.taxable_paise)}</Text>
                </View>
                {quotation.tax_mode === "cgst_sgst" ? (
                  <>
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>
                        CGST @ {formatTaxRate(quotation.tax_rate_bp / 2)}
                      </Text>
                      <Text>{money(quotation.cgst_paise)}</Text>
                    </View>
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLabel}>
                        SGST @ {formatTaxRate(quotation.tax_rate_bp / 2)}
                      </Text>
                      <Text>{money(quotation.sgst_paise)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLabel}>
                      IGST @ {formatTaxRate(quotation.tax_rate_bp)}
                    </Text>
                    <Text>{money(quotation.igst_paise)}</Text>
                  </View>
                )}
              </>
            ) : null}

            {quotation.round_off_paise !== 0 ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Round off</Text>
                <Text>
                  {quotation.round_off_paise < 0 ? "- " : ""}
                  {money(Math.abs(quotation.round_off_paise))}
                </Text>
              </View>
            ) : null}

            <View style={styles.grandTotal}>
              <Text>Total</Text>
              <Text style={{ color: GOLD }}>{money(quotation.total_paise)}</Text>
            </View>

            {perPerson !== null && quotation.pax && quotation.pax > 1 ? (
              <View style={styles.perPerson}>
                <View>
                  <Text>Per person</Text>
                  {/* "approx." stated in words, not as ≈. Noto Sans has NO
                      GLYPH for U+2248 — fonts.ts registers Regular and SemiBold
                      and neither carries it — so react-pdf drew .notdef and the
                      figure came out as a mangled box against the rupee sign.
                      Nothing warned: a missing glyph is not an error. The same
                      trap is noted for ★ at the end of CLAUDE.md. */}
                  <Text style={styles.perPersonMeta}>
                    {quotation.pax} travellers, approx.
                  </Text>
                </View>
                <Text>{money(perPerson)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ------------------------------------------- what this includes --- */}
        {inclusions.length || exclusions.length ? (
          <View style={[styles.row, { marginTop: 9, gap: 8 }]}>
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
        <View style={[styles.row, { marginTop: 9, gap: 8 }]}>
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
