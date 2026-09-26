import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { isAllowedOrigin, isUnsafeMethod, requestHasAllowedOrigin, requestUsesBearer } from "./security";
import { registerPaymentWebhookRoutes } from "../payment-webhook";
import { registerEmailVerificationRoutes } from "../email-verification";
import { assertRuntimeConfig } from "./env";
import { registerObservabilityMetrics } from "./observability";

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
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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
  registerObservabilityMetrics(app);

  app.use(
    "/api/trpc",
    (req, res, next) => {
      if (isUnsafeMethod(req.method) && !requestUsesBearer(req) && !requestHasAllowedOrigin(req)) {
        res.status(403).json({ error: "Origin not allowed for cookie-authenticated mutation" });
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
  });
}

startServer().catch(console.error);
