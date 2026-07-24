import { describe, expect, it } from "bun:test";

import { itemPlans } from "../src/pages/timelineShared";
import type { TripItem } from "../src/trip/types";

const item = (over: Partial<TripItem> = {}): TripItem => ({
  id: "dinner-yoroniku",
  date: "2026-08-16",
  time: "22:00",
  title: "Ebisu YORONIKU",
  category: "food",
  location: "Ebisu YORONIKU",
  address: "1-11-5 Ebisu, Shibuya-ku",
  durationMinutes: 120,
  status: "locked",
  priority: "high",
  notes: [],
  links: [],
  ...over,
});

describe("public timeline plans", () => {
  it("renders every note, not just the first two", () => {
    const notes = [
      "2 人 · 限时 2 小时",
      "套餐 ¥14,900 × 2",
      "当天店内支付",
      "取消：>48h 免费 / 48h 内 50% / 24h 内 100%",
      "迟到 15 分钟释放座位",
    ];
    const plans = itemPlans(item({ notes }));

    expect(plans.map((p) => p.text)).toEqual(notes);
    expect(plans.map((p) => p.label)).toEqual(["提示", "备注", "备注", "备注", "备注"]);
    expect(plans.map((p) => p.kind)).toEqual(["main", "alt", "alt", "alt", "alt"]);
  });

  it("keeps 主方案/备用 wording for parking, which really is a fallback", () => {
    const plans = itemPlans(
      item({ parking: { primary: "P1", backup: "P2", warning: "限高 2.1m" } }),
    );

    expect(plans.map((p) => p.label)).toEqual(["主方案", "备用", "提醒"]);
  });

  it("drops the plan rows entirely once parking carries structured detail", () => {
    const plans = itemPlans(
      item({ parking: { primary: "P1", backup: "P2", reservationId: "r-1", price: 7.99 } }),
    );

    expect(plans.map((p) => p.label)).toEqual(["备用"]);
  });
});
