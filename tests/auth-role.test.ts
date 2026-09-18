import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";

describe("Pediu authenticated role contract", () => {
  it("exposes the persisted merchant role through auth.me", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 10,
        openId: "merchant-10",
        name: "Loja Teste",
        email: "loja@test.local",
        loginMethod: "test",
        role: "merchant",
        lastSignedIn: new Date(),
      },
    } as any);

    const user = await caller.auth.me();

    expect(user?.role).toBe("merchant");
  });

  it("does not promote a regular user to merchant", async () => {
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

    const user = await caller.auth.me();

    expect(user?.role).toBe("user");
  });
});
