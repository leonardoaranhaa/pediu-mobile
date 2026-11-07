import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!databaseUrl)
  throw new Error("DATABASE_URL is required for notification outbox smoke.");

async function main() {
  const { createConnection } = await import("./pg-client");
  const db = await import("../server/db");
  const worker = await import("../server/notification-outbox-worker");
  const connection = await createConnection(databaseUrl);
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const openId = `ci-notification-outbox-${runId}`;
  let userId: number | undefined;
  let notificationIds: number[] = [];
  const pushRequests = { count: 0 };
  const pushMock = http.createServer((request, response) => {
    pushRequests.count += 1;
    response.statusCode = pushRequests.count === 1 ? 503 : 200;
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

  const parkedIds = await parkOtherOutboxRows(connection);
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
    const firstAttempt = await processThisOutboxItem(
      connection,
      worker,
      first.outboxId,
      pushRequests,
    );
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
    const secondAttempt = await processThisOutboxItem(
      connection,
      worker,
      first.outboxId,
      pushRequests,
    );
    assert.equal(secondAttempt, true);
    const [sentRows] = await connection.execute(
      "SELECT status, attemptCount, sentAt FROM pediu_notification_outbox WHERE id = ?",
      [first.outboxId],
    );
    assert.equal((sentRows as any[])[0]?.status, "sent");
    assert.equal(Number((sentRows as any[])[0]?.attemptCount), 2);
    assert.ok((sentRows as any[])[0]?.sentAt);
    assert.equal(pushRequests.count, 2);

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
    await processThisOutboxItem(
      connection,
      worker,
      skipped.outboxId,
      pushRequests,
    );
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
        requests: pushRequests.count,
      }),
    );
  } finally {
    if (parkedIds.length) {
      await connection.query(
        `UPDATE pediu_notification_outbox SET availableAt = NOW() WHERE id IN (${parkedIds.map(() => "?").join(",")})`,
        parkedIds,
      );
    }
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

type OutboxRow = {
  status?: string;
  attemptCount?: number | string;
  lastError?: string | null;
  availableAt?: Date | string | null;
};

async function parkOtherOutboxRows(connection: {
  execute: (statement: string, params?: unknown[]) => Promise<any>;
  query: (statement: string, params?: unknown[]) => Promise<any>;
}) {
  const [rows] = await connection.execute(
    "SELECT id FROM pediu_notification_outbox WHERE status = 'pending'",
  );
  const ids = (rows as Array<{ id?: number }>)
    .map((row) => Number(row.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) return [] as number[];
  await connection.query(
    `UPDATE pediu_notification_outbox SET availableAt = NOW() + INTERVAL '1 day' WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  return ids;
}

async function readOutbox(
  connection: {
    execute: (statement: string, params?: unknown[]) => Promise<any>;
  },
  outboxId: number,
) {
  const [rows] = await connection.execute(
    "SELECT status, attemptCount, lastError, availableAt FROM pediu_notification_outbox WHERE id = ?",
    [outboxId],
  );
  return (rows as OutboxRow[])[0];
}

async function waitForOutbox(
  connection: {
    execute: (statement: string, params?: unknown[]) => Promise<any>;
  },
  outboxId: number,
) {
  let row = await readOutbox(connection, outboxId);
  for (let attempt = 0; attempt < 20 && row?.status === "processing"; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    row = await readOutbox(connection, outboxId);
  }
  return row;
}

async function processThisOutboxItem(
  connection: {
    execute: (statement: string, params?: unknown[]) => Promise<any>;
    query: (statement: string, params?: unknown[]) => Promise<any>;
  },
  worker: {
    processOneNotificationOutboxItem: () => Promise<boolean>;
  },
  outboxId: number,
  pushRequests: { count: number },
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const before = await readOutbox(connection, outboxId);
    const seen = pushRequests.count;
    await worker.processOneNotificationOutboxItem();
    const after = await waitForOutbox(connection, outboxId);
    if (!after || !before) return false;
    const changed =
      after.status !== before.status ||
      Number(after.attemptCount) !== Number(before.attemptCount) ||
      (after.lastError ?? null) !== (before.lastError ?? null);
    if (
      changed &&
      (pushRequests.count > seen || after.status === "skipped")
    ) {
      return true;
    }
    if (changed) {
      await connection.execute(
        "UPDATE pediu_notification_outbox SET status = 'pending', attemptCount = ?, lastError = ?, lockedAt = NULL, sentAt = NULL, availableAt = NOW() WHERE id = ?",
        [Number(before.attemptCount) || 0, before.lastError ?? null, outboxId],
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      `[go-live:notification-outbox] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
