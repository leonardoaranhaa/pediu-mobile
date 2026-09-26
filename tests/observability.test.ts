import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { appRouter } from "../server/routers";
import * as observability from "../server/_core/observability";

describe("Pediu operation observability", () => {
  const originalObservabilityToken = process.env.OBSERVABILITY_TOKEN;

  afterEach(() => {
    observability.resetOperationMetrics();
    if (originalObservabilityToken === undefined) {
      delete process.env.OBSERVABILITY_TOKEN;
    } else {
      process.env.OBSERVABILITY_TOKEN = originalObservabilityToken;
    }
    vi.restoreAllMocks();
  });

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

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        procedure: "auth.me",
        outcome: "ok",
      }),
    );
    expect(spy.mock.calls[0][0]).not.toHaveProperty("user");
    expect(spy.mock.calls[0][0].durationMs).toEqual(expect.any(Number));
  });

  it("aggregates latency and errors without unbounded procedure cardinality", () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    observability.recordOperation({
      procedure: "pediu.health",
      durationMs: 12,
      outcome: "ok",
    });
    observability.recordOperation({
      procedure: "pediu.health",
      durationMs: 120,
      outcome: "error",
      code: "TIMEOUT",
    });
    for (let index = 0; index < 300; index += 1) {
      observability.recordOperation({
        procedure: `pediu.synthetic.${index}`,
        durationMs: 2,
        outcome: "ok",
      });
    }

    const snapshot = observability.getOperationMetricsSnapshot();
    const health = snapshot.operations.find(
      (operation) => operation.procedure === "pediu.health",
    );

    expect(snapshot.totals).toEqual({
      count: 302,
      errors: 1,
      errorRate: 0.0033,
    });
    expect(health).toEqual(
      expect.objectContaining({ count: 2, errors: 1, p95DurationMs: 250 }),
    );
    expect(snapshot.operations.length).toBeLessThanOrEqual(256);
    expect(
      snapshot.operations.some(
        (operation) => operation.procedure === "__other__",
      ),
    ).toBe(true);
  });

  it("protects the metrics endpoint and disables caching", async () => {
    process.env.OBSERVABILITY_TOKEN = "test-observability-token";
    observability.recordOperation({
      procedure: "auth.me",
      durationMs: 20,
      outcome: "ok",
    });
    const app = express();
    observability.registerObservabilityMetrics(app);
    const server = await new Promise<ReturnType<typeof app.listen>>(
      (resolve) => {
        const instance = app.listen(0, () => resolve(instance));
      },
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("metrics test server did not expose a port");

    try {
      const unauthorized = await fetch(
        `http://127.0.0.1:${address.port}/api/metrics`,
      );
      expect(unauthorized.status).toBe(401);

      const authorized = await fetch(
        `http://127.0.0.1:${address.port}/api/metrics`,
        {
          headers: { Authorization: "Bearer test-observability-token" },
        },
      );
      expect(authorized.status).toBe(200);
      expect(authorized.headers.get("cache-control")).toBe("no-store");
      expect((await authorized.json()).totals.count).toBe(1);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
