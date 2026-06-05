// Mock domain data for the Anime Expo 2026 admin console.
// Pure UI prototype: no backend. Everything lives in React state, seeded here.
// Ported from the design bundle's data.jsx (window globals -> typed named exports).

export type StopCat = "transit" | "food" | "event" | "stay" | "misc";
export type StopStatus = "booked" | "planned" | "watch";
export type PlanKind = "main" | "alt";

export type AdminMember = {
  id: string;
  name: string;
  handle: string;
  role: string;
  color: string;
  traveler: boolean;
  initials: string;
};

export type Plan = {
  id: string;
  kind: PlanKind;
  text: string;
};

export type Stop = {
  id: string;
  day: number;
  date: string;
  time: string;
  cat: StopCat;
  status: StopStatus;
  title: string;
  loc: string;
  addr: string;
  plans: Plan[];
};

export type SuggestionStatus = "pending" | "adopted" | "ignored";

type SuggestionBase = {
  id: string;
  author: string;
  stopId: string;
  when: string;
};

export type CommentSuggestionSeed = SuggestionBase & {
  type: "comment";
  body: string;
};

export type RewriteSuggestionSeed = SuggestionBase & {
  type: "rewrite";
  planId: string;
  from: string;
  to: string;
  reason: string;
};

export type SuggestionSeed = CommentSuggestionSeed | RewriteSuggestionSeed;
export type Suggestion = SuggestionSeed & { status: SuggestionStatus };

export type Expense = {
  id: string;
  cat: StopCat;
  name: string;
  sub: string;
  amount: number;
  credit: number;
  payer: string;
};

// ---- People in the planning group ----
export const MEMBERS: AdminMember[] = [
  {
    id: "you",
    name: "你",
    handle: "aki-zero",
    role: "管理员",
    color: "var(--magenta)",
    traveler: true,
    initials: "YO",
  },
  {
    id: "jay",
    name: "阿杰",
    handle: "ajie-dev",
    role: "同行",
    color: "var(--cyan)",
    traveler: true,
    initials: "JY",
  },
  {
    id: "mia",
    name: "小满",
    handle: "mancho",
    role: "同行参谋",
    color: "var(--violet)",
    traveler: false,
    initials: "MN",
  },
  {
    id: "kai",
    name: "Kai",
    handle: "kai-w",
    role: "同行参谋",
    color: "var(--green)",
    traveler: false,
    initials: "KW",
  },
];

export const memberById = (id: string): AdminMember =>
  MEMBERS.find((m) => m.id === id) ?? MEMBERS[0];
export const TRAVELERS: AdminMember[] = MEMBERS.filter((m) => m.traveler);

// ---- Category palette (shared with itinerary page) ----
export const CATS: Record<StopCat, { label: string; color: string }> = {
  transit: { label: "交通 · Transit", color: "var(--cyan)" },
  food: { label: "用餐 · Food", color: "var(--yellow)" },
  event: { label: "活动 · Event", color: "var(--magenta)" },
  stay: { label: "酒店 · Stay", color: "var(--violet)" },
  misc: { label: "杂项 · Misc", color: "var(--green)" },
};

export const STATUS: Record<StopStatus, { label: string; cls: string }> = {
  booked: { label: "已预订", cls: "booked" },
  planned: { label: "计划中", cls: "planned" },
  watch: { label: "关注", cls: "watch" },
};

