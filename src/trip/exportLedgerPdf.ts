import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fmtMoney, type AdminMember } from "../admin/adminData";
import type { TripMeta } from "./api";
import {
  appliedCredit,
  expenseBalances,
  expenseFxRate,
  expenseOwedBy,
  expensePaidBy,
  expenseTotals,
  netExpense,
} from "./expenses";
import { expenseCurrency, fmtFxRate, tripCurrency } from "./currency";
import type { Trip } from "./types";

// Bank-statement-style PDF export for the public ledger, patterned after a
// credit-card statement: narrow statement stock, repeated service masthead and
// account footer, asymmetric balance summaries, ruled activity groups, and
// small-print disclosures. Technical registry metadata is demoted to the trip
// messages and statement reference instead of presented as a product panel.
// Rendered from an off-screen DOM node into a raster image via
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

const INK = "#111111";
const RULE = "#111111";
const MUTED = "#4f4f4f";
const ACCENT = "#176aa6";
const PANEL = "#e5e5e5";
const SOFT_RULE = "#c9c9c9";
const SITE_HOST = "papertrip.xyspg.moe";
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

// "2027-08-16" -> "08/16/27", the short numeric form bank statements use.
function fmtShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1].slice(2)}` : iso;
}

function fmtMonthYear(iso: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : iso;
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
  const node = el(
    "div",
    {
      fontSize: "19px",
      fontWeight: "800",
      color: ACCENT,
      textTransform: "uppercase",
      lineHeight: "1.05",
      margin: `${topMargin} 0 7px`,
    },
    [text],
  );
  node.dataset.statementBreak = "";
  return node;
}

type KvRow = { label: string; value: string; strong?: boolean };

// Grid rows avoid html2canvas's border-collapse rounding bugs, which can move a
// shared table border up into the text above it at statement-scale rendering.
function summaryPanel(rows: KvRow[]): HTMLDivElement {
  const panel = el("div", {
    width: "100%",
    fontSize: "11.5px",
    background: PANEL,
    padding: "7px 0",
  });
  rows.forEach((row) => {
    if (row.strong) {
      panel.append(
        el("div", {
          height: "1.5px",
          margin: "5px 0 4px",
          background: RULE,
        }),
      );
    }
    panel.append(
      el(
        "div",
        {
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(120px, auto)",
          columnGap: "14px",
          alignItems: "baseline",
          minHeight: "18px",
          padding: "2px 8px",
          lineHeight: "1.25",
          fontWeight: row.strong ? "700" : "400",
        },
        [
          el("div", { minWidth: "0" }, [row.label]),
          el("div", { minWidth: "0", textAlign: "right", overflowWrap: "anywhere" }, [row.value]),
        ],
      ),
    );
  });
  return panel;
}

type Align = "left" | "right";

function statementTable(
  headers: string[],
  rows: (string | Node)[][],
  align: Align[],
  columns: string,
): HTMLDivElement {
  const table = el("div", {
    width: "100%",
    fontSize: "11.5px",
    marginBottom: "18px",
  });
  const headRow = el("div", {
    display: "grid",
    gridTemplateColumns: columns,
    alignItems: "end",
  });
  headers.forEach((h, i) => {
    headRow.append(
      el(
        "div",
        {
          textAlign: align[i] === "right" ? "right" : "left",
          padding: "4px 6px 5px",
          fontSize: "10.5px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: "1.15",
        },
        [h],
      ),
    );
  });
  table.append(headRow, el("div", { height: "1.5px", marginBottom: "4px", background: RULE }));

  rows.forEach((row) => {
    const gridRow = el("div", {
      display: "grid",
      gridTemplateColumns: columns,
      alignItems: "start",
      minHeight: "39px",
      padding: "5px 0",
      lineHeight: "1.25",
    });
    row.forEach((cell, i) => {
      gridRow.append(
        el(
          "div",
          {
            textAlign: align[i] === "right" ? "right" : "left",
            minWidth: "0",
            padding: "0 6px",
          },
          [cell],
        ),
      );
    });
    gridRow.dataset.statementBreak = "";
    table.append(gridRow);
  });
  return table;
}

type ActivityRow = {
  category: string;
  description: Node | string;
  amount: string;
  detail?: boolean;
};

function activityTable(
  groups: { label: string; rows: ActivityRow[] }[],
  baseCurrency: string,
): HTMLDivElement {
  const columns = "120px minmax(0, 1fr) 110px";
  const table = el("div", {
    width: "100%",
    fontSize: "11.5px",
    marginBottom: "18px",
  });
  const headRow = el("div", {
    display: "grid",
    gridTemplateColumns: columns,
    alignItems: "end",
  });
  [
    { label: "Category", align: "left" },
    { label: "Merchant Name or Transaction Description", align: "left" },
    { label: `Amount (${baseCurrency})`, align: "right" },
  ].forEach((column) => {
    headRow.append(
      el(
        "div",
        {
          padding: "3px 5px 5px",
          textAlign: column.align,
          fontSize: "10.5px",
          fontWeight: "400",
          lineHeight: "1.15",
        },
        [column.label],
      ),
    );
  });
  table.append(headRow);

  for (const group of groups) {
    if (group.rows.length === 0) continue;
    const groupHeading = el(
      "div",
      {
        padding: "7px 0 3px",
        fontSize: "11.5px",
        fontWeight: "800",
        textTransform: "uppercase",
        lineHeight: "1.15",
      },
      [group.label],
    );
    groupHeading.dataset.statementBreak = "";
    table.append(
      groupHeading,
      el("div", { height: "4px", marginBottom: "4px", background: SOFT_RULE }),
    );

    for (const row of group.rows) {
      const gridRow = el("div", {
        display: "grid",
        gridTemplateColumns: columns,
        alignItems: "start",
        minHeight: row.detail ? "18px" : "39px",
        padding: row.detail ? "1px 0" : "5px 0",
        lineHeight: "1.25",
      });
      gridRow.append(
        el(
          "div",
          {
            minWidth: "0",
            padding: row.detail ? "0 5px 0 18px" : "0 5px",
            fontSize: row.detail ? "10px" : "10.5px",
            color: row.detail ? MUTED : INK,
            textTransform: row.detail ? "none" : "uppercase",
          },
          [row.category],
        ),
        el(
          "div",
          {
            minWidth: "0",
            padding: "0 5px",
            fontSize: row.detail ? "10px" : "11.5px",
            color: row.detail ? MUTED : INK,
          },
          [row.description],
        ),
        el(
          "div",
          {
            minWidth: "0",
            padding: "0 5px",
            fontSize: row.detail ? "10px" : "11.5px",
            color: row.detail ? MUTED : INK,
            textAlign: "right",
          },
          [row.amount],
        ),
      );
      gridRow.dataset.statementBreak = "";
      table.append(gridRow);
    }
  }
  return table;
}

function disclosureParagraph(text: string): HTMLDivElement {
  const node = el(
    "div",
    { fontSize: "9.5px", color: "#333333", lineHeight: "1.4", marginTop: "8px" },
    [text],
  );
  node.dataset.statementBreak = "";
  return node;
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
  // The statement is stated entirely in the trip's base currency; expenses
  // recorded in another currency convert at their captured rate, with the
  // original figure noted on the row.
  const baseCurrency = tripCurrency(trip);
  const money = (n: number) => fmtMoney(n, baseCurrency);
  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger, baseCurrency);
  const balances = expenseBalances(ledger, travelerIds, baseCurrency);
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const outstanding = balances.reduce((sum, balance) => sum + Math.max(0, -balance.balance), 0);
  const timezone = trip.base.timezone;
  const today = todayIn(timezone);
  const generatedAt = stampIn(timezone);

  // Activity follows the reference statement's simple three-column structure.
  // Credits are posted in their own section instead of living in a dedicated
  // product-looking column, and receipt details sit under their parent charge.
  const purchaseRows: ActivityRow[] = [];
  const creditRows: ActivityRow[] = [];
  const categoryLabels: Record<string, string> = {
    transit: "Travel",
    food: "Dining",
    event: "Event",
    stay: "Lodging",
    misc: "Other",
  };
  for (const item of ledger) {
    const net = netExpense(item);
    const paidBy = expensePaidBy(item, travelerIds);
    const owedBy = expenseOwedBy(item, travelerIds);
    const payers = travelers.filter((m) => (paidBy[m.id] ?? 0) > 0.005);
    const isSplit = payers.length > 1;
    const rowCurrency = expenseCurrency(item, baseCurrency);
    const foreign = rowCurrency !== baseCurrency;
    // Rows that resolve to the base currency always convert at exactly 1,
    // matching the aggregation gate in expenseTotals/expenseBalances.
    const rate = foreign ? expenseFxRate(item) : 1;

    const payerText = payers
      .map((m) => {
        const amount = paidBy[m.id] ?? 0;
        const percent = net > 0 ? Math.round((amount / net) * 100) : 0;
        return isSplit ? `${m.name} ${percent}%` : m.name;
      })
      .join(" / ");
    const allocationText = travelers
      .filter((m) => (owedBy[m.id] ?? 0) > 0.005)
      .map((m) => `${m.name} ${money((owedBy[m.id] ?? 0) * rate)}`)
      .join(" / ");
    purchaseRows.push({
      category: categoryLabels[item.cat] ?? item.cat,
      description: el("div", {}, [
        el("div", { fontWeight: "600" }, [item.name]),
        el("div", { marginTop: "1px", fontSize: "10px", color: MUTED }, [
          [
            item.sub,
            foreign ? `RECORDED ${fmtMoney(item.amount, rowCurrency)} @ ${fmtFxRate(rate)}` : "",
            payerText ? `PAID BY ${payerText}` : "",
            allocationText ? `ALLOCATED TO ${allocationText}` : "",
          ]
            .filter(Boolean)
            .join("  ·  "),
        ]),
      ]),
      amount: money(item.amount * rate),
    });

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
        purchaseRows.push({
          category: "",
          description:
            `Receipt detail: ${qty}${li.name} · ${fmtMoney(li.price, rowCurrency)}` +
            (sharers ? ` · ${sharers}` : ""),
          amount: "",
          detail: true,
        });
      }
    }

    const credit = appliedCredit(item);
    if (credit > 0) {
      creditRows.push({
        category: "Credit",
        description: el("div", {}, [
          el("div", { fontWeight: "600" }, [`${item.name} statement credit`]),
          el("div", { marginTop: "1px", fontSize: "10px", color: MUTED }, [
            "CREDIT APPLIED TO TRIP PURCHASE",
          ]),
        ]),
        amount: "-" + money(credit * rate),
      });
    }
  }

  // This node deliberately contains the statement body only. A crisp vector
  // masthead and footer are added by jsPDF on every page after rasterization.
  const container = el("div", {
    width: "800px",
    background: "#ffffff",
    color: INK,
    fontFamily: STATEMENT_FONT,
    lineHeight: "1.3",
    padding: "0 0 18px",
  });

  const bannerFigure = (label: string, value: string, valueSize = "23px") =>
    el("div", {}, [
      el("div", { fontSize: "11.5px", fontWeight: "400" }, [label]),
      el(
        "div",
        {
          fontSize: valueSize,
          fontWeight: "800",
          color: ACCENT,
          lineHeight: "1",
          marginTop: "1px",
        },
        [value],
      ),
    ]);

  const statementCycle = el("div", { minWidth: "0" }, [
    el("div", { background: PANEL, borderLeft: `9px solid ${ACCENT}` }, [
      el(
        "div",
        {
          padding: "7px 10px",
          background: ACCENT,
          color: "#ffffff",
          textAlign: "center",
          fontSize: "12px",
        },
        [fmtMonthYear(today)],
      ),
      el("div", { padding: "11px 12px 12px" }, [
        el("div", { fontSize: "16px", fontWeight: "700", lineHeight: "1.15" }, [trip.title]),
        el(
          "div",
          { marginTop: "8px", fontSize: "9.5px", color: MUTED, textTransform: "uppercase" },
          ["Trip Period"],
        ),
        el("div", { marginTop: "1px", fontSize: "12px", fontWeight: "600" }, [
          `${fmtShortDate(trip.dates.start)} - ${fmtShortDate(trip.dates.end)}`,
        ]),
        el(
          "div",
          { marginTop: "7px", fontSize: "9.5px", color: MUTED, textTransform: "uppercase" },
          ["Trip Account"],
        ),
        el(
          "div",
          { marginTop: "1px", fontSize: "10.5px", fontWeight: "600", wordBreak: "break-all" },
          [trip.id],
        ),
      ]),
    ]),
  ]);

  const headlineFigures = el("div", { minWidth: "0", display: "grid", gap: "10px" }, [
    bannerFigure("New Balance", money(grand)),
    bannerFigure("Settlement Due", money(outstanding)),
    bannerFigure("Statement Date", fmtShortDate(today), "18px"),
  ]);

  const balanceSummary = el("div", { minWidth: "0" }, [
    heading("Trip Balance Summary"),
    summaryPanel([
      { label: "Previous balance", value: money(0) },
      { label: "Purchases", value: "+" + money(subtotal) },
      { label: "Credits", value: "-" + money(creditTotal) },
      { label: "Fees charged", value: money(0) },
      { label: "Interest charged", value: money(0) },
      { label: "Travelers", value: String(travelers.length) },
    ]),
    el(
      "div",
      {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "baseline",
        gap: "12px",
        minHeight: "38px",
        padding: "8px 8px 7px",
        borderTop: `1.5px solid ${RULE}`,
        borderBottom: `1.5px solid ${RULE}`,
        background: PANEL,
        color: ACCENT,
        fontWeight: "800",
      },
      [
        el("span", { minWidth: "0", fontSize: "16px", lineHeight: "1.15" }, ["Total trip balance"]),
        el("span", { fontSize: "20px", lineHeight: "1.15", textAlign: "right" }, [money(grand)]),
      ],
    ),
  ]);

  container.append(
    el(
      "div",
      {
        display: "grid",
        gridTemplateColumns: "235px 175px minmax(0, 1fr)",
        columnGap: "24px",
        alignItems: "start",
        marginBottom: "18px",
      },
      [statementCycle, headlineFigures, balanceSummary],
    ),
  );

  const openBalances = balances.filter((balance) => Math.abs(balance.balance) >= 0.005).length;
  const noticeLine = (label: string, body: string) =>
    el("div", { maxWidth: "650px", marginTop: "6px", fontSize: "10.5px", lineHeight: "1.35" }, [
      el("span", { fontWeight: "700" }, [label]),
      " ",
      body,
    ]);
  container.append(
    noticeLine(
      "Settlement Notice:",
      openBalances === 0
        ? "All traveler balances are settled."
        : `${openBalances} traveler balance${openBalances === 1 ? " remains" : "s remain"} open. ` +
            "See Settlement Summary for the amount each traveler owes or is owed.",
    ),
    noticeLine(
      "Statement Notice:",
      `This snapshot was prepared on ${generatedAt} (${timezone}). Changes posted after that time are not shown.`,
    ),
  );

  const message = (children: (Node | string)[]) =>
    el("div", { marginTop: "7px", fontSize: "10.5px", lineHeight: "1.4" }, children);
  container.append(
    el(
      "div",
      {
        display: "grid",
        gridTemplateColumns: "385px minmax(0, 1fr)",
        columnGap: "34px",
        alignItems: "start",
        margin: "22px 0",
      },
      [
        el("div", { minWidth: "0" }, [
          heading("Account Summary"),
          summaryPanel([
            { label: "Trip Account", value: trip.id },
            { label: "Previous Balance", value: money(0) },
            { label: "Purchases", value: "+" + money(subtotal) },
            { label: "Credits Applied", value: "-" + money(creditTotal) },
            { label: "Fees Charged", value: money(0) },
            { label: "Interest Charged", value: money(0) },
            { label: "New Balance", value: money(grand), strong: true },
            {
              label: "Opening/Closing Date",
              value: `${fmtShortDate(trip.dates.start)} - ${fmtShortDate(trip.dates.end)}`,
            },
            { label: "Travelers", value: String(travelers.length) },
            { label: "Allocated Balance", value: money(grand) },
          ]),
        ]),
        el("div", { minWidth: "0" }, [
          heading("Your Trip Messages"),
          message([
            el("span", { fontWeight: "700" }, ["Access: "]),
            `${meta?.visibility.toUpperCase() ?? "UNAVAILABLE"} trip · ` +
              `${meta?.role?.toUpperCase() ?? "GUEST"} role. ` +
              `Prepared for ${preparedBy ?? "guest session"}.`,
          ]),
          message([
            el("span", { fontWeight: "700" }, ["Ledger snapshot: "]),
            `Revision ${rev ?? "-"}; last trip activity ${stampIn(timezone, new Date(trip.updatedAt))}. ` +
              `Registry created ${meta ? fmtShortDate(meta.createdAt.slice(0, 10)) : "-"}.`,
          ]),
          message([
            el("span", { fontWeight: "700" }, ["Shared trip record: "]),
            "Live ledger data, audit history, and backups are kept per trip. Registry, membership, " +
              "and invitation records are maintained separately for this trip account.",
          ]),
          message([
            el("span", { fontWeight: "700" }, ["Online access: "]),
            `${SITE_HOST}/t/${trip.id}`,
          ]),
        ]),
      ],
    ),
  );

  container.append(
    heading("Settlement Summary"),
    statementTable(
      ["Traveler", "Paid", "Allocated Amount", "Balance", "Status"],
      travelers.map((m) => {
        const b = balanceById[m.id];
        const net = b?.balance ?? 0;
        const settled = Math.abs(net) < 0.005;
        const status = settled ? "SETTLED" : net < 0 ? "OWES" : "IS OWED";
        return [
          el("div", {}, [
            el("div", { fontWeight: "700" }, [m.name]),
            el("div", { fontSize: "9.5px", color: MUTED }, [`@${m.handle}`]),
          ]),
          money(b?.paid ?? 0),
          money(b?.share ?? 0),
          settled ? money(0) : (net < 0 ? "-" : "+") + money(Math.abs(net)),
          status,
        ];
      }),
      ["left", "right", "right", "right", "right"],
      "2fr 1fr 1.35fr 1fr 1fr",
    ),

    heading("Account Activity"),
    activityTable(
      [
        { label: "Payments and Other Credits", rows: creditRows },
        { label: "Purchases", rows: purchaseRows },
      ],
      baseCurrency,
    ),
  );

  const totalsYear = trip.dates.start.slice(0, 4) || today.slice(0, 4);
  const totalsRow = (label: string, value: string) =>
    el(
      "div",
      {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "baseline",
        gap: "24px",
        minHeight: "18px",
        padding: "2px 10px",
        fontSize: "10.5px",
        lineHeight: "1.25",
      },
      [el("span", {}, [label]), el("span", { fontWeight: "600" }, [value])],
    );
  container.append(
    el("div", { display: "flex", justifyContent: "center", marginBottom: "6px" }, [
      el("div", { width: "345px", border: `1px solid ${RULE}` }, [
        el(
          "div",
          {
            textAlign: "center",
            fontSize: "11px",
            background: PANEL,
            padding: "6px 10px 5px",
            lineHeight: "1.2",
          },
          [`${totalsYear} Trip Totals to Date`],
        ),
        el("div", { height: "1px", background: RULE }),
        el("div", { padding: "4px 0" }, [
          totalsRow(`Total charges posted in ${totalsYear}`, money(subtotal)),
          totalsRow(`Total credits applied in ${totalsYear}`, "-" + money(creditTotal)),
        ]),
      ]),
    ]),
    el("div", { textAlign: "center", fontSize: "9px", color: MUTED, marginBottom: "20px" }, [
      "Totals reflect every expense recorded on this trip's shared ledger.",
    ]),
  );

  const accessSentence =
    meta?.visibility === "private"
      ? "This trip is PRIVATE: access is limited to enrolled members."
      : meta?.visibility === "public"
        ? "This trip is PUBLIC: anyone holding the link may view it."
        : "Access is governed by the trip's registry visibility record.";
  container.append(
    heading("Statement Information"),
    el("div", { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }, [
      el("div", {}, [
        el("div", { fontSize: "9.5px", fontWeight: "700" }, ["ABOUT THIS SNAPSHOT"]),
        disclosureParagraph(
          `This statement was produced from the live shared ledger of trip "${trip.title}" ` +
            `(trip ID ${trip.id})${rev != null ? `, document revision ${rev},` : ""} on ` +
            `${generatedAt} (${timezone}). Figures reflect the ledger at the moment of export; ` +
            "subsequent edits are not shown.",
        ),
        el("div", { marginTop: "9px", fontSize: "9.5px", fontWeight: "700" }, [
          "SHARES, CREDITS, AND BALANCES",
        ]),
        disclosureParagraph(
          "Each expense may allocate exact responsibility amounts to individual travelers; " +
            "entries without a custom allocation use an equal split. Applied credits reduce the " +
            `net amount of the expense they are attached to. All amounts are stated in ${baseCurrency}; ` +
            "expenses recorded in another currency are converted at the exchange rate captured " +
            "when the expense was entered (noted on the row).",
        ),
      ]),
      el("div", {}, [
        el("div", { fontSize: "9.5px", fontWeight: "700" }, ["ACCESS AND RECORDS"]),
        disclosureParagraph(
          "Each PaperTrip trip is serviced by a dedicated Durable Object holding its live state, " +
            "audit log, and backups. Trip registration, membership, and invitations are recorded " +
            `in the PaperTrip D1 registry. ${accessSentence}`,
        ),
        el("div", { marginTop: "9px", fontSize: "9.5px", fontWeight: "700" }, [
          "IMPORTANT INFORMATION",
        ]),
        disclosureParagraph(
          "Balances shown under Settlement Summary are informational and do not constitute a " +
            "demand for payment. PaperTrip is not a financial institution; this document is not " +
            "a bank statement, an invoice, or a receipt.",
        ),
      ]),
    ]),
    el(
      "div",
      {
        fontSize: "8.5px",
        color: MUTED,
        marginTop: "10px",
        borderTop: `1px solid ${SOFT_RULE}`,
        paddingTop: "5px",
      },
      [`Statement reference: ${trip.id} / rev ${rev ?? "-"} / ${today} · ${SITE_HOST}`],
    ),
  );

  return container;
}

// The finished statement plus its delivery action. deliver() hands the file
// to the platform (share sheet on touch devices, download elsewhere) and
// should run inside a click handler: the share sheet needs a live user
// gesture.
export type LedgerPdfStatement = {
  filename: string;
  deliver: () => Promise<void>;
};

export async function exportLedgerPdf(
  trip: Trip,
  travelers: AdminMember[],
  context: StatementContext = {},
): Promise<LedgerPdfStatement> {
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

  // Wait for any future body images before taking the statement snapshot.
  await Promise.all(
    Array.from(container.querySelectorAll("img")).map((img) => img.decode().catch(() => {})),
  );

  // Canvas px per CSS px. Used both for the raster render and for converting the
  // measured DOM row positions below into the same coordinate space.
  const SCALE = 2;

  // Safe page-break boundaries (canvas px): table rows plus marked headings and
  // disclosure paragraphs. The paginator favors the lowest one that fits.
  const containerTop = container.getBoundingClientRect().top;
  const breakOffsets = [
    ...new Set(
      Array.from(container.querySelectorAll("[data-statement-break]"))
        .map((node) => Math.round((node.getBoundingClientRect().top - containerTop) * SCALE))
        .filter((y) => y > 0),
    ),
  ].sort((a, b) => a - b);

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

  // The reference statement uses a narrow, long 522 × 1008 pt page. Matching
  // that stock gives the body its characteristic dense vertical rhythm.
  const doc = new jsPDF({ unit: "pt", format: [522, 1008], orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const sideMargin = 24;
  const bodyTop = 60;
  const footerTop = pageHeight - 34;
  const usableWidth = pageWidth - sideMargin * 2;
  const usableHeight = footerTop - bodyTop;

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
    // PNG keeps dense small type and hairline rules crisp, with no JPEG haloing.
    doc.addImage(
      slice.toDataURL("image/png"),
      "PNG",
      sideMargin,
      bodyTop,
      usableWidth,
      sliceHeightPx * ptPerPx,
    );

    renderedPx = end;
    pageIndex++;
  }

  const today = todayIn(trip.base.timezone);
  const compactTripId = trip.id.length > 28 ? trip.id.slice(0, 25) + "..." : trip.id;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Repeated institution masthead, patterned after the compact service strip
    // at the top of the reference statement.
    doc.setTextColor(31, 55, 92);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PAPERTRIP", sideMargin, 22);
    doc.setFontSize(6.5);
    doc.text("TRIP EXPENSE STATEMENT", sideMargin, 32);

    doc.setTextColor(17, 17, 17);
    doc.setFontSize(6.5);
    doc.text("Manage your trip online at:", 190, 19);
    doc.setFont("helvetica", "normal");
    doc.text(`${SITE_HOST}/t/${compactTripId}`, 190, 29);
    doc.setFont("helvetica", "bold");
    doc.text("Statement help:", 372, 19);
    doc.setFont("helvetica", "normal");
    doc.text(`${SITE_HOST}/t/${compactTripId}/admin`, 372, 29);
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.45);
    doc.line(sideMargin, 43, pageWidth - sideMargin, 43);

    // Footer mirrors the account-name / page / statement-date alignment used
    // on bank statements instead of showing a lone page number.
    doc.setDrawColor(205, 205, 205);
    doc.line(sideMargin, footerTop + 5, pageWidth - sideMargin, footerTop + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(compactTripId, sideMargin, pageHeight - 18);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 18, { align: "center" });
    doc.text(`Statement Date:  ${fmtShortDate(today)}`, pageWidth - sideMargin, pageHeight - 18, {
      align: "right",
    });
    doc.setFontSize(5.5);
    doc.setTextColor(105, 105, 105);
    doc.text(
      `PAPERTRIP  ·  REV ${context.rev ?? "-"}  ·  ${trip.base.timezone}`,
      sideMargin,
      pageHeight - 8,
    );
  }

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

  // Never navigate a window to a blob: URL of the PDF. Rendering a blob PDF
  // in the main frame crashes WKWebView-based in-app browsers, and the crash
  // can leave the origin's HTTP cache corrupted on the device (the 2026-07
  // Telegram white-screen incident).
  const file = new File([doc.output("blob")], filename, { type: "application/pdf" });
  return {
    filename,
    deliver: async () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      if (coarsePointer && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          return;
        } catch (err) {
          // Dismissing the share sheet is a completed delivery; anything
          // else (stale gesture, broken share target) falls back to the
          // plain download below.
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }
      doc.save(filename);
    },
  };
}
