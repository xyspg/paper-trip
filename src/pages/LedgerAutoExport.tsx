import { useRef, useState } from "react";
import type { StatementContext } from "../trip/exportLedgerPdf";
import { tripTravelers } from "../trip/roster";
import type { Trip } from "../trip/types";
import { useMountEffect } from "../useMountEffect";

// Share-link mode (/t/:tripId/ledger?export=pdf): renders the statement as
// soon as the parent mounts us (PaperLedger gates on the live snapshot and
// settled registry/session queries) and navigates THIS tab to the finished
// PDF. The ref keeps StrictMode's double-invoked dev effects from rasterizing
// the statement twice.
export function LedgerAutoExport({ trip, context }: { trip: Trip; context: StatementContext }) {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useMountEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        // Strip ?export=pdf from the history entry first, so Back from the
        // PDF (or a reload after a failure) lands on the plain ledger instead
        // of re-triggering the export.
        window.history.replaceState(null, "", window.location.pathname);
        const { exportLedgerPdf } = await import("../trip/exportLedgerPdf");
        await exportLedgerPdf(trip, tripTravelers(trip), context, window);
      } catch (err) {
        console.error("导出 PDF 失败", err);
        setFailed(true);
      }
    })();
  });

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-[#1c1b19] px-5 py-2.5 font-cjk text-[13px] text-[#fafaf8] shadow-lg">
      {failed ? (
        "PDF 生成失败，请点击「导出 PDF」重试"
      ) : (
        <>
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#fafaf8]/30 border-t-[#fafaf8] animate-[spin_0.7s_linear_infinite]" />
          正在生成 PDF 账单…
        </>
      )}
    </div>
  );
}
