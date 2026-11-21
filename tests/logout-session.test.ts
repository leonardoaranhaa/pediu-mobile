import { describe, expect, it, vi } from "vitest";
import { logoutSession } from "../lib/logout-session";

describe("logout clears the phone before the server answers", () => {
  it("clears the token and the cache and opens login without waiting", async () => {
    const order: string[] = [];
    let release: (() => void) | undefined;
    const server = new Promise<void>((resolve) => {
      release = resolve;
    });
    await logoutSession({
      clearToken: async () => {
        order.push("token");
      },
      clearCache: () => {
        order.push("cache");
      },
      goToLogin: () => {
        order.push("login");
      },
      tellServer: () => {
        order.push("server");
        return server;
      },
    });
    expect(order).toEqual(["token", "cache", "login", "server"]);
    release?.();
  });

  it("still leaves the phone when the server call fails", async () => {
    const order: string[] = [];
    await logoutSession({
      clearToken: async () => {
        order.push("token");
      },
      clearCache: () => order.push("cache"),
      goToLogin: () => order.push("login"),
      tellServer: async () => {
        throw new Error("sem rede");
      },
    });
    expect(order.slice(0, 3)).toEqual(["token", "cache", "login"]);
  });
});
