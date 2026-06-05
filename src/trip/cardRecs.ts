// Per-stop credit-card recommendations ("刷卡建议 / Best Card"). This is
// editorial/presentational data keyed by trip item id, kept out of the synced
// trip document the same way `dayMeta` lives in the timeline page. Each stop
// reuses a shared spend profile (a category like Dining or Gas), so the same
// reasoning renders on every item that bills to that category.
//
// Card art is resolved at render time from the credit-cards catalog API via
// `cardName` (the card's catalog name); cards missing from the catalog fall back
// to a brand-color swatch.

export type CardAlt = {
  name: string
  tag: string
  rate: string
  swatch: string
  cardName?: string
}

export type CardNote = {
  kind: string
  // `text` supports lightweight **bold** spans rendered by the timeline page.
  text: string
}

export type CardRec = {
  category: string
  best: {
    name: string
    last4?: string
    why: string
    rate: string
    cardName?: string
  }
  alts: CardAlt[]
  note?: CardNote
}

// Card registry: each card's catalog name (matched against the credit-cards API)
// + brand-color swatch defined once. The swatch is the fallback when the card is
// absent from the catalog (Ink Business Cash). Reused by hero and alternates.
const card = {
  csp: { cardName: "Chase Sapphire Preferred", swatch: "#1466b8" },
  citiAA: { cardName: "Citi AAdvantage Platinum Select World Elite Mastercard", swatch: "#9AA0AD" },
  csr: { cardName: "Chase Sapphire Reserve", swatch: "#1C1C1C" },
  freedomFlex: { cardName: "Chase Freedom Flex", swatch: "#15A0D4" },
  alaska: { cardName: "Alaska Atmos™ Rewards Ascent Visa Signature®", swatch: "#16335F" },
  amexBce: { cardName: "Blue Cash Everyday Card", swatch: "#2F6FDB" },
  inkCash: { cardName: undefined, swatch: "#5B6470" },
} as const

type CardKey = keyof typeof card

const alt = (key: CardKey, name: string, tag: string, rate: string): CardAlt => ({
  name,
  tag,
  rate,
  swatch: card[key].swatch,
  cardName: card[key].cardName,
})

// The "Other / Travel" alternate trio shared by parking, hotel and rental — all
// of these bill as Travel, where no card beats CSP's 2x.
const travelAlts: CardAlt[] = [
  alt("citiAA", "Citi AA Plat ···2181", "Other", "2%"),
  alt("alaska", "Alaska Atmos", "Other", "1.8%"),
  alt("csr", "Sapphire Reserve ···8930", "Other", "1.6%"),
]

const carRental: CardRec = {
  category: "Car Rental · 租车",
  best: {
    name: "Sapphire Preferred",
    last4: "···1981",
    why: "Travel 2× 积分 · 自带主要租车险",
    rate: "3.36",
    cardName: card.csp.cardName,
  },
  alts: travelAlts,
  note: {
    kind: "CDW",
    text: "用 **CSP 全额付租车** 并拒绝租车行 CDW，即享 **主要碰撞损害险（primary CDW）**，无需先走自己车险。",
  },
}

const dining: CardRec = {
  category: "Dining · 餐饮",
  best: {
    name: "Sapphire Preferred",
    last4: "···1981",
    why: "餐厅 3× 积分 · 估值后约",
    rate: "4.96",
    cardName: card.csp.cardName,
  },
  alts: [
    alt("csr", "Sapphire Reserve ···8930", "Dining", "4.8%"),
    alt("freedomFlex", "Freedom Flex ···9652", "Dining", "4.8%"),
    alt("citiAA", "Citi AA Plat ···2181", "Restaurants", "4%"),
  ],
  note: {
    kind: "提示",
    text: "快餐（In-N-Out）一般按 **Restaurants** 入账，CSP 3× 有效。",
  },
}

const parking: CardRec = {
  category: "Parking · 停车",
  best: {
    name: "Sapphire Preferred",
    last4: "···1981",
    why: "车库多按 Travel 入账 · 2× 积分",
    rate: "3.36",
    cardName: card.csp.cardName,
  },
  alts: travelAlts,
  note: {
    kind: "提示",
    text: "**Badge 已线上购**，不在此计；停车库多按 Travel/Parking 入账 → CSP 2×。",
  },
}

const parkingDining: CardRec = {
  category: "Parking + Dining · 停车 / 场内餐饮",
  best: {
    name: "Sapphire Preferred",
    last4: "···1981",
    why: "停车 Travel 2× · 场内餐饮 3×",
    rate: "3.36",
    cardName: card.csp.cardName,
  },
  alts: travelAlts,
  note: {
    kind: "提示",
    text: "停车同 Day 1；**场内餐饮**记得换 Dining 卡 → CSP **4.96%** 最优。",
  },
}

const hotel: CardRec = {
  category: "Hotel · 酒店",
  best: {
    name: "Sapphire Preferred",
    last4: "···1981",
    why: "酒店按 Travel 入账 · 2× + 旅行保障",
    rate: "3.36",
    cardName: card.csp.cardName,
  },
  alts: travelAlts,
  note: {
    kind: "注意",
    text: "Holiday Inn = **IHG**，Bonvoy 无加成（仅 1.4%）；酒店按 Travel 计，CSP/CSR 另含 **行程延误 / 行李险**。",
  },
}

const gas: CardRec = {
  category: "Gas · 加油（返车前）",
  best: {
    name: "Citi AA Platinum",
    last4: "···2181",
    why: "加油 2× AA · 估值 2.0¢ = 4%",
    rate: "4",
    cardName: card.citiAA.cardName,
  },
  alts: [
    alt("alaska", "Alaska Atmos", "Gas + EV", "3.6%"),
    alt("inkCash", "Ink Business Cash", "Gas", "3.2%"),
    alt("amexBce", "Amex Blue Cash Everyday", "Gas", "3%"),
  ],
  note: {
    kind: "CDW",
    text: "返车前**自行加满**（免租车行高价补油）；**租车尾款仍走 CSP** 保留主险。",
  },
}

// Item id → spend profile. Only spend-relevant stops get a module; flights
// (already booked) and pure logistics stops are intentionally left out.
export const cardRecs: Record<string, CardRec> = {
  "hertz-lax": carRental,
  "in-n-out": dining,
  "dinner-fri": dining,
  "dinner-sat": dining,
  "anime-expo-day-1": parking,
  "ax-day-2": parkingDining,
  "hotel-checkin": hotel,
  "return-airport": gas,
}
