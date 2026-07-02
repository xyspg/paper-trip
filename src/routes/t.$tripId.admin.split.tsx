import { createFileRoute } from "@tanstack/react-router";
import { SplitSection } from "../admin/SplitSection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/t/$tripId/admin/split")({
  component: SplitRoute,
});

function SplitRoute() {
  const { expenses, tripOp, toast } = useAdmin();
  return (
    <SplitSection
      expenses={expenses}
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
            onSuccess: () => toast("已更新条目"),
            onError: () => toast("更新失败，请重试", "warn"),
          },
        )
      }
      onAdd={(expense) =>
        tripOp.mutate(
          { type: "addExpense", expense },
          {
            onSuccess: () => toast("已添加花销条目"),
            onError: () => toast("添加失败，请重试", "warn"),
          },
        )
      }
      onDelete={(id) =>
        tripOp.mutate(
          { type: "deleteExpense", expenseId: id },
          {
            onSuccess: () => toast("已删除条目"),
            onError: () => toast("删除失败，请重试", "warn"),
          },
        )
      }
      onReset={() =>
        tripOp.mutate(
          { type: "resetExpenses" },
          {
            onSuccess: () => toast("已恢复原始账目"),
            onError: () => toast("恢复失败，请重试", "warn"),
          },
        )
      }
    />
  );
}
