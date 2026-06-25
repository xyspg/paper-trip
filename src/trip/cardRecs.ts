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
    text: "用 **CSP 全额付租车** 并拒绝租车行 CDW",
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
    text: "CSP 3×",
  },
}

const parking: CardRec = {
  category: "Parking · 停车",
  best: {
    name: "Freedom Flex",
    last4: "···9652",
    why: "Q3 公共交通 8% ",
    rate: "8",
    cardName: card.freedomFlex.cardName,
  },
  alts: [
    alt("csp", "Sapphire Preferred ···1981", "Travel", "3.36%"),
    alt("citiAA", "Citi AA Plat ···2181", "Other", "2%"),
    alt("alaska", "Alaska Atmos", "Other", "1.8%"),
  ],
  note: {
    kind: "提示",
    text: "Q3 Freedom Flex 公共交通 5× 含停车场/车库",
  },
}

const parkingDining: CardRec = {
  category: "Parking + Dining · 停车 / 场内餐饮",
  best: {
    name: "Freedom Flex",
    last4: "···9652",
    why: "停车 Q3 公共交通 5×· 场内餐饮换 CSP 3×",
    rate: "8",
    cardName: card.freedomFlex.cardName,
  },
  alts: [
    alt("csp", "Sapphire Preferred ···1981", "Dining 3×", "4.96%"),
    alt("citiAA", "Citi AA Plat ···2181", "Other", "2%"),
    alt("alaska", "Alaska Atmos", "Other", "1.8%"),
  ],
  note: {
    kind: "提示",
    text: "停车走 Freedom Flex",
  },
}


// Q3 2026 Freedom Flex 另一个 5× 类目即「加油站 + EV 充电」。返车前自行加满
// 走 Freedom Flex：5× UR × 1.6¢ = 8%，高于 Citi AA 的 4%。
const gas: CardRec = {
  category: "Gas · 加油（返车前）",
  best: {
    name: "Freedom Flex",
    last4: "···9652",
    why: "Q3 加油 + EV 5× × 1.6¢ = 8%",
    rate: "8",
    cardName: card.freedomFlex.cardName,
  },
  alts: [
    alt("citiAA", "Citi AA Plat ···2181", "Gas 2× AA", "4%"),
    alt("alaska", "Alaska Atmos", "Gas + EV", "3.6%"),
    alt("inkCash", "Ink Business Cash", "Gas", "3.2%"),
  ],
  note: {
    kind: "CDW",
    text: "返车前**自行加满**走 **Freedom Flex**；**租车尾款仍走 CSP** 保留主险。"
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
  "return-airport": gas,
}
