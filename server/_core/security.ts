import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { COOKIE_NAME } from "../../shared/const";

const DEFAULT_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function configuredOrigins() {
  const values = [
    ...DEFAULT_ORIGINS,
    process.env.EXPO_WEB_PREVIEW_URL,
    process.env.EXPO_PACKAGER_PROXY_URL,
    ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
  ];
  return new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)));
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return Boolean(origin && configuredOrigins().has(origin));
}

export function requestUsesBearer(req: Request): boolean {
  const header = req.headers.authorization ?? req.headers.Authorization;
  return typeof header === "string" && header.startsWith("Bearer ") && header.length > 15;
}

export function requestHasAllowedOrigin(req: Request): boolean {
  return isAllowedOrigin(typeof req.headers.origin === "string" ? req.headers.origin : undefined);
}

export function isUnsafeMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

const PUBLIC_PASSWORD_AUTH = new Set([
  "/api/trpc/auth.signup",
  "/api/trpc/auth.login",
  "/api/trpc/auth.resetPassword",
  "/api/trpc/auth.refresh",
]);

/** Mobile login has no browser Origin and no session cookie yet. */
export function isPublicPasswordAuth(req: {
  originalUrl?: string;
  url?: string;
  baseUrl?: string;
  path: string;
}): boolean {
  return procedureNames(req).some((path) => PUBLIC_PASSWORD_AUTH.has(`/api/trpc/${path}`));
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join("; ") : value;
}

function procedureNames(req: {
  originalUrl?: string;
  url?: string;
  baseUrl?: string;
  path: string;
}) {
  const candidates = [req.originalUrl, req.url, `${req.baseUrl ?? ""}${req.path}`, req.path]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.split("?")[0]);
  const names = new Set<string>();
  for (const candidate of candidates) {
    const marker = "/api/trpc/";
    const index = candidate.indexOf(marker);
    const raw = index >= 0 ? candidate.slice(index + marker.length) : candidate.replace(/^\//, "");
    for (const name of raw.split(",")) {
      if (name) names.add(name);
    }
  }
  return [...names];
}

export function requestHasSessionCookie(req: { headers?: { cookie?: string | string[] } }): boolean {
  const cookies = parseCookieHeader(headerValue(req.headers?.cookie) ?? "");
  return Boolean(cookies[COOKIE_NAME]?.trim());
}

/** Native guest chat has no Origin and no session cookie. A cookie still needs CSRF checks. */
export function isGuestAssistantChat(req: {
  originalUrl?: string;
  url?: string;
  baseUrl?: string;
  path: string;
}): boolean {
  const names = procedureNames(req);
  return names.length > 0 && names.every((name) => name === "pediu.assistant.chat");
}

export function isTrpcMutationAllowed(req: {
  method: string;
  headers?: {
    cookie?: string | string[] | undefined;
    authorization?: string | string[] | undefined;
    Authorization?: string | string[] | undefined;
    origin?: string | string[] | undefined;
  };
  originalUrl?: string;
  url?: string;
  baseUrl?: string;
  path: string;
}): boolean {
  if (!isUnsafeMethod(req.method)) return true;
  if (requestUsesBearer(req as Request)) return true;
  if (requestHasAllowedOrigin(req as Request)) return true;
  if (isPublicPasswordAuth(req)) return true;
  return isGuestAssistantChat(req) && !requestHasSessionCookie(req);
}

type RateLimitState = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitState>();
const concurrencyBuckets = new Map<string, number>();

export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function rateLimitKey(req: Request, scope: string, identity?: string | number): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return `${scope}:${identity ?? "anonymous"}:${ip}`;
}

export function resetRateLimitBucketsForTests() {
  rateLimitBuckets.clear();
  concurrencyBuckets.clear();
}

export async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withConcurrencyLimit<T>(key: string, limit: number, operation: () => Promise<T>): Promise<T> {
  const active = concurrencyBuckets.get(key) ?? 0;
  if (active >= limit) throw new Error("Serviço temporariamente ocupado. Tente novamente em instantes.");
  concurrencyBuckets.set(key, active + 1);
  try {
    return await operation();
  } finally {
    const remaining = (concurrencyBuckets.get(key) ?? 1) - 1;
    if (remaining <= 0) concurrencyBuckets.delete(key);
    else concurrencyBuckets.set(key, remaining);
  }
}
