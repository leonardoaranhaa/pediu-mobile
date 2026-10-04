import type { Express, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { buildUserResponse } from "./oauth";
import { sdk } from "./sdk";

const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export async function verifyAppleIdentityToken(identityToken: string, audience: string) {
  const { payload } = await jwtVerify(identityToken, appleKeys, {
    issuer: "https://appleid.apple.com",
    audience,
  });
  if (typeof payload.sub !== "string" || payload.sub.length < 1) throw new Error("Apple token missing subject");
  const openId = `apple:${payload.sub}`;
  if (openId.length > 128) throw new Error("Apple subject is too long");
  return { openId, email: typeof payload.email === "string" ? payload.email : null };
}

export function registerAppleAuthRoutes(app: Express) {
  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    const audience = process.env.APPLE_BUNDLE_ID?.trim();
    if (!audience) {
      res.status(503).json({ error: "Sign in with Apple ainda não está configurado neste servidor" });
      return;
    }
    const body = req.body as { identityToken?: unknown; name?: unknown } | undefined;
    const identityToken = body?.identityToken;
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 160) : "";
    if (typeof identityToken !== "string" || identityToken.length < 20) {
      res.status(400).json({ error: "Token da Apple ausente" });
      return;
    }
    try {
      const identity = await verifyAppleIdentityToken(identityToken, audience);
      if (await db.isIdentityRevoked(identity.openId)) {
        res.status(403).json({ error: "Esta conta foi encerrada" });
        return;
      }
      const existing = await db.getUserByOpenId(identity.openId);
      if (existing?.deletedAt) {
        res.status(403).json({ error: "Esta conta foi encerrada" });
        return;
      }
      if (!existing) {
        await db.upsertUser({
          openId: identity.openId,
          name: name || null,
          email: identity.email,
          loginMethod: "apple",
          role: "user",
          lastSignedIn: new Date(),
        });
      } else {
        await db.upsertUser({ openId: identity.openId, lastSignedIn: new Date() });
      }
      const user = await db.getUserByOpenId(identity.openId);
      if (!user) {
        res.status(500).json({ error: "Não foi possível criar a sessão" });
        return;
      }
      if (!ENV.appId || !ENV.cookieSecret) {
        res.status(503).json({ error: "Sign in with Apple ainda não está configurado neste servidor" });
        return;
      }
      const sessionToken = await sdk.createSessionToken(identity.openId, { name: user.name || name || "Cliente", expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch {
      console.error("[Apple] Sign in failed");
      res.status(401).json({ error: "Não foi possível validar o login da Apple" });
    }
  });
}