// ---- Itinerary stops (curated subset of the real trip; suggestions target these ids) ----
export const STOPS_SEED: Stop[] = [
  {
    id: "s1",
    day: 1,
    date: "7/3 · FRI",
    time: "08:53",
    cat: "transit",
    status: "booked",
    title: "抵达 LAX",
    loc: "Los Angeles International Airport",
    addr: "1 World Way, Los Angeles, CA",
    plans: [
      { id: "p1a", kind: "main", text: "从航站楼到达层搭 Hertz shuttle 去取车。" },
      { id: "p1b", kind: "alt", text: "如果租车柜台严重延误，再考虑 LAX-it rideshare。" },
    ],
  },
  {
    id: "s2",
    day: 1,
    date: "7/3 · FRI",
    time: "10:45",
    cat: "food",
    status: "planned",
    title: "In-N-Out LAX 停靠",
    loc: "In-N-Out Burger",
    addr: "9149 S Sepulveda Blvd, Los Angeles, CA",
    plans: [
      { id: "p2a", kind: "main", text: "餐厅停车场；绕一圈还没位就放弃。" },
      { id: "p2b", kind: "alt", text: "停车场爆满就跳过，改到 LACC 附近吃。" },
    ],
  },
  {
    id: "s3",
    day: 1,
    date: "7/3 · FRI",
    time: "12:30",
    cat: "event",
    status: "watch",
    title: "Anime Expo badge + 第一轮逛场",
    loc: "Los Angeles Convention Center",
    addr: "1201 S Figueroa St, Los Angeles, CA",
    plans: [
      { id: "p3a", kind: "main", text: "LACC West Hall Garage。" },
      {
        id: "p3b",
        kind: "alt",
        text: "LA Live parking 后步行；downtown 堵死改 Little Tokyo + Metro。",
      },
    ],
  },
  {
    id: "s4",
    day: 1,
    date: "7/3 · FRI",
    time: "20:15",
    cat: "stay",
    status: "booked",
    title: "酒店 check-in",
    loc: "Holiday Inn Diamond Bar - Pomona",
    addr: "21725 Gateway Center Dr, Diamond Bar, CA",
    plans: [
      { id: "p4a", kind: "main", text: "酒店地面停车场。" },
      { id: "p4b", kind: "alt", text: "卸行李前先问前台 overflow 停车。" },
    ],
  },
  {
    id: "s5",
    day: 2,
    date: "7/4 · SAT",
    time: "全天",
    cat: "event",
    status: "watch",
    title: "Anime Expo 全天逛场",
    loc: "Los Angeles Convention Center",
    addr: "1201 S Figueroa St, Los Angeles, CA",
    plans: [
      { id: "p5a", kind: "main", text: "尽量提前预订 downtown garage（LACC 周边）。" },
      {
        id: "p5b",
        kind: "alt",
        text: "Union Station / Little Tokyo parking + Metro A/E line 进场。",
      },
    ],
  },
  {
    id: "s6",
    day: 3,
    date: "7/5 · SUN",
    time: "弹性",
    cat: "misc",
    status: "planned",
    title: "酒店据点 · 装车返程",
    loc: "Holiday Inn Diamond Bar - Pomona",
    addr: "21725 Gateway Center Dr, Diamond Bar, CA",
    plans: [
      { id: "p6a", kind: "main", text: "装车时停酒店地面停车场。" },
      { id: "p6b", kind: "alt", text: "如果停车场满，问前台临停位置。" },
    ],
  },
];

// ---- Pending suggestions queue (target the stop/plan ids above) ----
export const SUGGESTIONS_SEED: SuggestionSeed[] = [
  {
    id: "g1",
    type: "comment",
    author: "mia",
    stopId: "s2",
    when: "2 小时前",
    body: "这家周六中午基本停不到车，建议把绕圈时间砍到一圈以内，超时直接走 LACC 那边。",
  },
  {
    id: "g2",
    type: "rewrite",
    author: "kai",
    stopId: "s3",
    planId: "p3a",
    when: "昨天",
    from: "LACC West Hall Garage。",
    to: "LACC West Hall Garage，开门即满，建议 8:30 前到或先在 app 上预订车位。",
    reason: "去年这个点八点半之后就排到马路上了，预订能省 20 分钟。",
  },
  {
    id: "g3",
    type: "comment",
    author: "jay",
    stopId: "s1",
    when: "昨天",
    body: "备降还是直接 Hertz shuttle 稳，LAX-it rideshare 高峰排队也很久。",
  },
  {
    id: "g4",
    type: "rewrite",
    author: "mia",
    stopId: "s5",
    planId: "p5b",
    when: "2 天前",
    from: "Union Station / Little Tokyo parking + Metro A/E line 进场。",
    to: "Union Station / Little Tokyo parking + Metro A/E line 进场；先查周末发车时间，别在 Little Tokyo 站干等。",
    reason: "Metro A 线周末班次拉得很长，提前查能少等二十分钟。",
  },
  {
    id: "g5",
    type: "comment",
    author: "kai",
    stopId: "s4",
    when: "3 天前",
    body: "Holiday Inn 可以先用 app 在线 check-in，到店直接拿房卡，省得前台排队。",
  },
  {
    id: "g6",
    type: "rewrite",
    author: "jay",
    stopId: "s6",
    planId: "p6a",
    when: "3 天前",
    from: "装车时停酒店地面停车场。",
    to: "装车时停酒店地面停车场；返车前在 Diamond Bar 这侧先加满油，免租车行高价补油。",
    reason: "机场附近油价比 Diamond Bar 贵不少。",
  },
];

// ---- Expenses ledger ----
export const EXPENSES_SEED: Expense[] = [
  {
    id: "flight",
    cat: "transit",
    name: "机票 · JetBlue 往返",
    sub: "JFK ⇄ LAX / ONT · 2 人",
    amount: 993.6,
    credit: 0,
    payer: "you",
  },
  {
    id: "hotel",
    cat: "stay",
    name: "酒店 · Holiday Inn Diamond Bar",
    sub: "2 晚 · 2 Queen Standard",
    amount: 356.62,
    credit: 250,
    payer: "you",
  },
  {
    id: "tickets",
    cat: "event",
    name: "门票 · Anime Expo 2026",
    sub: "2 × 4-Day General Attendee",
    amount: 382.84,
    credit: 0,
    payer: "jay",
  },
  {
    id: "car",
    cat: "misc",
    name: "租车 · Hertz",
    sub: "3 天 · Kia K5 或同级",
    amount: 293.11,
    credit: 0,
    payer: "you",
  },
];

export const fmtMoney = (n: number): string =>
  "$" +
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const uid = (p: string): string => `${p}_${Math.random().toString(36).slice(2, 8)}`;
