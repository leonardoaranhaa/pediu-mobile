import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import {
  isAllowedOrigin,
  isUnsafeMethod,
  requestHasAllowedOrigin,
  requestUsesBearer,
} from "./security";
import { registerPaymentWebhookRoutes } from "../payment-webhook";
import { registerEmailVerificationRoutes } from "../email-verification";
import { assertRuntimeConfig } from "./env";
import { registerObservabilityMetrics } from "./observability";
import { probeReadiness } from "./readiness";
import { startDispatchOfferSweeper } from "../dispatch-offer-sweeper";
import { startInventoryReservationSweeper } from "../inventory-reservation-sweeper";
import { startNotificationOutboxWorker } from "../notification-outbox-worker";
import { startRateLimitBucketSweeper } from "../rate-limit-bucket-sweeper";
import { runWorkerCatchUp } from "../worker-tick";
import crypto from "node:crypto";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertRuntimeConfig();
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (typeof origin === "string" && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    res.header("Vary", "Origin");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token",
    );

    if (req.method === "OPTIONS") {
      if (typeof origin === "string" && !isAllowedOrigin(origin)) {
        res.sendStatus(403);
        return;
      }
      res.sendStatus(204);
      return;
    }
    next();
  });

  registerPaymentWebhookRoutes(app);
  registerEmailVerificationRoutes(app);
  app.use(express.json({ limit: "16mb" }));
  app.use(express.urlencoded({ limit: "16mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });
  const workerTick = async (
    req: express.Request,
    res: express.Response,
  ) => {
    const configured = process.env.OBSERVABILITY_TOKEN?.trim();
    if (!configured) {
      res.sendStatus(404);
      return;
    }
    const header = req.header("authorization") ?? "";
    const provided = header.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : typeof req.query.token === "string"
        ? req.query.token
        : "";
    const expected = Buffer.from(configured);
    const actual = Buffer.from(provided);
    const allowed =
      expected.length > 0 &&
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual);
    if (!allowed) {
      res.sendStatus(401);
      return;
    }
    try {
      const result = await runWorkerCatchUp();
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error("[Workers] Catch-up tick failed", error);
      res.status(503).json({ ok: false });
    }
  };
  app.get("/api/internal/workers/tick", workerTick);
  app.post("/api/internal/workers/tick", workerTick);
  app.get("/api/readyz", async (_req, res) => {
    const result = await probeReadiness();
    res.status(result.ready ? 200 : 503).json({
      service: "pediu-api",
      status: result.ready ? "ready" : "not_ready",
      checks: result.checks,
      timestamp: Date.now(),
    });
  });
  registerObservabilityMetrics(app);

  app.use(
    "/api/trpc",
    (req, res, next) => {
      if (
        isUnsafeMethod(req.method) &&
        !requestUsesBearer(req) &&
        !requestHasAllowedOrigin(req)
      ) {
        res.status(403).json({
          error: "Origin not allowed for cookie-authenticated mutation",
        });
        return;
      }
      next();
    },
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
    startDispatchOfferSweeper();
    startInventoryReservationSweeper();
    startNotificationOutboxWorker();
    startRateLimitBucketSweeper();
    void runWorkerCatchUp().catch((error) => {
      console.error("[Workers] Boot catch-up failed", error);
    });
  });
}

startServer().catch(console.error);
