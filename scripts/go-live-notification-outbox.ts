import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for notification outbox smoke.");

async function main() {
  const mysql = await import("mysql2/promise");
  const db = await import("../server/db");
  const worker = await import("../server/notification-outbox-worker");
  const connection = await mysql.createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const openId = `ci-notification-outbox-${runId}`;
  let userId: number | undefined;
  let notificationIds: number[] = [];
  let requestCount = 0;
  const pushMock = http.createServer((request, response) => {
    requestCount += 1;
    response.statusCode = requestCount === 1 ? 503 : 200;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ data: [{ status: "ok" }] }));
  });
  await new Promise<void>((resolve) =>
    pushMock.listen(0, "127.0.0.1", resolve),
  );
  const address = pushMock.address();
  if (!address || typeof address === "string")
    throw new Error("push mock did not bind");
  process.env.PUSH_SERVICE_URL = `http://127.0.0.1:${address.port}/push`;

  try {
    const [userResult] = await connection.execute(
      "INSERT INTO users (openId, name, email, loginMethod, role) VALUES (?, ?, ?, ?, ?)",
      [openId, "Usuário Outbox E2E", `${openId}@example.test`, "e2e", "user"],
    );
    userId = Number((userResult as any).insertId);
    assert.ok(userId > 0);
    await connection.execute(
      "INSERT INTO pediu_notification_preferences (userId, orderUpdates, supportMessages, promotions, pushEnabled) VALUES (?, 1, 1, 1, 1)",
      [userId],
    );
    await connection.execute(
      "INSERT INTO pediu_push_tokens (userId, token, platform) VALUES (?, ?, 'web')",
      [userId, `ExponentPushToken[${runId}]`],
    );

    const first = await db.createNotificationWithOutbox({
      notification: {
        userId,
        title: "Outbox E2E",
        body: "Primeira tentativa",
        type: "order",
      },
      payload: JSON.stringify({
        title: "Outbox E2E",
        body: "Primeira tentativa",
        data: { type: "order", orderId: 901 },
      }),
    });
    notificationIds.push(first.notificationId);
    const firstAttempt = await worker.processOneNotificationOutboxItem();
    assert.equal(firstAttempt, true);
    const [failedRows] = await connection.execute(
      "SELECT status, attemptCount, lastError FROM pediu_notification_outbox WHERE id = ?",
      [first.outboxId],
    );
    assert.deepEqual((failedRows as any[])[0], {
      status: "pending",
      attemptCount: 1,
      lastError: "push_service_503",
    });
    await connection.execute(
      "UPDATE pediu_notification_outbox SET availableAt = NOW() WHERE id = ?",
      [first.outboxId],
    );
    const secondAttempt = await worker.processOneNotificationOutboxItem();
    assert.equal(secondAttempt, true);
    const [sentRows] = await connection.execute(
      "SELECT status, attemptCount, sentAt FROM pediu_notification_outbox WHERE id = ?",
      [first.outboxId],
    );
    assert.equal((sentRows as any[])[0]?.status, "sent");
    assert.equal(Number((sentRows as any[])[0]?.attemptCount), 2);
    assert.ok((sentRows as any[])[0]?.sentAt);
    assert.equal(requestCount, 2);

    await connection.execute(
      "UPDATE pediu_notification_preferences SET pushEnabled = 0 WHERE userId = ?",
      [userId],
    );
    const skipped = await db.createNotificationWithOutbox({
      notification: {
        userId,
        title: "Preferência",
        body: "Não enviar push",
        type: "order",
      },
      payload: JSON.stringify({
        title: "Preferência",
        body: "Não enviar push",
        data: { type: "order" },
      }),
    });
    notificationIds.push(skipped.notificationId);
    await worker.processOneNotificationOutboxItem();
    const [skippedRows] = await connection.execute(
      "SELECT status, attemptCount, lastError FROM pediu_notification_outbox WHERE id = ?",
      [skipped.outboxId],
    );
    assert.deepEqual((skippedRows as any[])[0], {
      status: "skipped",
      attemptCount: 1,
      lastError: "disabled_by_preference",
    });

    const [outboxRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM pediu_notification_outbox WHERE notificationId IN (?, ?) AND status IN ('sent', 'skipped')",
      notificationIds,
    );
    assert.equal(Number((outboxRows as any[])[0]?.count), 2);
    console.log(
      JSON.stringify({
        ok: true,
        atomicEnqueue: true,
        retryAfterFailure: true,
        deliveredByMock: true,
        preferenceSkip: true,
        requests: requestCount,
      }),
    );
  } finally {
    if (notificationIds.length > 0) {
      await connection.execute(
        `DELETE FROM pediu_notification_outbox WHERE notificationId IN (${notificationIds.map(() => "?").join(",")})`,
        notificationIds,
      );
      await connection.execute(
        `DELETE FROM pediu_notifications WHERE id IN (${notificationIds.map(() => "?").join(",")})`,
        notificationIds,
      );
    }
    if (userId) {
      await connection.execute(
        "DELETE FROM pediu_push_tokens WHERE userId = ?",
        [userId],
      );
      await connection.execute(
        "DELETE FROM pediu_notification_preferences WHERE userId = ?",
        [userId],
      );
      await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
    }
    await connection.end();
    await new Promise<void>((resolve) => pushMock.close(() => resolve()));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      `[go-live:notification-outbox] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
