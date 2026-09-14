import * as db from "./db";

export async function sendPushToUser(userId: number, title: string, body: string, data: Record<string, unknown> = {}) {
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
