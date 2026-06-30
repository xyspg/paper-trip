import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { AdminMember } from "../admin/adminData";
import {
  appliedCredit,
  expenseBalances,
  expensePaidBy,
  expenseTotals,
  netExpense,
} from "./expenses";
import type { Trip } from "./types";

// Plain, bank-statement-style PDF export for the public ledger. Deliberately
// avoids any of the page's branded logos, color tags, or avatars — black ink
// on white, ruled tables, nothing decorative. Rendered from an off-screen DOM
// node into a raster image via html2canvas, then embedded as a flat image
// rather than going through jsPDF's own `.html()`/Context2D vector-text path:
// that path replays text with jsPDF's built-in Helvetica font, which has no
// CJK glyphs and corrupts the Chinese expense names. Rasterizing uses the
// browser's own font stack, so any script it can render renders correctly.

const fmt = (n: number) =>
  "$" +
  (Math.round(n * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const INK = "#161616";
const RULE = "#161616";
const MUTED = "#555555";
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
          padding: "7px 8px",
          borderTop: `1.5px solid ${RULE}`,
          borderBottom: `1.5px solid ${RULE}`,
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
            borderTop: `1.5px solid ${RULE}`,
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

function buildStatement(trip: Trip, travelers: AdminMember[]): HTMLDivElement {
  const ledger = trip.expenses;
  const travelerIds = travelers.map((m) => m.id);
  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger);
  const balances = expenseBalances(ledger, travelerIds);
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const each = balances[0]?.share ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  // Kept off-screen by the zero-size wrapper in exportLedgerPdf, not here —
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

  container.append(
    el("div", { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, [
      el("div", {}, [
        el("div", { fontSize: "22px", fontWeight: "700" }, [trip.title]),
        el("div", { fontSize: "12px", color: MUTED, marginTop: "3px" }, ["Expense Statement"]),
      ]),
      el("div", { textAlign: "right", fontSize: "11px", color: MUTED }, [
        el("div", {}, [`Trip period: ${trip.dates.start} - ${trip.dates.end}`]),
        el("div", { marginTop: "2px" }, [`Statement date: ${today}`]),
      ]),
    ]),
    el("div", { borderTop: `2px solid ${RULE}`, margin: "14px 0 22px" }),

    el(
      "div",
      {
        fontSize: "12px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "8px",
      },
      ["Summary"],
    ),
    statementTable(
      ["", ""],
      [
        ["Subtotal", fmt(subtotal)],
        ["Chase IHG credit applied", "-" + fmt(creditTotal)],
        ["Net total", fmt(grand)],
        ["Per person", fmt(each)],
      ],
      ["left", "right"],
    ),

    el(
      "div",
      {
        fontSize: "12px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "8px",
      },
      ["Settlement by Traveler"],
    ),
    statementTable(
      ["Traveler", "Paid", "Share", "Balance"],
      travelers.map((m) => {
        const b = balanceById[m.id];
        const net = b?.balance ?? 0;
        const settled = Math.abs(net) < 0.005;
        const status = settled ? "settled" : net < 0 ? "owes" : "is owed";
        return [
          m.name,
          fmt(b?.paid ?? 0),
          fmt(b?.share ?? each),
          `${fmt(Math.abs(net))} (${status})`,
        ];
      }),
      ["left", "right", "right", "right"],
    ),

    el(
      "div",
      {
        fontSize: "12px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "8px",
      },
      ["Itemized Expenses"],
    ),
    statementTable(
      ["Item", "Amount", "Credit", "Paid by", "Net"],
      ledger.map((item) => {
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
            return el("div", {}, [isSplit ? `${m.name} ${pct}% (${fmt(amt)})` : m.name]);
          }),
        );

        return [
          itemCell,
          fmt(item.amount),
          item.credit > 0 ? "-" + fmt(appliedCredit(item)) : "—",
          payers.length > 0 ? paidByCell : "—",
          fmt(net),
        ];
      }),
      ["left", "right", "right", "left", "right"],
      ["", "", "", "Net total", fmt(grand)],
    ),

    el("div", { fontSize: "10px", color: MUTED, marginTop: "8px" }, [
      `${trip.title} — Expense Statement — generated ${today}`,
    ]),
  );

  return container;
}

export async function exportLedgerPdf(
  trip: Trip,
  travelers: AdminMember[],
  previewWindow?: Window | null,
) {
  const container = buildStatement(trip, travelers);

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

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(container, {
      scale: 2,
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
    const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - renderedPx);
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
    doc.addImage(
      slice.toDataURL("image/png"),
      "PNG",
      margin,
      margin,
      usableWidth,
      sliceHeightPx * ptPerPx,
    );

    renderedPx += sliceHeightPx;
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

  const today = new Date().toISOString().slice(0, 10);
  const slug = `${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-expense-statement-${today}`;
  const filename = `${slug}.pdf`;
  doc.setProperties({ title: slug });

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
