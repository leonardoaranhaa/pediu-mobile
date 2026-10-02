import { describe, expect, it } from "vitest";

import {
  boundedNotificationOutboxInterval,
  DEFAULT_NOTIFICATION_OUTBOX_INTERVAL_MS,
  isNotificationLockStale,
  MAX_NOTIFICATION_OUTBOX_ATTEMPTS,
  nextNotificationAttemptAt,
  NOTIFICATION_OUTBOX_LOCK_TIMEOUT_MS,
  shouldRetryNotification,
} from "../server/domain/notification-outbox";

describe("notification outbox policy", () => {
  it("bounds worker interval and keeps the safe default", () => {
    expect(boundedNotificationOutboxInterval(Number.NaN)).toBe(
      DEFAULT_NOTIFICATION_OUTBOX_INTERVAL_MS,
    );
    expect(boundedNotificationOutboxInterval(1)).toBe(5_000);
    expect(boundedNotificationOutboxInterval(999_999)).toBe(300_000);
  });

  it("uses increasing bounded retry delays", () => {
    const now = new Date("2026-10-01T12:00:00.000Z");
    expect(nextNotificationAttemptAt(now, 1).getTime() - now.getTime()).toBe(
      30_000,
    );
    expect(nextNotificationAttemptAt(now, 2).getTime() - now.getTime()).toBe(
      120_000,
    );
    expect(nextNotificationAttemptAt(now, 99).getTime() - now.getTime()).toBe(
      900_000,
    );
  });

  it("stops retrying at the terminal attempt and detects stale locks", () => {
    expect(shouldRetryNotification(MAX_NOTIFICATION_OUTBOX_ATTEMPTS - 1)).toBe(
      true,
    );
    expect(shouldRetryNotification(MAX_NOTIFICATION_OUTBOX_ATTEMPTS)).toBe(
      false,
    );
    const now = new Date("2026-10-01T12:00:00.000Z");
    expect(
      isNotificationLockStale(
        new Date(now.getTime() - NOTIFICATION_OUTBOX_LOCK_TIMEOUT_MS),
        now,
      ),
    ).toBe(true);
    expect(isNotificationLockStale(undefined, now)).toBe(false);
  });
});
