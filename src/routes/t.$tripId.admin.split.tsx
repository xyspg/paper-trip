import { createFileRoute } from "@tanstack/react-router";
import { useLingui } from "@lingui/react/macro";
import { SplitSection } from "../admin/SplitSection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/t/$tripId/admin/split")({
  component: SplitRoute,
});

function SplitRoute() {
  const { expenses, payments, tripOp, toast } = useAdmin();
  const { t } = useLingui();
  return (
    <SplitSection
      expenses={expenses}
      payments={payments}
      onSetAmount={(id, amount) =>
        tripOp.mutate({ type: "setExpenseAmount", expenseId: id, amount })
      }
      onSetSplit={(id, payer, split) =>
        tripOp.mutate({ type: "setExpenseSplit", expenseId: id, payer, split })
      }
      onUpdate={(expense) =>
        tripOp.mutate(
          { type: "updateExpense", expense },
          {
            onSuccess: () => toast(t`已更新条目`),
            onError: () => toast(t`更新失败，请重试`, "warn"),
          },
        )
      }
      onAdd={(expense) =>
        tripOp.mutate(
          { type: "addExpense", expense },
          {
            onSuccess: () => toast(t`已添加花销条目`),
            onError: () => toast(t`添加失败，请重试`, "warn"),
          },
        )
      }
      onDelete={(id) =>
        tripOp.mutate(
          { type: "deleteExpense", expenseId: id },
          {
            onSuccess: () => toast(t`已删除条目`),
            onError: () => toast(t`删除失败，请重试`, "warn"),
          },
        )
      }
      onAddPayment={(payment) =>
        tripOp.mutate(
          { type: "addPayment", payment },
          {
            onSuccess: () => toast(t`已记录还款`),
            onError: () => toast(t`记录失败，请重试`, "warn"),
          },
        )
      }
      onDeletePayment={(id) =>
        tripOp.mutate(
          { type: "deletePayment", paymentId: id },
          {
            onSuccess: () => toast(t`已删除还款记录`),
            onError: () => toast(t`删除失败，请重试`, "warn"),
          },
        )
      }
      onReset={() =>
        tripOp.mutate(
          { type: "resetExpenses" },
          {
            onSuccess: () => toast(t`已恢复原始账目`),
            onError: () => toast(t`恢复失败，请重试`, "warn"),
          },
        )
      }
    />
  );
}
