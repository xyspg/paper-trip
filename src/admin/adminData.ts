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
  avatarUrl?: string;
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

// Expenses now live on the synced Trip (single source of truth); re-exported
// here so admin modules keep importing the type from one place.
export type { Expense } from "../trip/types";

// ---- People in the planning group ----
export const MEMBERS: AdminMember[] = [
  {
    id: "you",
    name: "xyspg",
    handle: "xyspg",
    role: "管理员",
    color: "var(--magenta)",
    traveler: true,
    initials: "XY",
    avatarUrl: "https://github.com/xyspg.png",
  },
  {
    id: "spr",
    name: "Sapphire Rapids",
    handle: "sapphirerapids",
    role: "同行",
    color: "var(--cyan)",
    traveler: true,
    initials: "SR",
    avatarUrl: "https://github.com/sapphire-rapids.png",
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

export const fmtMoney = (n: number): string =>
  "$" +
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const uid = (p: string): string => `${p}_${Math.random().toString(36).slice(2, 8)}`;
