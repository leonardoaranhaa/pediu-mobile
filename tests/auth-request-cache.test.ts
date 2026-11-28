import { describe, expect, it } from "vitest";
import {
  AUTH_REQUEST_CACHE_MS,
  clearAuthRequestCache,
  rememberAuth,
  takeCachedAuth,
} from "../server/auth-request-cache";

describe("authenticated requests reuse one session lookup", () => {
  it("returns the same person for the cache window and then asks again", () => {
    clearAuthRequestCache();
    const user = { id: 7, openId: "p-7", name: "Ana" };
    rememberAuth("11:hash", user, 11, 1_000);
    expect(takeCachedAuth<typeof user>("11:hash", 1_000 + AUTH_REQUEST_CACHE_MS - 1)?.user).toEqual(user);
    expect(takeCachedAuth("11:hash", 1_000 + AUTH_REQUEST_CACHE_MS + 1)).toBeNull();
  });
});
