export function normalizeIdempotencyKey(value: string): string {
  const key = value.trim();
  if (!key || key.length > 160) throw new Error("Invalid idempotency key");
  return key;
}
