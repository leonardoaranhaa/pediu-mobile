import { describe, expect, it } from "vitest";
import {
  getHomeContext,
  homeContextForHour,
  homePeriodForHour,
  rankHomeProducts,
} from "../lib/home-context";

describe("home context", () => {
  it.each([
    [4, "dawn", "Boa madrugada"],
    [7, "morning", "Bom dia"],
    [12, "lunch", "Bom almoço"],
    [16, "afternoon", "Boa tarde"],
    [20, "dinner", "Boa noite"],
    [23, "lateNight", "Boa noite"],
  ])("derives %s as %s", (hour, period, greeting) => {
    const context = homeContextForHour(hour);
    expect(context.period).toBe(period);
    expect(context.greeting).toBe(greeting);
    expect(context.hour).toBe(hour);
  });

  it("keeps the hour boundaries deterministic", () => {
    expect(homePeriodForHour(10)).toBe("morning");
    expect(homePeriodForHour(11)).toBe("lunch");
    expect(homePeriodForHour(17)).toBe("afternoon");
    expect(homePeriodForHour(18)).toBe("dinner");
    expect(homePeriodForHour(22)).toBe("dinner");
    expect(homePeriodForHour(23)).toBe("lateNight");
  });

  it("prioritizes market during the local shopping window without hiding restaurants", () => {
    const context = homeContextForHour(9);
    const products = [
      {
        id: "restaurant",
        storeKind: "restaurant" as const,
        category: "Lanches",
      },
      { id: "market", storeKind: "market" as const, category: "Mercearia" },
      { id: "bakery", storeKind: "restaurant" as const, category: "Padaria" },
    ];

    const ranked = rankHomeProducts(products, context);
    expect(ranked.map((item) => item.id)).toEqual([
      "market",
      "bakery",
      "restaurant",
    ]);
    expect(ranked).toHaveLength(3);
  });

  it("prioritizes Flash at night while keeping Mercado reachable", () => {
    const context = homeContextForHour(22);
    const products = [
      { id: "market", storeKind: "market" as const, category: "Mercearia" },
      {
        id: "flash",
        storeKind: "restaurant" as const,
        category: "Lanches",
        flash: true,
      },
    ];

    const ranked = rankHomeProducts(products, context);
    expect(ranked[0]?.id).toBe("flash");
    expect(ranked.some((item) => item.id === "market")).toBe(true);
  });

  it("accepts a supplied Date as the local context source", () => {
    expect(getHomeContext(new Date(2026, 9, 9, 15)).focusLabel).toBe(
      "Lanche da tarde",
    );
  });
});
