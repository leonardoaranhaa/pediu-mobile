import { randomBytes } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME, SESSION_TTL_MS } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import * as db from "../db";
import {
  getActiveAuthSession,
  hashSessionSecret,
  insertAuthSession,
  revokeAuthSession,
  rotateAuthSession,
  sessionSecretMatches,
  touchAuthSession,
} from "../auth-sessions";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

type SessionClaims = {
  sid: number;
  openId: string;
  name: string;
  jti: string;
};

export type AuthenticatedUser = User & { sessionId: number };

class SDKServer {
  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  private readToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      return authHeader.slice("Bearer ".length).trim();
    }
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    return cookies[COOKIE_NAME];
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {},
  ): Promise<string> {
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Cannot create a session for an unknown user");
    const expiresInMs = options.expiresInMs ?? SESSION_TTL_MS;
    const jti = randomBytes(32).toString("base64url");
    const session = await insertAuthSession({
      userId: user.id,
      tokenHash: hashSessionSecret(jti),
      expiresAt: new Date(Date.now() + expiresInMs),
    });
    return this.signSession(
      {
        sid: session.id,
        openId,
        name: options.name || user.name || "Pediu",
        jti,
      },
      expiresInMs,
    );
  }

  private async signSession(payload: SessionClaims, expiresInMs: number) {
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
    return new SignJWT({
      sid: payload.sid,
      openId: payload.openId,
      name: payload.name,
      jti: payload.jti,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  private async readClaims(token: string | undefined | null): Promise<SessionClaims | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const sid = Number(payload.sid);
      const { openId, name, jti } = payload as Record<string, unknown>;
      if (
        !Number.isInteger(sid) ||
        sid <= 0 ||
        !isNonEmptyString(openId) ||
        !isNonEmptyString(jti)
      ) {
        return null;
      }
      return {
        sid,
        openId,
        name: isNonEmptyString(name) ? name : "",
        jti,
      };
    } catch {
      return null;
    }
  }

  private async resolveClaims(token: string | undefined | null) {
    const claims = await this.readClaims(token);
    if (!claims) return null;
    const session = await getActiveAuthSession(claims.sid);
    if (
      !session ||
      !sessionSecretMatches(session.tokenHash, claims.jti)
    ) {
      return null;
    }
    const user = await db.getUserByOpenId(claims.openId);
    if (!user || user.id !== session.userId) return null;
    return { claims, session, user };
  }

  async refreshSession(token: string | undefined | null) {
    const resolved = await this.resolveClaims(token);
    if (!resolved) return null;
    const jti = randomBytes(32).toString("base64url");
    await rotateAuthSession({
      id: resolved.session.id,
      tokenHash: hashSessionSecret(jti),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    const next = await this.signSession(
      {
        sid: resolved.session.id,
        openId: resolved.user.openId,
        name: resolved.user.name || "Pediu",
        jti,
      },
      SESSION_TTL_MS,
    );
    return {
      token: next,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      user: resolved.user,
    };
  }

  async revokeToken(token: string | undefined | null) {
    const claims = await this.readClaims(token);
    if (!claims) return;
    const session = await getActiveAuthSession(claims.sid);
    if (!session || !sessionSecretMatches(session.tokenHash, claims.jti)) return;
    await revokeAuthSession(session.id);
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const token = this.readToken(req);
    const resolved = await this.resolveClaims(token);
    if (!resolved) throw ForbiddenError("Invalid session");
    await touchAuthSession(resolved.session.id);
    await db.upsertUser({
      openId: resolved.user.openId,
      lastSignedIn: new Date(),
    });
    return { ...resolved.user, sessionId: resolved.session.id };
  }
}

export const sdk = new SDKServer();
