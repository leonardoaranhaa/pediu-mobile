import crypto from "node:crypto";

const CURSOR_VERSION = 1 as const;
const CURSOR_PREFIX = "pc1_";

export type MarketplaceCursor = {
  version: typeof CURSOR_VERSION;
  filterKey: string;
  adId: number | null;
  createdAt: string;
  productId: number;
};

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(
    normalized + "=".repeat((4 - (normalized.length % 4)) % 4),
    "base64",
  ).toString("utf8");
}

export function marketplaceFilterKey(input: {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}): string {
  return JSON.stringify({
    category:
      input.category && input.category !== "Tudo"
        ? input.category.trim()
        : null,
    maxPrice: input.maxPrice ?? null,
    minPrice: input.minPrice ?? null,
    query: input.query?.trim().toLowerCase() || null,
  });
}

export function encodeMarketplaceCursor(input: {
  filterKey: string;
  adId: number | null;
  createdAt: Date;
  productId: number;
}): string {
  const payload: MarketplaceCursor = {
    version: CURSOR_VERSION,
    filterKey: input.filterKey,
    adId: input.adId,
    createdAt: input.createdAt.toISOString(),
    productId: input.productId,
  };
  return `${CURSOR_PREFIX}${encodeBase64Url(JSON.stringify(payload))}`;
}

export function decodeMarketplaceCursor(raw: string): MarketplaceCursor {
  if (!raw.startsWith(CURSOR_PREFIX) || raw.length > 2_000)
    throw new Error("Cursor de marketplace inválido");
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(raw.slice(CURSOR_PREFIX.length)));
  } catch {
    throw new Error("Cursor de marketplace inválido");
  }
  if (!parsed || typeof parsed !== "object")
    throw new Error("Cursor de marketplace inválido");
  const value = parsed as Partial<MarketplaceCursor>;
  const createdAt =
    typeof value.createdAt === "string" ? new Date(value.createdAt) : null;
  if (
    value.version !== CURSOR_VERSION ||
    typeof value.filterKey !== "string" ||
    typeof value.productId !== "number" ||
    !Number.isInteger(value.productId) ||
    value.productId <= 0 ||
    (value.adId !== null &&
      (typeof value.adId !== "number" ||
        !Number.isInteger(value.adId) ||
        value.adId <= 0)) ||
    !createdAt ||
    Number.isNaN(createdAt.getTime())
  ) {
    throw new Error("Cursor de marketplace inválido");
  }
  return {
    version: CURSOR_VERSION,
    filterKey: value.filterKey,
    adId: value.adId ?? null,
    createdAt: createdAt.toISOString(),
    productId: value.productId,
  };
}

export function cursorFingerprint(cursor: MarketplaceCursor): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(cursor))
    .digest("hex");
}
