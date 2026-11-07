import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, SESSION_TTL_MS } from "../../shared/const";
import { listAccountRoles } from "../db";
import { rolesFromLegacy, type AccountRole } from "../../shared/account-roles";
import { toPublicAccount } from "../password-auth";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function readBearer(req: Request) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim();
}

async function buildUserResponse(user: Awaited<ReturnType<typeof sdk.authenticateRequest>>) {
  const safe = toPublicAccount(user);
  const legacyRole = safe.role ?? "user";
  const roles: AccountRole[] = safe.id
    ? await listAccountRoles(safe.id, legacyRole)
    : rolesFromLegacy(legacyRole);
  return {
    ...safe,
    role: legacyRole,
    roles,
    lastSignedIn: (safe.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const cookies = parseCookieHeader(req.headers.cookie ?? "");
      await sdk.revokeToken(readBearer(req) || cookies[COOKIE_NAME]);
    } catch (error) {
      console.error("[Auth] Logout revoke failed", error);
    }
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: await buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const token = readBearer(req);
      if (!token) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const user = await sdk.authenticateRequest(req);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_TTL_MS });
      res.json({ success: true, user: await buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
