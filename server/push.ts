import * as db from "./db";

export async function sendPushToUser(userId: number, title: string, body: string, data: Record<string, unknown> = {}) {
  const type = String(data.type ?? "general");
  const preferences = await db.getNotificationPreferences(userId);
  const orderId = typeof data.orderId === "number" ? data.orderId : undefined;
  const actionPath = typeof data.actionPath === "string" ? data.actionPath : orderId ? type === "delivery" ? `/order/${orderId}/tracking-map` : `/order/track?orderId=${orderId}` : undefined;
  await db.createNotification({ userId, title, body, type, actionPath });
  const preferenceEnabled = type === "support" ? preferences.supportMessages : type === "promotion" ? preferences.promotions : preferences.orderUpdates;
  if (!preferences.pushEnabled || !preferenceEnabled) return { sent: 0 };
  const tokens = await db.listPushTokensForUser(userId);
  if (!tokens.length) return { sent: 0 };
  const messages = tokens.map((entry) => ({ to: entry.token, sound: "default", title, body, data }));
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Expo Push Service returned ${response.status}`);
  return { sent: messages.length };
}
