import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { buildUserResponse } from "./oauth";
import { sdk } from "./sdk";
import { isAllowedOrigin } from "./security";

export const DEV_PERSONAS = {
  customer: { openId: "dev-customer", name: "Cliente de Teste", email: "cliente@pediu.local" },
  merchant: { openId: "dev-merchant", name: "Lojista de Teste", email: "lojista@pediu.local" },
} as const;

export type DevPersona = keyof typeof DEV_PERSONAS;

function isDevPersona(value: unknown): value is DevPersona {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DEV_PERSONAS, value);
}

export function isDevAuthEnabled(): boolean {
  return !ENV.isProduction && process.env.DEV_AUTH_ENABLED === "true";
}

export function registerDevAuthRoutes(app: Express) {
  if (!isDevAuthEnabled()) return;
  console.warn("[DevAuth] Login de desenvolvimento habilitado. Nunca use DEV_AUTH_ENABLED em produção.");

  app.get("/api/dev/personas", (_req: Request, res: Response) => {
    res.json({
      personas: Object.entries(DEV_PERSONAS).map(([key, persona]) => ({ key, name: persona.name, email: persona.email })),
    });
  });

  app.post("/api/dev/login", async (req: Request, res: Response) => {
    const origin = req.headers.origin;
    if (typeof origin === "string" && !isAllowedOrigin(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    if (!ENV.appId || !ENV.cookieSecret) {
      res.status(503).json({ error: "Defina VITE_APP_ID e JWT_SECRET para assinar sessões locais" });
      return;
    }
    const persona = (req.body as { persona?: unknown } | undefined)?.persona;
    if (!isDevPersona(persona)) {
      res.status(400).json({ error: "Persona inválida" });
      return;
    }

    try {
      const { openId, name } = DEV_PERSONAS[persona];
      const user = await getUserByOpenId(openId);
      if (!user) {
        res.status(404).json({ error: "Conta de teste não encontrada. Rode pnpm db:seed" });
        return;
      }
      await upsertUser({ openId, lastSignedIn: new Date() });
      const sessionToken = await sdk.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch {
      console.error("[DevAuth] Login de desenvolvimento falhou");
      res.status(500).json({ error: "Falha no login de desenvolvimento" });
    }
  });
}
