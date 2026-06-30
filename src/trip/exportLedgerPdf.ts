import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fmtMoney, type AdminMember } from "../admin/adminData";
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
  const nameById = Object.fromEntries(travelers.map((m) => [m.id, m.name]));
  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger);
  const balances = expenseBalances(ledger, travelerIds);
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const each = balances[0]?.share ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  // Itemized table rows. Each expense is one summary row; its scanned receipt
  // items (if any) each become their own short full-width row beneath it —
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
      fmtMoney(item.amount),
      item.credit > 0 ? "-" + fmtMoney(appliedCredit(item)) : "—",
      payers.length > 0 ? paidByCell : "—",
      fmtMoney(net),
    ]);

    if (item.items && item.items.length > 0) {
      for (const li of item.items) {
        const qty = li.quantity > 1 ? `${li.quantity}× ` : "";
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
        itemizedRows.push([liCell, "", "", "", priceCell]);
      }
    }
  }

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
        ["Subtotal", fmtMoney(subtotal)],
        ["Chase IHG credit applied", "-" + fmtMoney(creditTotal)],
        ["Net total", fmtMoney(grand)],
        ["Per person", fmtMoney(each)],
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
          fmtMoney(b?.paid ?? 0),
          fmtMoney(b?.share ?? each),
          `${fmtMoney(Math.abs(net))} (${status})`,
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
      itemizedRows,
      ["left", "right", "right", "left", "right"],
      ["", "", "", "Net total", fmtMoney(grand)],
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
