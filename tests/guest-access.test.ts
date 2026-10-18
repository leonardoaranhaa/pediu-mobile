import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../server/routers";
import * as db from "../server/db";
import {
  accountFields,
  clearAuthIntent,
  needsAccount,
  routeAfterWelcome,
  setAuthIntent,
  signupSteps,
  takeAuthReturn,
} from "../lib/guest-access";

describe("guest browsing and role signup", () => {
  afterEach(() => {
    clearAuthIntent();
    vi.restoreAllMocks();
  });

  it("opens the store catalog after the welcome slides", () => {
    expect(routeAfterWelcome()).toBe("/(tabs)");
    const onboarding = readFileSync("app/onboarding.tsx", "utf8");
    expect(onboarding).toContain("routeAfterWelcome()");
    expect(onboarding).not.toContain('router.replace("/login")');
  });

  it("asks for an account only when the action needs one", () => {
    for (const action of [
      "cart",
      "checkout",
      "orders",
      "favorite",
      "seller",
      "courier",
      "profile",
      "account",
    ]) {
      expect(needsAccount(action)).toBe(true);
    }
    expect(needsAccount("browse")).toBe(false);
    expect(needsAccount("search")).toBe(false);
  });

  it("keeps the signup steps separate for each role", () => {
    expect(signupSteps("customer")).toEqual(["role", "account"]);
    expect(signupSteps("merchant")).toEqual(["role", "account", "store"]);
    expect(signupSteps("courier")).toEqual([
      "role",
      "account",
      "vehicle",
      "pending",
    ]);
    for (const role of ["customer", "merchant", "courier"] as const) {
      expect(accountFields(role)).toEqual(["name", "email", "phone", "password"]);
    }
    const register = readFileSync("app/register.tsx", "utf8");
    const storeForm = readFileSync("components/store-signup-form.tsx", "utf8");
    expect(register).toContain("Cliente");
    expect(register).toContain("Lojista");
    expect(register).toContain("Motoboy");
    expect(storeForm).toContain("Nome fantasia");
    expect(register).toContain("Como você entrega");
    expect(register).toContain("Cadastro em análise");
  });

  it("returns the person to the action that asked for an account", () => {
    setAuthIntent({ action: "cart", returnTo: "/product/9" });
    expect(takeAuthReturn()).toBe("/product/9");
    expect(takeAuthReturn()).toBe("/(tabs)");
    const prompt = readFileSync("components/auth-prompt.tsx", "utf8");
    expect(prompt).toContain("Criar conta");
    expect(prompt).toContain("Já tenho conta");
  });

  it("lets a guest read stores, menus and categories, and blocks protected actions", async () => {
    vi.spyOn(db, "searchAvailableProducts").mockResolvedValue({
      items: [],
      hasMore: false,
      nextCursor: null,
    });
    vi.spyOn(db, "listAvailableProducts").mockResolvedValue([]);
    const guest = appRouter.createCaller({ user: null } as never);

    await expect(guest.pediu.marketplace.moods()).resolves.toEqual(
      expect.any(Array),
    );
    await expect(
      guest.pediu.marketplace.search({ category: "Lanches", limit: 5 }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      guest.pediu.marketplace.products({ category: "Lanches" }),
    ).resolves.toEqual([]);
    await expect(guest.pediu.orders.mine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(guest.pediu.stores.mine()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      guest.pediu.stores.create({ name: "Loja visitante" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      guest.pediu.courier.profile.register({ vehicleType: "moto" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("raises the preview Android version above the installed build", () => {
    const config = readFileSync("app.config.ts", "utf8");
    const eas = JSON.parse(readFileSync("eas.json", "utf8")) as {
      cli: { appVersionSource: string };
      build: { preview: { autoIncrement: boolean } };
    };
    expect(config).toContain("versionCode: 2");
    expect(eas.cli.appVersionSource).toBe("remote");
    expect(eas.build.preview.autoIncrement).toBe(true);
  });
});
