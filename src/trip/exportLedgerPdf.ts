import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fmtMoney, type AdminMember } from "../admin/adminData";
import type { TripMeta } from "./api";
import {
  appliedCredit,
  expenseBalances,
  expensePaidBy,
  expenseTotals,
  netExpense,
} from "./expenses";
import type { Trip } from "./types";

// Bank-statement-style PDF export for the public ledger, patterned after a
// credit-card statement: blue section headings, a gray account-summary panel,
// a boxed registry-metadata summary, a ruled activity table, and small-print
// disclosures. Deliberately avoids the page's branded logos, color tags, and
// avatars. Rendered from an off-screen DOM node into a raster image via
// html2canvas, then embedded as a flat image rather than going through
// jsPDF's own `.html()`/Context2D vector-text path: that path replays text
// with jsPDF's built-in Helvetica font, which has no CJK glyphs and corrupts
// the Chinese expense names. Rasterizing uses the browser's own font stack,
// so any script it can render renders correctly.

// Multi-tenant context threaded in by the ledger page. All optional: the
// statement degrades to "-" placeholders when the registry row hasn't loaded
// or the viewer is anonymous.
export type StatementContext = {
  // The D1 registry row (visibility, caller's role, createdAt, timezone).
  meta?: TripMeta;
  // The Durable Object document revision the exported snapshot came from.
  rev?: number;
  // Display name of the signed-in user exporting the statement.
  preparedBy?: string;
};

const INK = "#161616";
const RULE = "#161616";
const MUTED = "#555555";
const ACCENT = "#1c5a96";
const PANEL = "#ececec";
const PANEL_RULE = "#ffffff";
const BOX_RULE = "#9a9a9a";
const STATEMENT_FONT =
  'Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Heiti SC", sans-serif';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

