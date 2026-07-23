import { useState } from "react";
import type { Flight } from "../trip/types";
import { sortFlights } from "../trip/flights";
import { FlightCard } from "../components/FlightCard";
import { useTripAccess } from "../components/TripLayout";
import { useAdmin } from "./AdminContext";
import { FlightEditorModal } from "./FlightEditorModal";
import { Icons } from "./AdminIcons";
import {
  AdminEmptyState,
  BTN,
  BTN_DANGER,
  BTN_GHOST,
  BTN_INK,
  BTN_SM,
  Metrics,
  SectionHead,
} from "./adminUi";
import { useConfirm } from "./useConfirm";

export function FlightsSection() {
  const { flights, travelers, tripOp, toast } = useAdmin();
  const { meta } = useTripAccess();
  const { confirm, confirmModal } = useConfirm();
  const [editing, setEditing] = useState<Flight | "new" | null>(null);
  const sorted = sortFlights(flights);
  const travelersWithFlights = new Set(flights.map((flight) => flight.travelerId)).size;

  const save = (flight: Flight) => {
    const type = editing === "new" ? "addFlight" : "updateFlight";
    tripOp.mutate(
      { type, flight },
      {
        onSuccess: () => {
          setEditing(null);
          toast(type === "addFlight" ? "已添加航班" : "已更新航班");
        },
        onError: () => toast("保存失败，请重试", "warn"),
      },
    );
  };

  const remove = async (flight: Flight) => {
    const traveler = travelers.find((candidate) => candidate.id === flight.travelerId);
    const ok = await confirm({
      title: "删除航班",
      message: `确定删除 ${traveler?.name ?? "该成员"} 的 ${flight.flightNumber || "这趟航班"} 吗？`,
      confirmLabel: "删除航班",
    });
    if (!ok) return;
    tripOp.mutate(
      { type: "deleteFlight", flightId: flight.id, travelerId: flight.travelerId },
      {
        onSuccess: () => toast("已删除航班"),
        onError: () => toast("删除失败，请重试", "warn"),
      },
    );
  };

  return (
    <div>
      <SectionHead
        kicker="Flights · Bookings"
        title="航班信息"
        desc="按同行人记录多段航班 · 管理员可代为添加、修改或删除"
        actions={
          <button
            className={`${BTN} ${BTN_INK} [&_svg]:size-[15px]`}
            disabled={travelers.length === 0}
            onClick={() => setEditing("new")}
          >
            <Icons.plus sw={2.6} />
            为成员添加航班
          </button>
        }
      />

      <Metrics
        items={[
          { k: "航班", v: flights.length, sub: "Flight legs", color: "#5b7a99" },
          { k: "已录入成员", v: travelersWithFlights, sub: `共 ${travelers.length} 位同行人` },
          {
            k: "待补充",
            v: Math.max(0, travelers.length - travelersWithFlights),
            sub: "尚无航班信息",
            color: "#b08648",
          },
        ]}
      />

      {sorted.length === 0 ? (
        <div className="mt-8">
          <AdminEmptyState
            title="还没有航班信息"
            body={
              travelers.length
                ? "选择同行人并录入出发、到达机场与当地时间。"
                : "先邀请同行成员加入行程，再为他们添加航班。"
            }
            icon={<Icons.plane sw={2.2} />}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {sorted.map((flight) => {
            const traveler = travelers.find((candidate) => candidate.id === flight.travelerId);
            if (!traveler) return null;
            return (
              <FlightCard
                key={flight.id}
                flight={flight}
                traveler={traveler}
                compact
                actions={
                  <>
                    <button
                      type="button"
                      className={`${BTN_SM} ${BTN_GHOST} [&_svg]:size-[13px]`}
                      onClick={() => setEditing(flight)}
                    >
                      <Icons.pencil sw={2.2} />
                      编辑
                    </button>
                    <button
                      type="button"
                      className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-[13px]`}
                      onClick={() => void remove(flight)}
                    >
                      <Icons.trash sw={2.2} />
                      删除
                    </button>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      {editing && travelers.length > 0 && (
        <FlightEditorModal
          isOpen
          flight={editing === "new" ? undefined : editing}
          travelers={travelers}
          initialTravelerId={editing === "new" ? travelers[0].id : editing.travelerId}
          defaultDate={meta.startDate ?? ""}
          canChooseTraveler={editing === "new"}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      {confirmModal}
    </div>
  );
}
