export function normalizeIdempotencyKey(value: string): string {
  const key = value.trim();
  if (!key || key.length > 160) throw new Error("Invalid idempotency key");
  return key;
}

export function isUniqueConstraintError(error: unknown): boolean {
  const seen = new Set<unknown>();
  const visit = (candidate: unknown): boolean => {
    if (!candidate || seen.has(candidate)) return false;
    seen.add(candidate);
    const value = candidate as {
      code?: unknown;
      errno?: unknown;
      message?: unknown;
      cause?: unknown;
      originalError?: unknown;
      driverError?: unknown;
    };
    const code = String(value.code ?? "");
    const errno = String(value.errno ?? "");
    const message = String(value.message ?? candidate);
    if (
      code === "ER_DUP_ENTRY" ||
      code === "ER_DUP_KEY" ||
      errno === "1062" ||
      /duplicate entry|unique constraint|pediu_orders_idempotency_unique/i.test(
        message,
      )
    ) {
      return true;
    }
    return (
      visit(value.cause) ||
      visit(value.originalError) ||
      visit(value.driverError)
    );
  };
  return visit(error);
}
