import { useState } from "react";
import type { Flight } from "../trip/types";
import { AdminModal } from "./AdminModal";
import { Icons } from "./AdminIcons";
import { TimezoneCombobox } from "./TimezoneCombobox";
import { uid } from "./adminData";
import {
  BTN,
  BTN_GHOST,
  BTN_INK,
  FIELD_INPUT,
  FIELD_LABEL,
  ModalFooter,
  ModalHeader,
} from "./adminUi";
import { blockImeSubmit } from "../ime";

export type FlightTraveler = { id: string; name: string };

type Props = {
  isOpen: boolean;
  flight?: Flight;
  travelers: FlightTraveler[];
  initialTravelerId: string;
  defaultDate?: string;
  canChooseTraveler: boolean;
  onClose: () => void;
  onSave: (flight: Flight) => void;
};

type EndpointDraft = Flight["departure"];

const endpointFrom = (value: EndpointDraft | undefined, fallbackDate: string): EndpointDraft => ({
  airport: value?.airport ?? "",
  date: value?.date ?? fallbackDate,
  time: value?.time ?? "09:00",
  timezone: value?.timezone ?? "",
});

function Form({
  flight,
  travelers,
  initialTravelerId,
  defaultDate,
  canChooseTraveler,
  onClose,
  onSave,
}: Omit<Props, "isOpen">) {
  const fallbackTraveler =
    travelers.find((traveler) => traveler.id === initialTravelerId)?.id ?? travelers[0]?.id ?? "";
  const [travelerId, setTravelerId] = useState(flight?.travelerId ?? fallbackTraveler);
  const [airline, setAirline] = useState(flight?.airline ?? "");
  const [flightNumber, setFlightNumber] = useState(flight?.flightNumber ?? "");
  const [departure, setDeparture] = useState<EndpointDraft>(
    endpointFrom(flight?.departure, defaultDate ?? ""),
  );
  const [arrival, setArrival] = useState<EndpointDraft>(
    endpointFrom(flight?.arrival, flight?.departure.date ?? defaultDate ?? ""),
  );
  const [confirmation, setConfirmation] = useState(flight?.confirmation ?? "");
  const [notes, setNotes] = useState(flight?.notes ?? "");
  const [error, setError] = useState("");

  const patchEndpoint = (endpoint: "departure" | "arrival", patch: Partial<EndpointDraft>) => {
    const update = (current: EndpointDraft) => ({ ...current, ...patch });
    if (endpoint === "departure") setDeparture(update);
    else setArrival(update);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!travelerId) {
      setError("请选择同行人");
      return;
    }
    if (
      !departure.airport.trim() ||
      !departure.date ||
      !departure.time ||
      !arrival.airport.trim() ||
      !arrival.date ||
      !arrival.time
    ) {
      setError("请填写出发和到达机场、日期与时间");
      return;
    }

    onSave({
      id: flight?.id ?? uid("flight"),
      travelerId,
      airline: airline.trim(),
      flightNumber: flightNumber.trim().toUpperCase(),
      departure: {
        airport: departure.airport.trim().toUpperCase(),
        date: departure.date,
        time: departure.time,
        ...(departure.timezone?.trim() ? { timezone: departure.timezone.trim() } : {}),
      },
      arrival: {
        airport: arrival.airport.trim().toUpperCase(),
        date: arrival.date,
        time: arrival.time,
        ...(arrival.timezone?.trim() ? { timezone: arrival.timezone.trim() } : {}),
      },
      ...(confirmation.trim() ? { confirmation: confirmation.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  };

  const endpointFields = (
    endpoint: "departure" | "arrival",
    value: EndpointDraft,
    label: string,
  ) => (
    <fieldset className="col-span-full grid grid-cols-2 gap-x-[14px] gap-y-[15px] p-3.5 border border-[#ebe9e3] rounded-[12px] max-[520px]:grid-cols-1">
      <legend className="px-2 font-cjk font-bold text-[13px] text-[#3b3833]">{label}</legend>
      <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
        <span className={FIELD_LABEL}>机场 / 城市</span>
        <input
          className={FIELD_INPUT}
          value={value.airport}
          placeholder={endpoint === "departure" ? "JFK · New York" : "NRT · Tokyo"}
          autoComplete="off"
          onChange={(event) => patchEndpoint(endpoint, { airport: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-[7px] min-w-0">
        <span className={FIELD_LABEL}>日期</span>
        <input
          className={FIELD_INPUT}
          type="date"
          value={value.date}
          onChange={(event) => patchEndpoint(endpoint, { date: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-[7px] min-w-0">
        <span className={FIELD_LABEL}>当地时间</span>
        <input
          className={FIELD_INPUT}
          type="time"
          value={value.time}
          onChange={(event) => patchEndpoint(endpoint, { time: event.target.value })}
        />
      </label>
      <div className="min-w-0 col-span-full">
        <TimezoneCombobox
          value={value.timezone ?? ""}
          label="时区（可选）"
          description={null}
          allowEmpty
          onValueChange={(timezone) => patchEndpoint(endpoint, { timezone })}
        />
      </div>
    </fieldset>
  );

  return (
    <form
      className="flex max-h-[min(880px,calc(100svh_-_32px))] flex-col"
      onSubmit={submit}
      onKeyDown={blockImeSubmit}
    >
      <ModalHeader
        icon={<Icons.plane sw={2.3} />}
        title={flight ? "编辑航班" : "添加航班"}
        onClose={onClose}
      />

      <div className="grid grid-cols-2 gap-x-[14px] gap-y-[15px] overflow-y-auto p-[18px] max-[520px]:grid-cols-1">
        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>同行人</span>
          <select
            className={`${FIELD_INPUT} cursor-pointer`}
            value={travelerId}
            disabled={Boolean(flight) || !canChooseTraveler}
            onChange={(event) => setTravelerId(event.target.value)}
          >
            {travelers.map((traveler) => (
              <option key={traveler.id} value={traveler.id}>
                {traveler.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>航空公司（可选）</span>
          <input
            className={FIELD_INPUT}
            value={airline}
            placeholder="ANA"
            autoComplete="off"
            onChange={(event) => setAirline(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>航班号（可选）</span>
          <input
            className={FIELD_INPUT}
            value={flightNumber}
            placeholder="NH 109"
            autoComplete="off"
            onChange={(event) => setFlightNumber(event.target.value)}
          />
        </label>

        {endpointFields("departure", departure, "出发")}
        {endpointFields("arrival", arrival, "到达")}

        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>确认号（可选）</span>
          <input
            className={FIELD_INPUT}
            value={confirmation}
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>备注（可选）</span>
          <textarea
            className={`${FIELD_INPUT} min-h-[82px] resize-y`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error && (
          <div className="col-span-full rounded-[10px] border border-[#ecccc2] bg-[#f8efec] px-3 py-2.5 font-cjk text-[12.5px] text-[#c2553f]">
            {error}
          </div>
        )}
      </div>

      <ModalFooter>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={onClose}>
          取消
        </button>
        <span className="ml-auto" />
        <button type="submit" className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}>
          <Icons.check sw={2.6} />
          保存航班
        </button>
      </ModalFooter>
    </form>
  );
}

export function FlightEditorModal({ isOpen, ...props }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={props.onClose}>
      <Form key={`${props.flight?.id ?? "new"}-${props.initialTravelerId}-${isOpen}`} {...props} />
    </AdminModal>
  );
}
