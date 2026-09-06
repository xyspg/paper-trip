import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { AdminModal } from "./AdminModal";
import { fmtMoney, round2, uid } from "./adminData";
import { useAdmin } from "./AdminContext";
import { Avatar } from "./Avatar";
import { Icons } from "./AdminIcons";
import {
  BTN,
  BTN_GHOST,
  BTN_INK,
  BTN_SM,
  CHIP_OFF,
  CHIP_ON,
  FIELD_INPUT,
  FIELD_LABEL,
  ModalFooter,
  ModalHeader,
} from "./adminUi";
import { PaymentSplit, defaultSplit, splitToExpense } from "./PaymentSplit";
import type { SplitValue } from "./PaymentSplit";
import type { NewExpenseInput } from "./AddExpenseModal";
import { CurrencySelect, FxRateRow, useEntryFxRate } from "./CurrencyFields";
import { deriveShares, parseReceipt } from "./receipt";
import {
  currencyDecimals,
  currencySymbol,
  normalizeCurrency,
  roundAmount,
  roundFxRate,
} from "../trip/currency";
import type { ExpenseItem } from "../trip/types";
import { isEnterKey } from "../ime";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewExpenseInput) => void;
};

// One editable line in the review list. `who` is the set of travelers sharing
// this dish (empty/all = AA). The stable `id` keys the row so editing a name or
// adding/removing rows never remounts the inputs mid-keystroke. Assignment lives
// on the row itself (no parallel array), so add/delete stay trivially in sync.
type Row = { id: string; name: string; quantity: number; price: number; who: string[] };

const sumPrices = (rows: { price: number }[]) => rows.reduce((s, r) => s + r.price, 0);

// Everyone selected (or nobody, which falls back to everyone) means an even AA
// split, stored as `who: undefined` so the renderers skip redundant chips.
const isAA = (who: string[], travelerIds: string[]) =>
  who.length === 0 || who.length === travelerIds.length;

// "pick" waits for a photo, "loading" is the OCR round-trip, "review" is the
// editable split, "error" shows a retry. One inner component per open keeps the
// state fresh without effects (the parent remounts it via a key).
type Phase = "pick" | "loading" | "review" | "error";

