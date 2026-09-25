import { Trans } from "@lingui/react/macro";
import { useRef, useState } from "react";
import type { LedgerPdfStatement, StatementContext } from "../trip/exportLedgerPdf";
import { tripTravelers } from "../trip/roster";
import type { Trip } from "../trip/types";
import { useMountEffect } from "../useMountEffect";

type ExportState =
  | { phase: "rendering" }
  | { phase: "failed" }
  | { phase: "ready"; statement: LedgerPdfStatement };

// Share-link mode (/t/:tripId/ledger?export=pdf): renders the statement as
// soon as the parent mounts us (PaperLedger gates on the live snapshot and
// settled registry/session queries), then offers a save button. Delivery has
// to wait for a tap: the share sheet needs a live user gesture, and this tab
// must never navigate itself to a blob: PDF — that crashes WKWebView in-app
// browsers (the 2026-07 Telegram white-screen incident). The ref keeps
// StrictMode's double-invoked dev effects from rasterizing the statement
// twice.
export function LedgerAutoExport({ trip, context }: { trip: Trip; context: StatementContext }) {
  const started = useRef(false);
  const [state, setState] = useState<ExportState>({ phase: "rendering" });

  useMountEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        // Strip ?export=pdf from the history entry first, so Back or a
        // reload lands on the plain ledger instead of re-triggering the
        // export.
        window.history.replaceState(null, "", window.location.pathname);
        const { exportLedgerPdf } = await import("../trip/exportLedgerPdf");
        const statement = await exportLedgerPdf(trip, tripTravelers(trip), context);
        setState({ phase: "ready", statement });
      } catch (err) {
        console.error("导出 PDF 失败", err);
        setState({ phase: "failed" });
      }
    })();
  });

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-[#1c1b19] px-5 py-2.5 font-cjk text-[13px] text-[#fafaf8] shadow-lg">
      {state.phase === "failed" ? (
        <Trans>PDF 生成失败，请点击「导出 PDF」重试</Trans>
      ) : state.phase === "ready" ? (
        <button
          type="button"
          className="cursor-pointer font-cjk text-[13px] font-semibold text-[#fafaf8]"
          onClick={() => void state.statement.deliver()}
        >
          <Trans>PDF 账单已生成 · 点击保存</Trans>
        </button>
      ) : (
        <>
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#fafaf8]/30 border-t-[#fafaf8] animate-[spin_0.7s_linear_infinite]" />
          <Trans>正在生成 PDF 账单…</Trans>
        </>
      )}
    </div>
  );
}
