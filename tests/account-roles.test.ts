import { describe, expect, it } from "vitest";
import { mergeAccountRoles, rolesFromLegacy } from "../shared/account-roles";

describe("account roles", () => {
  it("keeps customer, store and courier on the same person", () => {
    expect(
      mergeAccountRoles(["merchant", "courier"], "user"),
    ).toEqual(["customer", "merchant", "courier"]);
  });

  it("does not drop an older merchant label when the courier profile is added", () => {
    expect(mergeAccountRoles(["courier"], "merchant")).toEqual([
      "customer",
      "merchant",
      "courier",
    ]);
  });

  it("reads a single legacy stamp without inventing the other profiles", () => {
    expect(rolesFromLegacy("courier")).toEqual(["customer", "courier"]);
    expect(rolesFromLegacy("admin")).toEqual(["customer", "admin"]);
  });
});
