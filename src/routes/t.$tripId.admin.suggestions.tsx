import { createFileRoute } from "@tanstack/react-router";
import { SuggestionsSection } from "../admin/SuggestionsSection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/t/$tripId/admin/suggestions")({
  component: SuggestionsRoute,
});

function SuggestionsRoute() {
  const { suggestions, items, tripOp, toast } = useAdmin();
  return (
    <SuggestionsSection
      suggestions={suggestions}
      items={items}
      onSetStatus={(id, status) =>
        tripOp.mutate({ type: "setSuggestionStatus", suggestionId: id, status })
      }
      onDelete={(id) => tripOp.mutate({ type: "deleteSuggestion", suggestionId: id })}
      toast={toast}
    />
  );
}
