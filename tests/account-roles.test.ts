import { describe, expect, it } from "vitest";
import {
  resolveOriginalRole,
  roleProfileRefusal,
  rolesFromLegacy,
} from "../shared/account-roles";
import {
  bottomSafeInset,
  scrollPaddingForFloatingBar,
} from "../lib/screen-space";

const day = 24 * 60 * 60 * 1000;

describe("one role per account", () => {
  it("reads the legacy stamp as a single role", () => {
    expect(rolesFromLegacy("courier")).toEqual(["courier"]);
    expect(rolesFromLegacy("merchant")).toEqual(["merchant"]);
    expect(rolesFromLegacy("admin")).toEqual(["admin"]);
    expect(rolesFromLegacy("user")).toEqual(["customer"]);
  });

  it("keeps the store when the loja was part of signup", () => {
    const created = new Date("2026-10-01T12:00:00.000Z");
    expect(
      resolveOriginalRole({
        legacyRole: "user",
        usesCustomerApp: 0,
        userCreatedAt: created,
        storeCreatedAt: new Date(created.getTime() + 20 * 60_000),
        courierCreatedAt: null,
      }),
    ).toBe("merchant");
  });

  it("keeps the courier when that profile was part of signup", () => {
    const created = new Date("2026-10-01T12:00:00.000Z");
    expect(
      resolveOriginalRole({
        legacyRole: "user",
        usesCustomerApp: 0,
        userCreatedAt: created,
        storeCreatedAt: null,
        courierCreatedAt: new Date(created.getTime() + 30 * 60_000),
      }),
    ).toBe("courier");
  });

  it("returns a later extra role to the original customer account", () => {
    const created = new Date("2026-10-01T12:00:00.000Z");
    expect(
      resolveOriginalRole({
        legacyRole: "user",
        usesCustomerApp: 1,
        userCreatedAt: created,
        storeCreatedAt: new Date(created.getTime() + 3 * day),
        courierCreatedAt: null,
      }),
    ).toBe("customer");
  });

  it("keeps the earlier profile when both were opened at signup", () => {
    const created = new Date("2026-10-01T12:00:00.000Z");
    expect(
      resolveOriginalRole({
        legacyRole: "user",
        usesCustomerApp: 0,
        userCreatedAt: created,
        storeCreatedAt: new Date(created.getTime() + 10 * 60_000),
        courierCreatedAt: new Date(created.getTime() + 40 * 60_000),
      }),
    ).toBe("merchant");
  });

  it("keeps the signup stamp before the store or the courier profile exists", () => {
    const created = new Date("2026-10-01T12:00:00.000Z");
    expect(
      resolveOriginalRole({
        legacyRole: "merchant",
        usesCustomerApp: 0,
        userCreatedAt: created,
        storeCreatedAt: null,
        courierCreatedAt: null,
      }),
    ).toBe("merchant");
    expect(
      resolveOriginalRole({
        legacyRole: "courier",
        usesCustomerApp: 0,
        userCreatedAt: created,
        storeCreatedAt: null,
        courierCreatedAt: null,
      }),
    ).toBe("courier");
    expect(
      resolveOriginalRole({
        legacyRole: "user",
        usesCustomerApp: 1,
        userCreatedAt: created,
        storeCreatedAt: null,
        courierCreatedAt: null,
      }),
    ).toBe("customer");
  });

  it("refuses a second role and lets the admin through", () => {
    expect(roleProfileRefusal(["customer"], "merchant")).toMatch(/lojista/);
    expect(roleProfileRefusal(["merchant"], "courier")).toMatch(/motoboy/);
    expect(roleProfileRefusal(["courier"], "courier")).toBeNull();
    expect(roleProfileRefusal(["customer"], "merchant", true)).toBeNull();
  });
});

describe("floating bar clearance", () => {
  it("leaves room for the bar and the system area", () => {
    expect(bottomSafeInset(0, "android")).toBeGreaterThanOrEqual(48);
    expect(scrollPaddingForFloatingBar(48, "android")).toBeGreaterThan(120 + 48);
  });
});
