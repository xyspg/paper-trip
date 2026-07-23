import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pencil, Plane, Plus, Trash2, UsersRound } from "lucide-react";
import { FlightEditorModal } from "../admin/FlightEditorModal";
import { signInWithGitHub, useAdminUser } from "../admin/auth";
import { FlightCard } from "../components/FlightCard";
import { useTripAccess } from "../components/TripLayout";
import { flightsForTraveler, memberForUser, prioritizeMember, sortFlights } from "../trip/flights";
import { useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import type { Flight, TripMember } from "../trip/types";

const EDIT_BUTTON =
  "grid size-8 place-items-center rounded-full border border-[#ebe9e3] bg-white text-[#76726a] transition-colors hover:border-[#1c1b19] hover:text-[#1c1b19]";

function TravelerChip({
  member,
  count,
  active,
  mine,
  onClick,
}: {
  member: TripMember;
  count: number;
  active: boolean;
  mine: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-cjk text-[12.5px] font-semibold transition-colors ${active ? "border-[#1c1b19] bg-[#1c1b19] text-white" : "border-[#ebe9e3] bg-white text-[#3b3833] hover:border-[#1c1b19]"}`}
      onClick={onClick}
    >
      {member.avatarUrl ? (
        <img className="size-6 rounded-full object-cover" src={member.avatarUrl} alt="" />
      ) : (
        <span
          className="grid size-6 place-items-center rounded-full text-[9px] font-bold text-white"
          style={{ background: member.color ?? "#3f6f5b" }}
        >
          {member.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      {mine ? "我的航班" : member.name}
      <span
        className={`grid min-w-5 place-items-center rounded-full px-1.5 font-mono text-[10px] ${active ? "bg-white/15" : "bg-[#fafaf8] text-[#9b988f]"}`}
      >
        {count}
      </span>
    </button>
  );
}

export function BookingsPage({ tripId }: { tripId: string }) {
  const { meta } = useTripAccess();
  const { data: user, isLoading: userLoading } = useAdminUser();
  useTripLiveSync(tripId);
  const { data } = useTrip(tripId);
  const tripOp = useTripOp(tripId);
  const [pickedTravelerId, setPickedTravelerId] = useState<string | "all" | null>(null);
  const [editing, setEditing] = useState<Flight | "new" | null>(null);
  const [notice, setNotice] = useState("");

  const trip = data?.trip;
  if (!trip || userLoading) {
    return (
      <div className="grid place-items-center py-24">
        <span className="size-8 animate-[spin_0.7s_linear_infinite] rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b]" />
      </div>
    );
  }

  const members = trip.members ?? [];
  const flights = trip.flights ?? [];
  const currentMember = memberForUser(members, user?.id);
  const orderedMembers = prioritizeMember(members, currentMember?.id);
  const validPicked =
    pickedTravelerId !== null &&
    (pickedTravelerId === "all" || members.some((member) => member.id === pickedTravelerId));
  const selectedTravelerId: string | "all" =
    validPicked && pickedTravelerId
      ? pickedTravelerId
      : (currentMember?.id ?? members[0]?.id ?? "all");
  const selectedMember = members.find((member) => member.id === selectedTravelerId);
  const editorTraveler =
    editing && editing !== "new"
      ? members.find((member) => member.id === editing.travelerId)
      : selectedMember;
  const visibleFlights =
    selectedTravelerId === "all"
      ? sortFlights(flights)
      : flightsForTraveler(flights, selectedTravelerId);
  const canEditSelected = Boolean(
    user && selectedMember && (currentMember?.id === selectedMember.id || meta.role === "owner"),
  );
  const travelersWithFlights = new Set(flights.map((flight) => flight.travelerId)).size;
  const legacyFlights = trip.items.filter((item) => item.category === "flight");

  const saveFlight = (flight: Flight) => {
    const type = editing === "new" ? "addFlight" : "updateFlight";
    tripOp.mutate(
      { type, flight },
      {
        onSuccess: () => {
          setEditing(null);
          setPickedTravelerId(flight.travelerId);
          setNotice(type === "addFlight" ? "航班已添加" : "航班已更新");
        },
        onError: () => setNotice("保存失败，请重试"),
      },
    );
  };

  const deleteFlight = (flight: Flight) => {
    if (!window.confirm(`确定删除 ${flight.flightNumber || "这趟航班"} 吗？`)) return;
    tripOp.mutate(
      { type: "deleteFlight", flightId: flight.id, travelerId: flight.travelerId },
      {
        onSuccess: () => setNotice("航班已删除"),
        onError: () => setNotice("删除失败，请重试"),
      },
    );
  };

  return (
    <div className="font-sans text-[#1c1b19]">
      <header className="border-b border-[#ebe9e3] pb-7">
        <div className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f6f5b]">
          Flights · 航班信息
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[clamp(34px,6vw,54px)] font-extrabold leading-none tracking-[-0.035em]">
              各自出发，同程抵达
            </h1>
            <p className="mt-3 max-w-[62ch] font-cjk text-[14px] leading-relaxed text-[#76726a]">
              每位同行人可以记录多段航班；登录后会先显示你自己的，也可以随时查看大家的到达与返程安排。
            </p>
          </div>
          {canEditSelected && selectedMember && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#1c1b19] px-4 py-2.5 font-cjk text-[13px] font-semibold text-white hover:bg-black"
              onClick={() => setEditing("new")}
            >
              <Plus size={15} strokeWidth={2.5} />
              {currentMember?.id === selectedMember.id
                ? "添加我的航班"
                : `为 ${selectedMember.name} 添加`}
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[14px] border border-[#ebe9e3] max-[620px]:grid-cols-1">
          {[
            ["航班", flights.length, "Flight legs"],
            ["已录入成员", travelersWithFlights, `共 ${members.length} 位同行人`],
            ["当前视图", visibleFlights.length, selectedMember?.name ?? "全部成员"],
          ].map(([label, value, sub], index) => (
            <div
              key={String(label)}
              className={`px-5 py-4 ${index ? "border-l border-[#ebe9e3] max-[620px]:border-l-0 max-[620px]:border-t" : ""}`}
            >
              <div className="font-grotesk text-[10px] uppercase tracking-[0.12em] text-[#9b988f]">
                {label}
              </div>
              <div className="mt-1.5 text-[25px] font-extrabold">{value}</div>
              <div className="mt-0.5 font-cjk text-[11.5px] text-[#76726a]">{sub}</div>
            </div>
          ))}
        </div>
      </header>

      {members.length > 0 && (
        <section className="mt-6" aria-label="选择同行人">
          <div className="flex flex-wrap gap-2">
            {orderedMembers.map((member) => (
              <TravelerChip
                key={member.id}
                member={member}
                count={flights.filter((flight) => flight.travelerId === member.id).length}
                mine={member.id === currentMember?.id}
                active={selectedTravelerId === member.id}
                onClick={() => setPickedTravelerId(member.id)}
              />
            ))}
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-cjk text-[12.5px] font-semibold transition-colors ${selectedTravelerId === "all" ? "border-[#1c1b19] bg-[#1c1b19] text-white" : "border-[#ebe9e3] bg-white text-[#3b3833] hover:border-[#1c1b19]"}`}
              onClick={() => setPickedTravelerId("all")}
            >
              <UsersRound size={15} strokeWidth={2.2} />
              全部航班
              <span className="font-mono text-[10px] opacity-70">{flights.length}</span>
            </button>
          </div>
        </section>
      )}

      {notice && (
        <div className="mt-5 rounded-[10px] border border-[#cfe0d6] bg-[#eef4f0] px-4 py-3 font-cjk text-[12.5px] font-semibold text-[#3f6f5b]">
          {notice}
        </div>
      )}

      <section className="mt-6 grid gap-4">
        {visibleFlights.map((flight) => {
          const traveler = members.find((member) => member.id === flight.travelerId);
          if (!traveler) return null;
          const canEdit = Boolean(
            user && (currentMember?.id === traveler.id || meta.role === "owner"),
          );
          return (
            <FlightCard
              key={flight.id}
              flight={flight}
              traveler={traveler}
              actions={
                canEdit ? (
                  <>
                    <button
                      type="button"
                      className={EDIT_BUTTON}
                      title="编辑航班"
                      aria-label="编辑航班"
                      onClick={() => setEditing(flight)}
                    >
                      <Pencil size={14} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      className={`${EDIT_BUTTON} hover:border-[#c2553f] hover:text-[#c2553f]`}
                      title="删除航班"
                      aria-label="删除航班"
                      onClick={() => deleteFlight(flight)}
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                    </button>
                  </>
                ) : undefined
              }
            />
          );
        })}

        {visibleFlights.length === 0 && (
          <div className="grid place-items-center rounded-[14px] border border-dashed border-[#d8d5cb] bg-white px-6 py-14 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-[13px] bg-[#eef2f6] text-[#5b7a99]">
                <Plane size={23} strokeWidth={2.1} />
              </span>
              <h2 className="mt-3 font-cjk text-[17px] font-bold">
                {selectedMember ? `${selectedMember.name} 还没有航班` : "还没有录入航班"}
              </h2>
              <p className="mt-2 font-cjk text-[12.5px] text-[#76726a]">
                {canEditSelected
                  ? "添加出发与到达信息后，同行人就能在这里统一查看。"
                  : "选择其他同行人可以查看他们的航班安排。"}
              </p>
            </div>
          </div>
        )}
      </section>

      {!user && (
        <section className="mt-6 flex flex-wrap items-center gap-3 rounded-[14px] border border-[#ebe9e3] bg-white px-5 py-4">
          <div className="min-w-0 flex-1 font-cjk text-[12.5px] text-[#76726a]">
            登录并加入这个行程后，可以维护你自己的航班信息。
          </div>
          <button
            type="button"
            className="rounded-[9px] border border-[#1c1b19] px-3.5 py-2 font-cjk text-[12px] font-semibold"
            onClick={() => signInWithGitHub(window.location.pathname)}
          >
            登录
          </button>
        </section>
      )}

      {legacyFlights.length > 0 && (
        <section className="mt-6 rounded-[14px] border border-dashed border-[#d8d5cb] bg-[#fdfdfb] px-5 py-4 font-cjk text-[12.5px] leading-relaxed text-[#76726a]">
          另有 {legacyFlights.length} 条旧版航班停靠点仍保留在
          <Link
            to="/t/$tripId/timeline"
            params={{ tripId }}
            className="mx-1 font-semibold text-[#3f6f5b] underline underline-offset-2"
          >
            行程时间线
          </Link>
          中；新录入的个人航班不会覆盖它们。
        </section>
      )}

      {editing && editorTraveler && (
        <FlightEditorModal
          isOpen
          flight={editing === "new" ? undefined : editing}
          travelers={members}
          initialTravelerId={editing === "new" ? editorTraveler.id : editing.travelerId}
          defaultDate={trip.dates.start}
          canChooseTraveler={meta.role === "owner" && editing === "new"}
          onClose={() => setEditing(null)}
          onSave={saveFlight}
        />
      )}
    </div>
  );
}
