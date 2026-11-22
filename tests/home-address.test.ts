import { describe, expect, it } from "vitest";
import { homeAddressLine } from "../lib/home-address";

describe("home address chip", () => {
  it("shows the default address as street and number", () => {
    expect(
      homeAddressLine([
        { street: "Rua Velha", number: "1", isDefault: 0, updatedAt: "2026-11-22T03:00:00.000Z" },
        { street: "Rua das Flores", number: "123", isDefault: 1, updatedAt: "2026-11-20T03:00:00.000Z" },
      ]),
    ).toBe("Rua das Flores, 123");
  });

  it("uses the most recently saved address when none is default", () => {
    expect(
      homeAddressLine([
        { street: "Rua Antiga", number: "10", isDefault: 0, updatedAt: "2026-11-01T03:00:00.000Z" },
        { street: "Rua Nova", number: "45", isDefault: 0, createdAt: "2026-11-22T03:00:00.000Z" },
      ]),
    ).toBe("Rua Nova, 45");
  });

  it("asks for an address when the list is empty or the street is blank", () => {
    expect(homeAddressLine([])).toBeNull();
    expect(homeAddressLine(null)).toBeNull();
    expect(homeAddressLine([{ street: "  ", number: "10", isDefault: 1 }])).toBeNull();
  });
});
