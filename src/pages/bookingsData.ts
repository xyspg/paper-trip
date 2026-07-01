// Static booking data for the bookings page (PaperBookings). Presentational and
// fixed (not synced), so it lives here as one source.

type Endpoint = {
  time: string
  code: string
  city: string
  flag?: string
}

export type Flight = {
  rail: string
  legLabel: string
  legClass?: string
  date: string
  from: Endpoint
  to: Endpoint
  duration: string
  flightNo: string
  aircraft: string
  fareClass: string
  fareNote: string
}

export const flights: Flight[] = [
  {
    rail: "Outbound · 去程",
    legLabel: "去程 · Depart",
    date: "周五 · 7月3日 2026",
    from: { time: "07:30 AM", code: "JFK", city: "纽约 · New York" },
    to: { time: "10:21 AM", code: "LAX", city: "洛杉矶 · Los Angeles" },
    duration: "5h 51m",
    flightNo: "B6 223",
    aircraft: "Airbus A318",
    fareClass: "Blue Basic",
    fareNote: "经济舱 · class L",
  },
  {
    rail: "Return · 返程",
    legLabel: "返程 · Return",
    legClass: "ret",
    date: "周日 · 7月5日 2026",
    from: {
      time: "11:59 PM",
      code: "ONT",
      city: "安大略 · Ontario, CA",
      flag: "⚠ 不同机场 · 非 LAX",
    },
    to: {
      time: "08:25 AM",
      code: "JFK",
      city: "纽约 · New York",
      flag: "⚠ 隔天到 · 7月6日 周一",
    },
    duration: "5h 26m",
    flightNo: "B6 454",
    aircraft: "Airbus A321",
    fareClass: "Blue Basic",
    fareNote: "经济舱 · class L",
  },
]

export const hotel = {
  name: "Holiday Inn DIAMOND BAR – POMONA by IHG",
  room: "2 Queen Standard · 两张大床 (2 Queen bed)",
  checkInDate: "7月3日 周五",
  checkInTime: "15:00 · 3:00 PM",
  checkOutDate: "7月5日 周日",
  checkOutTime: "12:00 · 中午",
  nights: "2 晚",
  address: "21725 E Gateway Center Dr, Diamond Bar, CA 91765 US",
  addressQuery:
    "Holiday Inn Diamond Bar Pomona, 21725 E Gateway Center Dr, Diamond Bar, CA 91765",
  cancelNote: "截至 7月2日 周四 12:00 AM（酒店当地时间）",
}
