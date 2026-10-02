import { describe, expect, it } from "vitest";
import {
  isUniqueConstraintError,
  normalizeIdempotencyKey,
} from "../server/domain/idempotency";

describe("idempotency helpers", () => {
  it("normalizes a valid key and rejects blank or oversized keys", () => {
    expect(normalizeIdempotencyKey("  checkout-123  ")).toBe("checkout-123");
    expect(() => normalizeIdempotencyKey("   ")).toThrow(
      "Invalid idempotency key",
    );
    expect(() => normalizeIdempotencyKey("x".repeat(161))).toThrow(
      "Invalid idempotency key",
    );
  });

  it.each([
    { name: "driver code", error: { code: "ER_DUP_ENTRY" } },
    { name: "driver errno", error: { errno: 1062 } },
    {
      name: "driver message",
      error: new Error("Duplicate entry for key provider_event_unique"),
    },
    {
      name: "Drizzle cause",
      error: {
        message: "Failed query: insert into pediu_webhook_events",
        cause: { code: "ER_DUP_ENTRY", message: "Duplicate entry" },
      },
    },
    {
      name: "nested driver error",
      error: {
        message: "Failed query",
        originalError: { driverError: { errno: 1062 } },
      },
    },
    {
      name: "checkout constraint name",
      error: new Error("Duplicate key pediu_orders_idempotency_unique"),
    },
  ])("recognizes $name as a unique constraint conflict", ({ error }) => {
    expect(isUniqueConstraintError(error)).toBe(true);
  });

  it("does not classify unrelated errors as unique conflicts", () => {
    expect(isUniqueConstraintError(new Error("connection timeout"))).toBe(
      false,
    );
    expect(isUniqueConstraintError({ code: "ER_LOCK_DEADLOCK" })).toBe(false);
    expect(isUniqueConstraintError(undefined)).toBe(false);
  });
});
