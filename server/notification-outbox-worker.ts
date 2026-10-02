import * as db from "./db";
import {
  boundedNotificationOutboxInterval,
  DEFAULT_NOTIFICATION_OUTBOX_INTERVAL_MS,
} from "./domain/notification-outbox";

const DEFAULT_PUSH_SERVICE_URL = "https://exp.host/--/api/v2/push/send";

function configuredInterval(): number {
  const parsed = Number(process.env.NOTIFICATION_OUTBOX_INTERVAL_MS);
  return boundedNotificationOutboxInterval(
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_NOTIFICATION_OUTBOX_INTERVAL_MS,
  );
}

function preferenceEnabled(
  type: string,
  preferences: {
    orderUpdates: number;
    supportMessages: number;
    promotions: number;
    pushEnabled: number;
  },
) {
  if (!preferences.pushEnabled) return false;
  if (type === "support") return Boolean(preferences.supportMessages);
  if (type === "promotion") return Boolean(preferences.promotions);
  return Boolean(preferences.orderUpdates);
}

export async function processOneNotificationOutboxItem(): Promise<boolean> {
  const item = await db.claimNotificationOutbox();
  if (!item) return false;
  try {
    const payload = JSON.parse(item.payload) as {
      title?: unknown;
      body?: unknown;
      data?: Record<string, unknown>;
    };
    const title = typeof payload.title === "string" ? payload.title : "Pediu";
    const body =
      typeof payload.body === "string"
        ? payload.body
        : "Você tem uma atualização.";
    const data = payload.data ?? {};
    const type = typeof data.type === "string" ? data.type : "general";
    const preferences = await db.getNotificationPreferences(item.userId);
    if (!preferenceEnabled(type, preferences)) {
      await db.markNotificationOutboxSkipped(item.id, "disabled_by_preference");
      return true;
    }
    const tokens = await db.listPushTokensForUser(item.userId);
    if (!tokens.length) {
      throw new Error("no_push_token");
    }
    const response = await fetch(
      process.env.PUSH_SERVICE_URL?.trim() || DEFAULT_PUSH_SERVICE_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          tokens.map((entry) => ({
            to: entry.token,
            sound: "default",
            title,
            body,
            data,
          })),
        ),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error(`push_service_${response.status}`);
    const result = (await response.json().catch(() => null)) as {
      data?: Array<{ status?: string; message?: string }>;
    } | null;
    const ticketError = result?.data?.find(
      (ticket) => ticket.status === "error",
    );
    if (ticketError) {
      throw new Error(`push_ticket_error:${ticketError.message ?? "unknown"}`);
    }
    await db.markNotificationOutboxSent(item.id);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.markNotificationOutboxFailed(item, message);
    return true;
  }
}

export function startNotificationOutboxWorker(): () => void {
  const intervalMs = configuredInterval();
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processOneNotificationOutboxItem();
    } catch (error) {
      console.error("[Notifications] Outbox worker failed", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  void run();
  return () => clearInterval(timer);
}