// "2026-07-02" -> "07/02/26", the short numeric form bank statements use.
function fmtShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1].slice(2)}` : iso;
}

// Today's date (YYYY-MM-DD) on the trip's own clock, not the device's or UTC.
function todayIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
}

// "YYYY-MM-DD HH:mm" in the trip's timezone, falling back to the device zone
// if the stored zone string is invalid.
function stampIn(timeZone: string, date = new Date()): string {
  if (Number.isNaN(date.getTime())) return "-";
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone, ...opts }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", opts).formatToParts(date);
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// Blue all-caps section heading ("ACCOUNT SUMMARY", "ACCOUNT ACTIVITY", ...).
function heading(text: string, topMargin = "0px"): HTMLDivElement {
  return el(
    "div",
    {
      fontSize: "17px",
      fontWeight: "800",
      color: ACCENT,
      textTransform: "uppercase",
      letterSpacing: "0.01em",
      margin: `${topMargin} 0 8px`,
    },
    [text],
  );
}

// Bold sub-section label with the thick gray underbar ("PURCHASES").
function sectionLabel(text: string): HTMLDivElement {
  return el(
    "div",
    {
      fontSize: "11.5px",
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: "0.02em",
      padding: "0 0 3px",
      borderBottom: "3px solid #bfbfbf",
      marginBottom: "2px",
    },
    [text],
  );
}

type KvRow = { label: string; value: string; strong?: boolean };

// Gray label/value panel (the "Account Summary" block): white hairlines
// between rows, a heavy rule above rows marked `strong`.
function summaryPanel(rows: KvRow[]): HTMLTableElement {
  const table = el("table", {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    background: PANEL,
  });
  const tbody = el("tbody");
  rows.forEach((row) => {
    const tr = el("tr");
    const common: Partial<CSSStyleDeclaration> = {
      padding: "6px 10px",
      borderBottom: `1px solid ${PANEL_RULE}`,
      fontWeight: row.strong ? "700" : "400",
      borderTop: row.strong ? `1.5px solid ${RULE}` : "",
    };
    tr.append(el("td", { ...common, textAlign: "left" }, [row.label]));
    tr.append(el("td", { ...common, textAlign: "right" }, [row.value]));
    tbody.append(tr);
  });
  table.append(tbody);
  return table;
}

// Fully boxed label/value table (the registry-summary block): every row is a
// gray cell ringed by thin dark rules, closed by one oversized total row.
function boxedPanel(rows: KvRow[], total: { label: string; value: string }): HTMLTableElement {
  const table = el("table", {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11.5px",
  });
  const tbody = el("tbody");
  rows.forEach((row) => {
    const tr = el("tr");
    const common: Partial<CSSStyleDeclaration> = {
      padding: "5px 8px",
      border: `1px solid ${BOX_RULE}`,
      background: PANEL,
    };
    tr.append(el("td", { ...common, textAlign: "left" }, [row.label]));
    tr.append(el("td", { ...common, textAlign: "right", fontWeight: "600" }, [row.value]));
    tbody.append(tr);
  });
  const totalRow = el("tr");
  totalRow.append(
    el(
      "td",
      {
        padding: "8px",
        border: `1px solid ${BOX_RULE}`,
        background: PANEL,
        fontSize: "13px",
        fontWeight: "800",
        color: ACCENT,
      },
      [total.label],
    ),
    el(
      "td",
      {
        padding: "8px",
        border: `1px solid ${BOX_RULE}`,
        background: PANEL,
        textAlign: "right",
        fontSize: "19px",
        fontWeight: "800",
        color: ACCENT,
      },
      [total.value],
    ),
  );
  tbody.append(totalRow);
  table.append(tbody);
  return table;
}

type Align = "left" | "right";

function statementTable(
  headers: string[],
  rows: (string | Node)[][],
  align: Align[],
  footRow?: (string | Node)[],
): HTMLTableElement {
  const table = el("table", {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    marginBottom: "22px",
  });

  const thead = el("thead");
  const headRow = el("tr");
  headers.forEach((h, i) => {
    headRow.append(
      el(
        "th",
        {
          textAlign: align[i] === "right" ? "right" : "left",
          padding: "6px 8px",
          borderBottom: `2px solid ${RULE}`,
          fontSize: "10.5px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        },
        [h],
      ),
    );
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  rows.forEach((row) => {
    const tr = el("tr");
    row.forEach((cell, i) => {
      tr.append(
        el(
          "td",
          {
            textAlign: align[i] === "right" ? "right" : "left",
            padding: "8px",
            borderBottom: "1px solid #d6d6d6",
            verticalAlign: "top",
          },
          [cell],
        ),
      );
    });
    tbody.append(tr);
  });
  table.append(tbody);

  if (footRow) {
    const tfoot = el("tfoot");
    const tr = el("tr");
    footRow.forEach((cell, i) => {
      tr.append(
        el(
          "td",
          {
            textAlign: align[i] === "right" ? "right" : "left",
            padding: "9px 8px",
            borderTop: `2px solid ${RULE}`,
            fontWeight: "700",
          },
          [cell],
        ),
      );
    });
    tfoot.append(tr);
    table.append(tfoot);
  }

  return table;
}

function disclosureParagraph(text: string): HTMLDivElement {
  return el("div", { fontSize: "9.5px", color: "#333333", lineHeight: "1.55", marginTop: "8px" }, [
    text,
  ]);
}

function buildStatement(
  trip: Trip,
  travelers: AdminMember[],
  context: StatementContext,
): HTMLDivElement {
  const { meta, rev, preparedBy } = context;
  const ledger = trip.expenses;
  const travelerIds = travelers.map((m) => m.id);
  const nameById = Object.fromEntries(travelers.map((m) => [m.id, m.name]));
  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger);
  const balances = expenseBalances(ledger, travelerIds);
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const each = balances[0]?.share ?? 0;
  const timezone = trip.base.timezone;
  const today = todayIn(timezone);
  const generatedAt = stampIn(timezone);
  const siteHost = "papertrip.xyspg.moe";

  // Itemized table rows. Each expense is one summary row; its scanned receipt
  // items (if any) each become their own short full-width row beneath it,
  // description indented on the left, price aligned under "Net" on the right,
  // like a bank-statement line. Keeping every item as a separate <tr> (instead
  // of one tall cell) is what lets the paginator break cleanly between lines
  // instead of slicing through a row at the page edge.
  const itemizedRows: (string | Node)[][] = [];
  for (const item of ledger) {
    const net = netExpense(item);
    const paidBy = expensePaidBy(item, travelerIds);
    const payers = travelers.filter((m) => (paidBy[m.id] ?? 0) > 0.005);
    const isSplit = payers.length > 1;

    const itemCell = el("div", {}, [
      el("div", { fontWeight: "700" }, [item.name]),
      el("div", { fontSize: "11px", color: MUTED, marginTop: "1px" }, [item.sub]),
    ]);

    const paidByCell = el(
      "div",
      {},
      payers.map((m) => {
        const amt = paidBy[m.id] ?? 0;
        const pct = net > 0 ? Math.round((amt / net) * 100) : 0;
        return el("div", {}, [isSplit ? `${m.name} ${pct}% (${fmtMoney(amt)})` : m.name]);
      }),
    );

    itemizedRows.push([
      itemCell,
      item.cat.toUpperCase(),
      fmtMoney(item.amount),
      item.credit > 0 ? "-" + fmtMoney(appliedCredit(item)) : "-",
      payers.length > 0 ? paidByCell : "-",
      fmtMoney(net),
    ]);

    if (item.items && item.items.length > 0) {
      for (const li of item.items) {
        const qty = li.quantity > 1 ? `${li.quantity}x ` : "";
        const sharers =
          li.who && li.who.length > 0
            ? li.who
                .map((id) => nameById[id])
                .filter(Boolean)
                .join(", ")
            : "";
        const liCell = el("div", { paddingLeft: "16px", fontSize: "11px", color: INK }, [
          `${qty}${li.name}${sharers ? `  (${sharers})` : ""}`,
        ]);
        const priceCell = el("div", { fontSize: "11px", color: INK }, [fmtMoney(li.price)]);
        itemizedRows.push([liCell, "", "", "", "", priceCell]);
      }
    }
  }

  // Kept off-screen by the zero-size wrapper in exportLedgerPdf, not here:
  // this node must carry no hiding styles (position/visibility/opacity) of
  // its own, since html2canvas renders it as laid out.
  const container = el("div", {
    width: "800px",
    background: "#ffffff",
    color: INK,
    fontFamily: STATEMENT_FONT,
    lineHeight: "1.5",
    // html2canvas occasionally under-measures the element's true rendered
    // height by a few px, shaving pixels off the last line; this padding is
    // a sacrificial margin so that's what clips, not real content.
    padding: "0 0 24px",
  });

  // Masthead: wordmark on the left, service pointers on the right, closed by
  // a heavy rule, the way card statements open.
  container.append(
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, [
      el("div", {}, [
        el("div", { display: "flex", alignItems: "center", gap: "8px" }, [
          (() => {
            const mark = el("img", { width: "24px", height: "24px", display: "block" });
            mark.src = "/favicon.png";
            mark.alt = "";
            return mark;
          })(),
          el("div", { fontSize: "21px", fontWeight: "800", letterSpacing: "0.01em" }, [
            "PAPERTRIP",
            el("span", { fontSize: "10px", verticalAlign: "super" }, ["®"]),
          ]),
        ]),
        el(
          "div",
          {
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "0.14em",
            color: MUTED,
            marginTop: "4px",
            textTransform: "uppercase",
          },
          ["Trip Expense Statement"],
        ),
      ]),
      el("div", { textAlign: "right", fontSize: "10.5px", lineHeight: "1.5" }, [
        el("div", { fontWeight: "700" }, ["Manage your trip online at:"]),
        el("div", { color: MUTED }, [`${siteHost}/t/${trip.id}`]),
        el("div", { fontWeight: "700", marginTop: "5px" }, ["Statement inquiries:"]),
        el("div", { color: MUTED }, [`${siteHost}/t/${trip.id}/admin`]),
      ]),
    ]),
    el("div", { borderTop: `3px solid ${RULE}`, margin: "12px 0 18px" }),
  );

  // Headline figures, statement-banner style.
  const bannerFigure = (label: string, value: string, valueSize = "24px") =>
    el("div", {}, [
      el("div", { fontSize: "12px", fontWeight: "700" }, [label]),
      el("div", { fontSize: valueSize, fontWeight: "800", color: ACCENT, marginTop: "2px" }, [
        value,
      ]),
    ]);
  container.append(
    el("div", { display: "flex", gap: "48px", marginBottom: "20px" }, [
      bannerFigure("New Balance", fmtMoney(grand)),
      bannerFigure("Per Person Due", fmtMoney(each)),
      bannerFigure("Statement Date", fmtShortDate(today), "20px"),
    ]),
  );

  // Two-column band: account summary on the left, the multi-tenant registry
  // summary on the right. This band always fits on page one, so the paginator
  // never has to cut inside the side-by-side tables.
  container.append(
    el("div", { display: "flex", gap: "26px", alignItems: "flex-start", marginBottom: "24px" }, [
      el("div", { flex: "1.15" }, [
        heading("Account Summary"),
        summaryPanel([
          { label: "Trip Account:", value: trip.id, strong: true },
          {
            label: "Opening/Closing Date",
            value: `${fmtShortDate(trip.dates.start)} - ${fmtShortDate(trip.dates.end)}`,
          },
          { label: "Purchases", value: "+" + fmtMoney(subtotal) },
          { label: "Credits Applied", value: "-" + fmtMoney(creditTotal) },
          { label: "Fees Charged", value: fmtMoney(0) },
          { label: "Interest Charged", value: fmtMoney(0) },
          { label: "New Balance", value: fmtMoney(grand), strong: true },
          { label: "Members Enrolled", value: String(travelers.length) },
          { label: "Per-Person Share", value: fmtMoney(each) },
        ]),
      ]),
      el("div", { flex: "1" }, [
        heading("Trip Registry Summary"),
        boxedPanel(
          [
            { label: "Trip ID", value: trip.id },
            { label: "Visibility", value: meta ? meta.visibility.toUpperCase() : "-" },
            { label: "Access role", value: meta?.role ? meta.role.toUpperCase() : "GUEST" },
            { label: "Timezone", value: timezone },
            {
              label: "Registry created",
              value: meta ? fmtShortDate(meta.createdAt.slice(0, 10)) : "-",
            },
            { label: "Ledger revision", value: rev != null ? String(rev) : "-" },
            {
              label: "Last activity",
              value: stampIn(timezone, new Date(trip.updatedAt)),
            },
            { label: "Prepared by", value: preparedBy ?? "Guest session" },
          ],
          { label: "Expense lines this statement", value: String(ledger.length) },
        ),
        el("div", { fontSize: "10px", color: MUTED, marginTop: "6px", lineHeight: "1.5" }, [
          "Live trip state is serviced by a dedicated Durable Object per trip; " +
            "membership and registry records are maintained in the PaperTrip D1 registry.",
        ]),
      ]),
    ]),
  );

  container.append(
    heading("Settlement Summary"),
    statementTable(
      ["Member", "Member Key", "Paid", "Required Share", "Balance", "Disposition"],
      travelers.map((m) => {
        const b = balanceById[m.id];
        const net = b?.balance ?? 0;
        const settled = Math.abs(net) < 0.005;
        const status = settled ? "SETTLED" : net < 0 ? "OWES" : "IS OWED";
        const key = m.id.length > 12 ? m.id.slice(0, 12) + "…" : m.id;
        return [
          m.name,
          key,
          fmtMoney(b?.paid ?? 0),
          fmtMoney(b?.share ?? each),
          settled ? fmtMoney(0) : (net < 0 ? "-" : "+") + fmtMoney(Math.abs(net)),
          status,
        ];
      }),
      ["left", "left", "right", "right", "right", "right"],
    ),

    heading("Account Activity"),
    sectionLabel("Purchases"),
    statementTable(
      ["Description", "Category", "Amount", "Credit", "Paid By", "Net"],
      itemizedRows,
      ["left", "left", "right", "right", "left", "right"],
      ["", "", "", "", "Net Total", fmtMoney(grand)],
    ),
  );

  // Centered year-to-date totals box.
  const totalsYear = trip.dates.start.slice(0, 4) || today.slice(0, 4);
  const totalsRow = (label: string, value: string) =>
    el(
      "div",
      {
        display: "flex",
        justifyContent: "space-between",
        gap: "24px",
        padding: "3px 12px",
        fontSize: "11.5px",
      },
      [el("span", {}, [label]), el("span", { fontWeight: "600" }, [value])],
    );
  container.append(
    el("div", { display: "flex", justifyContent: "center", marginBottom: "6px" }, [
      el("div", { width: "360px", border: `1.5px solid ${RULE}` }, [
        el(
          "div",
          {
            textAlign: "center",
            fontWeight: "700",
            fontSize: "12px",
            background: PANEL,
            padding: "4px 12px",
            borderBottom: `1px solid ${RULE}`,
          },
          [`${totalsYear} Trip Totals to Date`],
        ),
        el("div", { padding: "5px 0" }, [
          totalsRow(`Total charges posted in ${totalsYear}`, fmtMoney(subtotal)),
          totalsRow(`Total credits applied in ${totalsYear}`, "-" + fmtMoney(creditTotal)),
        ]),
      ]),
    ]),
    el("div", { textAlign: "center", fontSize: "9.5px", color: MUTED, marginBottom: "22px" }, [
      "Totals reflect every expense recorded on this trip's shared ledger.",
    ]),
  );

  // Small-print disclosures.
  const accessSentence =
    meta?.visibility === "private"
      ? "This trip is PRIVATE: access is limited to enrolled members."
      : meta?.visibility === "public"
        ? "This trip is PUBLIC: anyone holding the link may view it."
        : "Access is governed by the trip's registry visibility record.";
  container.append(
    el(
      "div",
      {
        fontSize: "11.5px",
        fontWeight: "700",
        textTransform: "uppercase",
        borderBottom: `1.5px solid ${RULE}`,
        paddingBottom: "3px",
      },
      ["Information About This Statement"],
    ),
    disclosureParagraph(
      `This statement was produced from the live shared ledger of trip "${trip.title}" ` +
        `(trip ID ${trip.id})${rev != null ? `, document revision ${rev},` : ""} on ` +
        `${generatedAt} (${timezone}). Figures reflect the ledger at the moment of export; ` +
        "subsequent edits to the trip are not shown.",
    ),
    disclosureParagraph(
      "Service architecture: every PaperTrip trip is serviced by a dedicated Durable Object " +
        "holding its live state, audit log, and backups. Trip registration, membership, and " +
        `invitations are recorded in the PaperTrip D1 registry. ${accessSentence} ` +
        "Destructive bulk operations are restricted to the trip owner.",
    ),
    disclosureParagraph(
      "Per-person shares are computed as an equal split across enrolled travelers unless an " +
        "expense carries an explicit split override, in which case contributions are " +
        "normalized against the override weights. Applied credits reduce the net amount of " +
        "the expense they are attached to. All amounts are stated in U.S. dollars.",
    ),
    disclosureParagraph(
      "Balances shown under Settlement Summary are informational and do not constitute a " +
        "demand for payment. PaperTrip is not a financial institution; this document is not " +
        "a bank statement, an invoice, or a receipt.",
    ),
    el(
      "div",
      {
        fontSize: "9px",
        color: MUTED,
        marginTop: "12px",
        borderTop: "1px solid #d6d6d6",
        paddingTop: "6px",
      },
      [`Statement reference: ${trip.id} / rev ${rev ?? "-"} / ${today}  ·  ${siteHost}`],
    ),
  );

  return container;
}

export async function exportLedgerPdf(
  trip: Trip,
  travelers: AdminMember[],
  context: StatementContext = {},
  previewWindow?: Window | null,
) {
  const container = buildStatement(trip, travelers, context);

  // The wrapper (not the container itself) carries the off-screen styles, so
  // html2canvas only ever sees the clean, normally-laid-out content node.
  const wrapper = el("div", {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    overflow: "hidden",
  });
  wrapper.append(container);
  document.body.append(wrapper);

  // Wait for the masthead image to finish decoding: html2canvas snapshots the
  // DOM as laid out, and an image that is still loading rasterizes as a blank
  // box. Decode failures (missing asset) just drop the mark, never the export.
  await Promise.all(
    Array.from(container.querySelectorAll("img")).map((img) => img.decode().catch(() => {})),
  );

  // Canvas px per CSS px. Used both for the raster render and for converting the
  // measured DOM row positions below into the same coordinate space.
  const SCALE = 2;

  // Safe page-break boundaries (canvas px): the top edge of every table row.
  // The paginator only ever cuts a page at one of these, so a row is never
  // sliced in half across the page edge. Measured while the node is laid out
  // in the DOM (before html2canvas tears its clone down).
  const containerTop = container.getBoundingClientRect().top;
  const breakOffsets = Array.from(container.querySelectorAll("tr"))
    .map((tr) => Math.round((tr.getBoundingClientRect().top - containerTop) * SCALE))
    .filter((y) => y > 0)
    .sort((a, b) => a - b);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(container, {
      scale: SCALE,
      backgroundColor: "#ffffff",
      windowWidth: 800,
    });
  } finally {
    wrapper.remove();
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const footerSpace = 16;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2 - footerSpace;

  const ptPerPx = usableWidth / canvas.width;
  const pageSliceHeightPx = Math.floor(usableHeight / ptPerPx);

  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < canvas.height) {
    const maxEnd = renderedPx + pageSliceHeightPx;
    // If the rest of the statement fits on one page, take it all. Otherwise cut
    // at the lowest row boundary that still fits, so no line is split. A single
    // row taller than a whole page (shouldn't happen with these short rows)
    // falls back to a hard cut so the loop still makes progress.
    let end: number;
    if (canvas.height <= maxEnd) {
      end = canvas.height;
    } else {
      end = -1;
      for (const b of breakOffsets) {
        if (b > renderedPx + 1 && b <= maxEnd) end = b;
      }
      if (end < 0) end = maxEnd;
    }

    const sliceHeightPx = end - renderedPx;
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(
      canvas,
      0,
      renderedPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    if (pageIndex > 0) doc.addPage();
    // JPEG, not PNG: the statement is black ink on white, so a high-quality JPEG
    // is a fraction of the lossless-PNG size per page with no visible difference.
    doc.addImage(
      slice.toDataURL("image/jpeg", 0.92),
      "JPEG",
      margin,
      margin,
      usableWidth,
      sliceHeightPx * ptPerPx,
    );

    renderedPx = end;
    pageIndex++;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  const today = todayIn(trip.base.timezone);
  const filename = `${trip.id}-expense-statement-${today}.pdf`;
  doc.setProperties({
    title: `${trip.id}-expense-statement-${today}`,
    subject: `Trip expense statement for "${trip.title}" (trip ${trip.id})`,
    author: "PaperTrip",
    keywords: [
      "papertrip",
      trip.id,
      context.meta ? `visibility:${context.meta.visibility}` : null,
      context.rev != null ? `rev:${context.rev}` : null,
      `tz:${trip.base.timezone}`,
    ]
      .filter(Boolean)
      .join(", "),
    creator: "PaperTrip (papertrip.xyspg.moe)",
  });

  const blobUrl = doc.output("bloburl").toString();
  if (previewWindow) {
    // Reuses the tab the caller already opened synchronously on click, since
    // opening one only now (after the async render above) would be blocked
    // as a popup by most browsers.
    previewWindow.location.href = blobUrl;
  } else {
    // No tab to navigate (likely blocked) — fall back to a normal download.
    doc.save(filename);
  }
}
