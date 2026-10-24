import { describe, expect, it } from "vitest";
import {
  ACCOUNT_PREFERENCE_LINK_KEYS,
  ACCOUNT_PREFERENCE_SECTIONS,
} from "../lib/account-preferences";

describe("account preference surface", () => {
  it("keeps every preference area reachable from the account hub", () => {
    expect(ACCOUNT_PREFERENCE_LINK_KEYS).toEqual([
      "advanced",
      "notifications",
      "personal",
      "addresses",
      "payments",
      "privacy",
      "support",
    ]);
  });

  it("does not duplicate links or route targets", () => {
    const links = ACCOUNT_PREFERENCE_SECTIONS.flatMap((section) => section.links);
    expect(new Set(links.map((link) => link.key)).size).toBe(links.length);
    expect(new Set(links.map((link) => link.path)).size).toBe(links.length);
    expect(links.every((link) => link.path.startsWith("/account/"))).toBe(true);
  });
});
