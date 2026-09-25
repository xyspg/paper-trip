import { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
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
  const { t } = useLingui();
  const sorted = sortFlights(flights);
  const travelersWithFlights = new Set(flights.map((flight) => flight.travelerId)).size;
  const travelerCount = travelers.length;

  const save = (flight: Flight) => {
    const type = editing === "new" ? "addFlight" : "updateFlight";
    tripOp.mutate(
      { type, flight },
      {
        onSuccess: () => {
          setEditing(null);
          toast(type === "addFlight" ? t`已添加航班` : t`已更新航班`);
        },
        onError: () => toast(t`保存失败，请重试`, "warn"),
      },
    );
  };

  const remove = async (flight: Flight) => {
    const traveler = travelers.find((candidate) => candidate.id === flight.travelerId);
    const name = traveler?.name ?? t`该成员`;
    const flightNumber = flight.flightNumber;
    const ok = await confirm({
      title: t`删除航班`,
      message: flightNumber
        ? t`确定删除 ${name} 的 ${flightNumber} 吗？`
        : t`确定删除 ${name} 的 这趟航班 吗？`,
      confirmLabel: t`删除航班`,
    });
    if (!ok) return;
    tripOp.mutate(
      { type: "deleteFlight", flightId: flight.id, travelerId: flight.travelerId },
      {
        onSuccess: () => toast(t`已删除航班`),
        onError: () => toast(t`删除失败，请重试`, "warn"),
      },
    );
  };

  return (
    <div>
      <SectionHead
        kicker="Flights · Bookings"
        title={t`航班信息`}
        desc={t`按同行人记录多段航班 · 管理员可代为添加、修改或删除`}
        actions={
          <button
            className={`${BTN} ${BTN_INK} [&_svg]:size-[15px]`}
            disabled={travelers.length === 0}
            onClick={() => setEditing("new")}
          >
            <Icons.plus sw={2.6} />
            <Trans>为成员添加航班</Trans>
          </button>
        }
      />

      <Metrics
        items={[
          { k: t`航班`, v: flights.length, sub: "Flight legs", color: "#5b7a99" },
          { k: t`已录入成员`, v: travelersWithFlights, sub: t`共 ${travelerCount} 位同行人` },
          {
            k: t`待补充`,
            v: Math.max(0, travelers.length - travelersWithFlights),
            sub: t`尚无航班信息`,
            color: "#b08648",
          },
        ]}
      />

      {sorted.length === 0 ? (
        <div className="mt-8">
          <AdminEmptyState
            title={t`还没有航班信息`}
            body={
              travelers.length
                ? t`选择同行人并录入出发、到达机场与当地时间。`
                : t`先邀请同行成员加入行程，再为他们添加航班。`
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
                      <Trans>编辑</Trans>
                    </button>
                    <button
                      type="button"
                      className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-[13px]`}
                      onClick={() => void remove(flight)}
                    >
                      <Icons.trash sw={2.2} />
                      <Trans>删除</Trans>
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
