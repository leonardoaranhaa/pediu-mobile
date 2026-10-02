import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { decodeOAuthState, sdk } from "./sdk";

const OAUTH_REPLAY_TTL_MS = 10 * 60 * 1000;
const OAUTH_REPLAY_MAX_ENTRIES = 4096;
const exchangedCodes = new Map<string, number>();

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function pruneExchangedCodes(now = Date.now()) {
  for (const [key, expiresAt] of exchangedCodes) {
    if (expiresAt <= now) exchangedCodes.delete(key);
  }
  while (exchangedCodes.size >= OAUTH_REPLAY_MAX_ENTRIES) {
    const oldest = exchangedCodes.keys().next().value;
    if (!oldest) break;
    exchangedCodes.delete(oldest);
  }
}

function claimAuthorizationCode(code: string): boolean {
  const now = Date.now();
  pruneExchangedCodes(now);
  const key = createHash("sha256").update(code).digest("hex");
  if (exchangedCodes.has(key)) return false;
  exchangedCodes.set(key, now + OAUTH_REPLAY_TTL_MS);
  return true;
}

function releaseAuthorizationCode(code: string) {
  const key = createHash("sha256").update(code).digest("hex");
  exchangedCodes.delete(key);
}

function validateCallbackParams(
  code: string | undefined,
  state: string | undefined,
): "missing" | "state" | null {
  if (!code || !state || code.length > 2048 || state.length > 4096)
    return "missing";
  try {
    decodeOAuthState(state);
  } catch {
    return "state";
  }
  return null;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        id?: number | null;
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        role?: "user" | "merchant" | "courier" | "admin";
        themePreference?: "classic" | "ocean" | "sunset";
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    role: user?.role ?? "user",
    themePreference: user?.themePreference ?? "classic",
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const validationError = validateCallbackParams(code, state);

    if (validationError === "missing") {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    if (validationError === "state") {
      res.status(400).json({ error: "invalid OAuth state" });
      return;
    }
    if (!claimAuthorizationCode(code!)) {
      res.status(409).json({ error: "OAuth authorization code already used" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code!, state!);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch {
      releaseAuthorizationCode(code!);
      console.error("[OAuth] Callback failed");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const validationError = validateCallbackParams(code, state);

    if (validationError === "missing") {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    if (validationError === "state") {
      res.status(400).json({ error: "invalid OAuth state" });
      return;
    }
    if (!claimAuthorizationCode(code!)) {
      res.status(409).json({ error: "OAuth authorization code already used" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code!, state!);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch {
      releaseAuthorizationCode(code!);
      console.error("[OAuth] Mobile exchange failed");
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      console.error("[Auth] /api/auth/me failed");
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);

      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      console.error("[Auth] /api/auth/session failed");
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