function Scanner({ onClose, onSubmit }: Omit<Props, "isOpen">) {
  const { tripId, travelers, currency: baseCurrency } = useAdmin();
  const travelerIds = travelers.map((m) => m.id);
  // Two inputs so the user picks the source instead of iOS forcing the camera:
  // the album input omits `capture` (opens the photo library / file picker),
  // the camera input sets `capture="environment"` to jump straight to the rear
  // camera. Same onChange handler for both.
  const albumRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState("");

  const [merchant, setMerchant] = useState("");
  // The receipt's own currency (every number on this modal is in it), seeded
  // from the OCR result and correctable by hand. fxOverride pins a manual
  // rate; null falls back to the live quote.
  const [currency, setCurrency] = useState(baseCurrency);
  const [fxOverride, setFxOverride] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  // Tax (+ service fees) and tip are tracked separately — tipping is a choice
  // you make at the table, tax isn't. Both are spread proportionally on top of
  // the per-dish split. Tip is entered one of three ways: a percentage of the
  // dish subtotal (chips come from the receipt's printed suggestions when the
  // OCR finds them), a flat amount, or "round the final total up to X" — the
  // cash case, where the tip is whatever the round number absorbs.
  const [tax, setTax] = useState(0);
  const [tipMode, setTipMode] = useState<"percent" | "amount" | "total">("percent");
  const [tipPct, setTipPct] = useState<number | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [totalTarget, setTotalTarget] = useState<number | null>(null);
  const [suggestedPcts, setSuggestedPcts] = useState<number[]>([15, 18, 20]);
  // Manual per-traveler overrides; absent id = use the computed amount.
  const [manual, setManual] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<SplitValue>(() => defaultSplit(travelers));
  // Bumped on "recompute" so the uncontrolled amount inputs remount fresh.
  const [recalc, setRecalc] = useState(0);

  const pickAlbum = () => albumRef.current?.click();
  const pickCamera = () => cameraRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setPhase("loading");
    setError("");
    try {
      const r = await parseReceipt(tripId, file);
      // Tax defaults to the printed line; when the OCR missed it, fall back to
      // the gap between the printed total and the dishes (minus any printed
      // tip). Clamped to >= 0: a misread total below the line-item sum would
      // otherwise yield a negative tax.
      const printedTip = r.tip ?? 0;
      const taxGuess =
        r.tax ??
        (typeof r.total === "number" ? Math.max(0, r.total - sumPrices(r.items) - printedTip) : 0);
      setMerchant(r.merchant || "餐厅收据");
      // Adopt the OCR currency up front so the tax/tip seeds below round at
      // that currency's own precision (whole yen, not hundredths).
      const cur = normalizeCurrency(r.currency) ?? baseCurrency;
      setCurrency(cur);
      setFxOverride(null);
      setRows(
        r.items.map((it) => ({
          id: uid("ri"),
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          who: [...travelerIds], // default AA
        })),
      );
      setTax(roundAmount(Math.max(0, taxGuess), cur));
      if (r.suggestedTips?.length) setSuggestedPcts(r.suggestedTips);
      // A tip already printed on the receipt (service charge, pre-added
      // gratuity) starts in amount mode; otherwise wait for a percent pick.
      setTipMode(printedTip > 0 ? "amount" : "percent");
      setTipAmount(printedTip > 0 ? roundAmount(printedTip, cur) : 0);
      setTipPct(null);
      setTotalTarget(null);
      setManual({});
      setPayment(defaultSplit(travelers));
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别失败，请重试");
      setPhase("error");
    }
  };

  const toggle = (id: string, who: string) =>
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = row.who.includes(who) ? row.who.filter((x) => x !== who) : [...row.who, who];
        return { ...row, who: next };
      }),
    );

  const patchRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const removeRow = (id: string) => setRows((prev) => prev.filter((row) => row.id !== id));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: uid("ri"), name: "", quantity: 1, price: 0, who: [...travelerIds] },
    ]);

  // Every figure on this modal rounds at the receipt currency's own precision:
  // whole units for JPY/KRW, cents otherwise.
  const decimals = currencyDecimals(currency);
  const rDec = (n: number) => roundAmount(n, currency);
  // Money input affordances matched to that precision.
  const moneyStep = decimals ? "0.01" : "1";
  const moneyZero = decimals ? "0.00" : "0";

  const lineSubtotal = rDec(sumPrices(rows));
  // Pre-tip bill: what the round-up targets are measured against.
  const preTip = rDec(lineSubtotal + tax);
  const tip =
    tipMode === "percent"
      ? tipPct
        ? rDec((lineSubtotal * tipPct) / 100)
        : 0
      : tipMode === "amount"
        ? tipAmount
        : Math.max(0, rDec((totalTarget ?? preTip) - preTip));
  const extra = rDec(tax + tip);
  // Round-number cash targets above the pre-tip bill, stepped at 1/5/10 units
  // scaled to the bill's magnitude so they stay "round" in any currency
  // (deduped — $106.22 → 107 / 110 / 120, ¥10,820 → 10,900 / 11,000 / 12,000).
  const unit = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, preTip))) - 2);
  const roundTargets = [
    ...new Set([
      Math.ceil(preTip / unit) * unit,
      Math.ceil(preTip / (5 * unit)) * 5 * unit,
      Math.ceil(preTip / (10 * unit)) * 10 * unit,
      Math.ceil(preTip / (10 * unit)) * 10 * unit + 10 * unit,
    ]),
  ]
    .filter((n) => n > 0)
    .slice(0, 3);

  const auto = deriveShares(rows, travelerIds, extra, decimals);
  const finalOf = (id: string) => manual[id] ?? auto[id] ?? 0;
  const grandTotal = rDec(travelerIds.reduce((s, id) => s + finalOf(id), 0));
  const hasOverride = Object.keys(manual).length > 0;

  const setManualAmount = (id: string, raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) {
      // Blank/invalid/negative: drop any override and bump `recalc` so the
      // uncontrolled input remounts showing the auto amount. Without the remount
      // the box stays visually blank while grandTotal and submit still count and
      // charge the auto value, so the displayed number diverges from the saved one.
      setManual((prev) => {
        if (prev[id] == null) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setRecalc((k) => k + 1);
      return;
    }
    setManual((prev) => ({ ...prev, [id]: roundAmount(n, currency) }));
  };

  const clearOverrides = () => {
    setManual({});
    setRecalc((n) => n + 1);
  };

  const foreign = currency !== baseCurrency;
  const fxRate = useEntryFxRate(baseCurrency, currency, fxOverride);
  const symbol = currencySymbol(currency);

  // Drop blank scratch rows (no name, no price) before persisting / counting.
  const cleanRows = rows.filter((r) => r.name.trim() !== "" || r.price > 0);
  const canSubmit = cleanRows.length > 0 && grandTotal > 0 && (!foreign || fxRate != null);

  const submit = () => {
    if (!canSubmit) return;
    const shares = Object.fromEntries(travelerIds.map((id) => [id, finalOf(id)]));
    const { payer, split } = splitToExpense(payment, travelerIds);
    const items: ExpenseItem[] = cleanRows.map((r) => {
      const who = r.who.filter((id) => travelerIds.includes(id));
      return {
        name: r.name.trim() || "未命名",
        quantity: r.quantity,
        price: rDec(r.price),
        who: isAA(who, travelerIds) ? undefined : who,
      };
    });
    onSubmit({
      name: merchant.trim() || "餐厅收据",
      sub: `${items.length} 项 · 扫描收据`,
      amount: grandTotal,
      cat: "food",
      payer,
      currency: foreign ? currency : undefined,
      fxRate: foreign && fxRate != null ? roundFxRate(fxRate) : undefined,
      split,
      owedBy: shares,
      items,
    });
  };

  return (
    <div className="flex flex-col max-h-[88vh]">
      <input ref={albumRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
      />

      <ModalHeader icon={<Icons.camera sw={2.4} />} title="扫描收据分账" onClose={onClose} />

      {phase === "pick" && (
        <ScanState
          icon={<Icons.camera sw={1.8} />}
          title="拍下餐厅小票"
          body="iOS 27 同款 AI 识别"
          actions={[
            {
              label: "从相册选择",
              icon: <Icons.image sw={2.4} />,
              onAction: pickAlbum,
              primary: true,
            },
            { label: "拍照", icon: <Icons.camera sw={2.4} />, onAction: pickCamera },
          ]}
        />
      )}

      {phase === "loading" && (
        <div className="flex flex-col items-center text-center gap-3 px-7 py-10">
          <div className="w-[38px] h-[38px] border-[3px] border-[#ebe9e3] border-t-[#1c1b19] rounded-full animate-[spin_0.8s_linear_infinite]" />
          <div className="font-sans font-bold text-[19px]">正在识别收据…</div>
          <div className="font-cjk text-[13px] leading-[1.6] text-[#76726a] max-w-[320px]">
            Claude Fable 5 is currently unavailable.
          </div>
        </div>
      )}

      {phase === "error" && (
        <ScanState
          tone="alert"
          icon={<Icons.x sw={2.2} />}
          title="识别失败"
          body={error}
          actions={[
            {
              label: "从相册选择",
              icon: <Icons.image sw={2.4} />,
              onAction: pickAlbum,
              primary: true,
            },
            { label: "重新拍照", icon: <Icons.camera sw={2.4} />, onAction: pickCamera },
          ]}
        />
      )}

      {phase === "review" && (
        <>
          <div className="flex flex-col gap-4 p-[18px] overflow-y-auto">
            <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className={FIELD_LABEL}>商家名称</span>
              <input
                className={FIELD_INPUT}
                value={merchant}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                placeholder="餐厅名"
                onChange={(e) => setMerchant(e.target.value)}
              />
            </label>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className={FIELD_LABEL}>收据币种（识别自小票，可修改）</span>
              <CurrencySelect
                value={currency}
                onChange={(next) => {
                  setCurrency(next);
                  setFxOverride(null);
                }}
              />
              <FxRateRow
                base={baseCurrency}
                currency={currency}
                rate={foreign ? fxRate : null}
                onRate={setFxOverride}
                amount={grandTotal}
              />
            </div>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className={FIELD_LABEL}>
                菜品 · 可改名/改价/增删 · 选择谁分摊（默认 AA 均摊）
              </span>
              <div className="flex flex-col gap-[9px]">
                {rows.map((row) => {
                  const rowIsAA = isAA(row.who, travelerIds);
                  return (
                    <div
                      className="border border-[#ebe9e3] rounded-xl bg-white px-3 py-2.5"
                      key={row.id}
                    >
                      <div className="flex items-center gap-[7px]">
                        <input
                          className="w-[38px] shrink-0 px-[3px] py-[5px] border border-[#ebe9e3] rounded-lg bg-white font-grotesk font-semibold text-[13px] text-center text-[#1c1b19] outline-none transition-colors focus:border-[#1c1b19] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          defaultValue={row.quantity}
                          aria-label="数量"
                          onBlur={(e) => {
                            const n = parseInt(e.target.value, 10);
                            patchRow(row.id, { quantity: Number.isFinite(n) && n > 0 ? n : 1 });
                          }}
                          onKeyDown={(e) => {
                            if (isEnterKey(e)) e.currentTarget.blur();
                          }}
                        />
                        <span className="shrink-0 -ml-[3px] font-bold text-[#9b988f]">×</span>
                        <input
                          className="flex-1 min-w-0 px-[9px] py-1.5 border border-[#ebe9e3] rounded-lg bg-white font-cjk font-medium text-sm text-[#1c1b19] outline-none transition-colors focus:border-[#1c1b19]"
                          value={row.name}
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          placeholder="菜名"
                          aria-label="菜名"
                          onChange={(e) => patchRow(row.id, { name: e.target.value })}
                        />
                        <span className="inline-flex items-center gap-[2px] shrink-0 w-[92px] px-2 py-[5px] border border-[#ebe9e3] rounded-lg bg-white transition-colors focus-within:border-[#1c1b19]">
                          <span className="font-grotesk font-semibold text-[#9b988f]">
                            {symbol}
                          </span>
                          <input
                            className="w-full border-none bg-transparent outline-none font-grotesk font-semibold text-sm text-[#1c1b19] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
                            type="number"
                            inputMode="decimal"
                            step={moneyStep}
                            min="0"
                            defaultValue={row.price || ""}
                            aria-label="价格"
                            placeholder={moneyZero}
                            onBlur={(e) => {
                              const n = parseFloat(e.target.value);
                              patchRow(row.id, {
                                price: Number.isFinite(n) && n >= 0 ? rDec(n) : 0,
                              });
                            }}
                            onKeyDown={(e) => {
                              if (isEnterKey(e)) e.currentTarget.blur();
                            }}
                          />
                        </span>
                        <button
                          type="button"
                          className="grid place-items-center shrink-0 w-[30px] h-[30px] border border-[#ecccc2] rounded-lg bg-white text-[#c2553f] cursor-pointer transition-colors hover:bg-[#c2553f] hover:text-white [&_svg]:size-[15px]"
                          title="删除这一项"
                          aria-label="删除这一项"
                          onClick={() => removeRow(row.id)}
                        >
                          <Icons.trash sw={2.2} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-[9px]">
                        {travelers.map((m) => (
                          <button
                            type="button"
                            key={m.id}
                            className={`inline-flex items-center gap-1.5 cursor-pointer border rounded-full py-[3px] pr-2.5 pl-1 font-cjk font-semibold text-xs transition-colors ${row.who.includes(m.id) ? CHIP_ON : CHIP_OFF}`}
                            onClick={() => toggle(row.id, m.id)}
                          >
                            <Avatar m={m} size="xs" />
                            {m.name}
                          </button>
                        ))}
                        <span className="ml-auto font-grotesk font-semibold text-[10px] tracking-[0.06em] uppercase text-[#9b988f]">
                          {row.who.length === 0
                            ? "未选 → 全员"
                            : rowIsAA
                              ? "AA 均摊"
                              : `${row.who.length} 人分`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 mt-[9px] px-3 py-[7px] border border-dashed border-[#ebe9e3] rounded-[10px] bg-white font-grotesk font-semibold text-xs text-[#3b3833] cursor-pointer transition-colors hover:border-[#1c1b19] [&_svg]:size-[15px]"
                onClick={addRow}
              >
                <Icons.plus sw={2.4} />
                添加一项
              </button>
            </div>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className={FIELD_LABEL}>税费 / 服务费（按比例分摊）</span>
              <div className="inline-flex items-center gap-1 max-w-[180px]">
                <span className="font-grotesk font-semibold text-[#9b988f]">{symbol}</span>
                <input
                  key={`tax-${recalc}-${tax}`}
                  className={FIELD_INPUT}
                  type="number"
                  inputMode="decimal"
                  step={moneyStep}
                  defaultValue={tax || ""}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  placeholder={moneyZero}
                  onBlur={(e) => {
                    const n = parseFloat(e.target.value);
                    setTax(Number.isFinite(n) ? Math.max(0, rDec(n)) : 0);
                  }}
                  onKeyDown={(e) => {
                    if (isEnterKey(e)) e.currentTarget.blur();
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className={FIELD_LABEL}>小费（按比例分摊）</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {suggestedPcts.map((p) => {
                  const on = tipMode === "percent" && tipPct === p;
                  return (
                    <button
                      type="button"
                      key={p}
                      className={`font-grotesk font-semibold text-[12px] cursor-pointer border rounded-full py-1.5 px-3 transition-colors ${on ? CHIP_ON : CHIP_OFF}`}
                      onClick={() => {
                        // Re-tapping the active percent turns the tip off.
                        setTipMode("percent");
                        setTipPct(on ? null : p);
                      }}
                    >
                      {p}%
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`font-cjk font-semibold text-[12px] cursor-pointer border rounded-full py-1.5 px-3 transition-colors ${tipMode === "amount" ? CHIP_ON : CHIP_OFF}`}
                  onClick={() => setTipMode("amount")}
                >
                  金额
                </button>
                <button
                  type="button"
                  className={`font-cjk font-semibold text-[12px] cursor-pointer border rounded-full py-1.5 px-3 transition-colors ${tipMode === "total" ? CHIP_ON : CHIP_OFF}`}
                  onClick={() => setTipMode("total")}
                >
                  凑整
                </button>
              </div>

              {tipMode === "percent" && tipPct != null && (
                <span className="font-cjk text-[12px] text-[#76726a]">
                  按菜品小计 {tipPct}% = {fmtMoney(tip, currency)}
                </span>
              )}

              {tipMode === "amount" && (
                <div className="inline-flex items-center gap-1 max-w-[180px]">
                  <span className="font-grotesk font-semibold text-[#9b988f]">{symbol}</span>
                  <input
                    key={`tip-${recalc}-${tipAmount}`}
                    className={FIELD_INPUT}
                    type="number"
                    inputMode="decimal"
                    step={moneyStep}
                    defaultValue={tipAmount || ""}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder={moneyZero}
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      setTipAmount(Number.isFinite(n) ? Math.max(0, rDec(n)) : 0);
                    }}
                    onKeyDown={(e) => {
                      if (isEnterKey(e)) e.currentTarget.blur();
                    }}
                  />
                </div>
              )}

              {tipMode === "total" && (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {roundTargets.map((n) => {
                      const on = totalTarget === n;
                      return (
                        <button
                          type="button"
                          key={n}
                          className={`font-grotesk font-semibold text-[12px] cursor-pointer border rounded-full py-1.5 px-3 transition-colors ${on ? CHIP_ON : CHIP_OFF}`}
                          onClick={() => setTotalTarget(n)}
                        >
                          付 {symbol}
                          {n}
                        </button>
                      );
                    })}
                    <span className="inline-flex items-center gap-1 max-w-[140px]">
                      <span className="font-grotesk font-semibold text-[#9b988f]">{symbol}</span>
                      <input
                        key={`target-${recalc}-${totalTarget}`}
                        className={FIELD_INPUT}
                        type="number"
                        inputMode="decimal"
                        step="1"
                        defaultValue={totalTarget ?? ""}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        placeholder="最终付了多少"
                        onBlur={(e) => {
                          const n = parseFloat(e.target.value);
                          setTotalTarget(Number.isFinite(n) && n > 0 ? rDec(n) : null);
                        }}
                        onKeyDown={(e) => {
                          if (isEnterKey(e)) e.currentTarget.blur();
                        }}
                      />
                    </span>
                  </div>
                  <span className="font-cjk text-[12px] text-[#76726a]">
                    {totalTarget == null
                      ? `税后合计 ${fmtMoney(preTip, currency)}，选一个凑整数或直接填实付金额`
                      : totalTarget < preTip
                        ? `低于税后合计 ${fmtMoney(preTip, currency)}，小费按 ${fmtMoney(0, currency)} 计`
                        : `付 ${fmtMoney(totalTarget, currency)} → 小费 ${fmtMoney(tip, currency)}`}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className={FIELD_LABEL}>谁付的（垫付）</span>
              <PaymentSplit
                value={payment}
                onChange={setPayment}
                amount={grandTotal}
                travelers={travelers}
                currency={currency}
              />
            </div>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <div className="flex items-center justify-between gap-2.5 mb-2">
                <span className={FIELD_LABEL}>每人承担金额（可手动修改）</span>
                {hasOverride && (
                  <button
                    type="button"
                    className={`${BTN_SM} ${BTN_GHOST} [&_svg]:size-[13px]`}
                    onClick={clearOverrides}
                  >
                    <Icons.swap sw={2.2} />
                    恢复自动
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {travelers.map((m) => (
                  <div
                    className="flex items-center justify-between gap-2.5 px-3 py-2 border border-[#ebe9e3] rounded-xl bg-white"
                    key={m.id}
                  >
                    <span className="inline-flex items-center gap-2 font-cjk font-semibold text-sm text-[#1c1b19]">
                      <Avatar m={m} size="xs" />
                      {m.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-[3px] border rounded-[10px] px-2.5 py-[5px] transition-colors ${manual[m.id] != null ? "border-[#5b7a99] bg-[#eef2f6]" : "border-[#ebe9e3] bg-white"}`}
                    >
                      <span className="font-grotesk font-semibold text-[13px] text-[#9b988f]">
                        {symbol}
                      </span>
                      <input
                        key={`${m.id}-${recalc}-${round2(auto[m.id] ?? 0)}`}
                        className="w-[74px] border-none bg-transparent outline-none font-grotesk font-semibold text-[15px] text-[#1c1b19] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
                        type="number"
                        inputMode="decimal"
                        step={moneyStep}
                        min="0"
                        defaultValue={rDec(finalOf(m.id))}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        aria-label={`${m.name} 承担金额`}
                        onBlur={(e) => setManualAmount(m.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (isEnterKey(e)) e.currentTarget.blur();
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[5px] px-3.5 py-3 border border-[#ebe9e3] rounded-xl bg-[#fdfdfb] col-span-full">
              <div className="flex items-center justify-between font-cjk font-medium text-[13px] text-[#76726a]">
                <span>菜品小计</span>
                <span className="font-sans font-semibold">{fmtMoney(lineSubtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between font-cjk font-medium text-[13px] text-[#76726a]">
                <span>税费 / 服务费</span>
                <span className="font-sans font-semibold">{fmtMoney(tax, currency)}</span>
              </div>
              <div className="flex items-center justify-between font-cjk font-medium text-[13px] text-[#76726a]">
                <span>
                  小费
                  {tipMode === "percent" && tipPct != null && ` · ${tipPct}%`}
                  {tipMode === "total" &&
                    totalTarget != null &&
                    ` · 凑整到 ${fmtMoney(totalTarget, currency)}`}
                </span>
                <span className="font-sans font-semibold">{fmtMoney(tip, currency)}</span>
              </div>
              <div className="flex items-center justify-between font-cjk font-bold text-base text-[#1c1b19] mt-1 pt-2 border-t border-dashed border-[#ebe9e3]">
                <span>合计</span>
                <span className="font-sans font-bold">{fmtMoney(grandTotal, currency)}</span>
              </div>
              {foreign && fxRate != null && (
                <div className="flex items-center justify-between font-cjk font-medium text-[12px] text-[#9b988f]">
                  <span>折合本位币</span>
                  <span className="font-sans font-semibold">
                    {fmtMoney(grandTotal * fxRate, baseCurrency)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              className={`${BTN} ${BTN_GHOST} [&_svg]:size-3.5`}
              onClick={pickAlbum}
            >
              <Icons.image sw={2.4} />
              相册
            </button>
            <button
              type="button"
              className={`${BTN} ${BTN_GHOST} [&_svg]:size-3.5`}
              onClick={pickCamera}
            >
              <Icons.camera sw={2.4} />
              拍照
            </button>
            <span className="ml-auto" />
            <button
              type="button"
              className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}
              disabled={!canSubmit}
              onClick={submit}
            >
              <Icons.plus sw={2.6} />
              添加为花销
            </button>
          </ModalFooter>
        </>
      )}
    </div>
  );
}

// Full-panel pick / error state for the scanner (the loading spinner phase is
// distinct enough to stay inline). tone="alert" tints the icon for the error case.
function ScanState({
  tone,
  icon,
  title,
  body,
  actions,
}: {
  tone?: "accent" | "alert";
  icon: ReactNode;
  title: string;
  body: string;
  actions: { label: string; icon: ReactNode; onAction: () => void; primary?: boolean }[];
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 px-7 py-10">
      <div
        className={`w-16 h-16 grid place-items-center rounded-[14px] [&_svg]:size-[30px] ${tone === "alert" ? "bg-[#f7e9e4] text-[#c2553f]" : "bg-[#eef4f0] text-[#3f6f5b]"}`}
      >
        {icon}
      </div>
      <div className="font-sans font-bold text-[19px]">{title}</div>
      <div className="font-cjk text-[13px] leading-[1.6] text-[#76726a] max-w-[320px]">{body}</div>
      <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`${BTN} ${a.primary ? BTN_INK : BTN_GHOST} [&_svg]:size-3.5`}
            onClick={a.onAction}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReceiptScanModal({ isOpen, onClose, onSubmit }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose} width="min(520px, 94vw)" autoFocus={false}>
      <Scanner key={String(isOpen)} onClose={onClose} onSubmit={onSubmit} />
    </AdminModal>
  );
}
