export const DEFAULT_ORDER_ACCEPT_TIMEOUT_MINUTES = 5;

export function orderAcceptTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const raw =
    env.ORDER_ACCEPT_TIMEOUT_MINUTES ?? env.INVENTORY_RESERVATION_TTL_MINUTES;
  const parsed = Number(raw);
  const minutes =
    Number.isFinite(parsed) && parsed >= 1
      ? Math.min(Math.trunc(parsed), 24 * 60)
      : DEFAULT_ORDER_ACCEPT_TIMEOUT_MINUTES;
  return minutes * 60_000;
}
