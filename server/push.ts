import * as db from "./db";

export type PushEnqueueResult = {
  sent: number;
  queued?: true;
  notificationId?: number;
  outboxId?: number;
};

export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<PushEnqueueResult> {
  const type = String(data.type ?? "general");
  const orderId = typeof data.orderId === "number" ? data.orderId : undefined;
  const actionPath =
    typeof data.actionPath === "string"
      ? data.actionPath
      : orderId
        ? type === "delivery"
          ? `/order/${orderId}/tracking-map`
          : `/order/track?orderId=${orderId}`
        : undefined;
  const payload = JSON.stringify({ title, body, data });
  const result = await db.createNotificationWithOutbox({
    notification: {
      userId,
      title,
      body,
      type,
      actionPath,
    },
    payload,
  });
  return {
    sent: 0,
    queued: true,
    notificationId: result.notificationId,
    outboxId: result.outboxId,
  };
}
