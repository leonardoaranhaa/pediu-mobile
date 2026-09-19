import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as observability from "../server/_core/observability";

describe("Pediu operation observability", () => {
  it("records successful procedure execution without exposing user payload", async () => {
    const spy = vi.spyOn(observability, "recordOperation");

    const caller = appRouter.createCaller({
      user: {
        id: 20,
        openId: "user-20",
        name: "Cliente Teste",
        email: "cliente@test.local",
        loginMethod: "test",
        role: "user",
        lastSignedIn: new Date(),
      },
    } as any);

    await caller.auth.me();

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      procedure: "auth.me",
      outcome: "ok",
    }));
    expect(spy.mock.calls[0][0]).not.toHaveProperty("user");
    expect(spy.mock.calls[0][0].durationMs).toEqual(expect.any(Number));
  });
});
