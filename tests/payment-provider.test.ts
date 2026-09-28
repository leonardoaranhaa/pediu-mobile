import { afterEach, describe, expect, it, vi } from "vitest";
import { createPixCharge } from "../server/payments";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("PIX provider environment boundary", () => {
  it("keeps manual pending charges available outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("PIX_PROVIDER", "manual");

    await expect(
      createPixCharge({
        orderId: 20,
        amount: "15.00",
        pixKey: "store-pix",
        idempotencyKey: "pix-order-20",
      }),
    ).resolves.toMatchObject({ provider: "manual", status: "pending" });
  });

  it("refuses to represent a manual local record as a production PIX charge", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PIX_PROVIDER", "manual");

    await expect(
      createPixCharge({
        orderId: 21,
        amount: "20.00",
        pixKey: "store-pix",
        idempotencyKey: "pix-order-21",
      }),
    ).rejects.toThrow("não pode criar cobranças em produção");
  });
});
