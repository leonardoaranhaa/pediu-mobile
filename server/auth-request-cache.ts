export type CachedAuth = {
  sessionId: number;
  userId: number;
  expiresAt: number;
};

const cache = new Map<string, CachedAuth & { user: unknown }>();

export const AUTH_REQUEST_CACHE_MS = 45_000;

export function rememberAuth<T>(key: string, user: T, sessionId: number, now = Date.now()) {
  cache.set(key, {
    user,
    sessionId,
    userId: 0,
    expiresAt: now + AUTH_REQUEST_CACHE_MS,
  });
}

export function takeCachedAuth<T>(key: string, now = Date.now()): { user: T; sessionId: number } | null {
  const row = cache.get(key);
  if (!row || row.expiresAt <= now) {
    if (row) cache.delete(key);
    return null;
  }
  return { user: row.user as T, sessionId: row.sessionId };
}

export function forgetAuthSession(sessionId: number) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${sessionId}:`)) cache.delete(key);
  }
}

export function clearAuthRequestCache() {
  cache.clear();
}
