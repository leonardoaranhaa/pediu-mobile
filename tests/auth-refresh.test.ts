import { describe, expect, it } from "vitest";
import { signedInUserChanged } from "../lib/auth-refresh";

describe("refetch after the signed-in person changes", () => {
  it("does not refetch on the first session check when the app opens", () => {
    expect(signedInUserChanged(undefined, 5)).toBe(false);
    expect(signedInUserChanged(undefined, null)).toBe(false);
  });

  it("refetches after a visitor signs in or the account changes", () => {
    expect(signedInUserChanged(null, 5)).toBe(true);
    expect(signedInUserChanged(5, 6)).toBe(true);
    expect(signedInUserChanged(5, null)).toBe(true);
  });

  it("does nothing when the same person is still signed in", () => {
    expect(signedInUserChanged(5, 5)).toBe(false);
    expect(signedInUserChanged(null, null)).toBe(false);
  });
});
