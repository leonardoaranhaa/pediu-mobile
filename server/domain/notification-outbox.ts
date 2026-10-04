export const DEFAULT_NOTIFICATION_OUTBOX_INTERVAL_MS = 15_000;
export const MIN_NOTIFICATION_OUTBOX_INTERVAL_MS = 5_000;
export const MAX_NOTIFICATION_OUTBOX_INTERVAL_MS = 300_000;
export const MAX_NOTIFICATION_OUTBOX_ATTEMPTS = 5;
export const NOTIFICATION_OUTBOX_LOCK_TIMEOUT_MS = 120_000;

const RETRY_DELAYS_MS = [30_000, 120_000, 300_000, 900_000] as const;

export type NotificationOutboxStatus =
  | "pending"
  | "processing"
  | "sent"
  | "skipped"
  | "failed";

export function boundedNotificationOutboxInterval(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_NOTIFICATION_OUTBOX_INTERVAL_MS;
  return Math.min(
    Math.max(Math.trunc(value), MIN_NOTIFICATION_OUTBOX_INTERVAL_MS),
    MAX_NOTIFICATION_OUTBOX_INTERVAL_MS,
  );
}

export function nextNotificationAttemptAt(
  now: Date,
  attemptCount: number,
): Date {
  const index = Math.min(
    Math.max(Math.trunc(attemptCount) - 1, 0),
    RETRY_DELAYS_MS.length - 1,
  );
  return new Date(now.getTime() + RETRY_DELAYS_MS[index]);
}

export function shouldRetryNotification(attemptCount: number): boolean {
  return (
    Number.isInteger(attemptCount) &&
    attemptCount < MAX_NOTIFICATION_OUTBOX_ATTEMPTS
  );
}

export function isNotificationLockStale(
  lockedAt: Date | null | undefined,
  now: Date,
): boolean {
  return Boolean(
    lockedAt &&
    now.getTime() - lockedAt.getTime() >= NOTIFICATION_OUTBOX_LOCK_TIMEOUT_MS,
  );
}
