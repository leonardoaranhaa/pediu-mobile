import { sql } from "drizzle-orm";

import { getDb } from "../db";
import { withTimeout } from "./security";

export const REQUIRED_READINESS_TABLES = [
  "users",
  "pediu_stores",
  "pediu_orders",
  "pediu_payments",
  "pediu_payment_transactions",
  "pediu_notifications",
  "pediu_push_tokens",
  "pediu_notification_outbox",
  "pediu_rate_limit_buckets",
  "pediu_financial_ledger",
  "pediu_webhook_events",
  "pediu_refunds",
  "pediu_payment_reconciliation_runs",
  "pediu_payment_reconciliation_items",
] as const;

export type ReadinessCheckResult = {
  status: "pass" | "fail";
  code: "database" | "migrations" | "tables";
};

export type ReadinessResult = {
  ready: boolean;
  checks: ReadinessCheckResult[];
};

type DatabaseExecutor = {
  execute: (query: unknown) => Promise<unknown>;
};

type ReadinessOptions = {
  getDatabase?: () => Promise<DatabaseExecutor | null | undefined>;
  timeoutMs?: number;
};

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    const [first] = result;
    if (Array.isArray(first)) return first as Array<Record<string, unknown>>;
    if (first && typeof first === "object" && "rows" in first) {
      const rows = (first as { rows?: unknown }).rows;
      if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
    }
  }
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
  }
  return [];
}

function numericCount(result: unknown): number {
  const value = rowsFromResult(result)[0]?.count;
  return Number(value ?? 0);
}

function boundedTimeout(timeoutMs: number | undefined): number {
  const configured = Number(
    timeoutMs ?? process.env.READINESS_DB_TIMEOUT_MS ?? 1_000,
  );
  if (!Number.isFinite(configured)) return 1_000;
  return Math.min(Math.max(Math.trunc(configured), 100), 5_000);
}

export async function probeReadiness(
  options: ReadinessOptions = {},
): Promise<ReadinessResult> {
  const timeoutMs = boundedTimeout(options.timeoutMs);
  const databaseGetter =
    options.getDatabase ?? (getDb as ReadinessOptions["getDatabase"]);
  const checks: ReadinessCheckResult[] = [];

  let database: DatabaseExecutor | null | undefined;
  try {
    database = await withTimeout(
      databaseGetter?.() ?? Promise.resolve(undefined),
      timeoutMs,
      "readiness database connection timeout",
    );
    if (!database) throw new Error("database unavailable");

    await withTimeout(
      database.execute(sql`SELECT 1 AS ok`),
      timeoutMs,
      "readiness database probe timeout",
    );
    checks.push({ status: "pass", code: "database" });
  } catch {
    checks.push({ status: "fail", code: "database" });
    checks.push({ status: "fail", code: "migrations" });
    checks.push({ status: "fail", code: "tables" });
    return { ready: false, checks };
  }

  try {
    const migrationResult = await withTimeout(
      database.execute(sql`SELECT COUNT(*) AS count FROM __drizzle_migrations`),
      timeoutMs,
      "readiness migrations probe timeout",
    );
    checks.push({
      status: numericCount(migrationResult) > 0 ? "pass" : "fail",
      code: "migrations",
    });
  } catch {
    checks.push({ status: "fail", code: "migrations" });
  }

  try {
    const tableList = REQUIRED_READINESS_TABLES.map(
      (table) => `'${table}'`,
    ).join(", ");
    const tableResult = await withTimeout(
      database.execute(
        sql.raw(
          `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${tableList})`,
        ),
      ),
      timeoutMs,
      "readiness tables probe timeout",
    );
    checks.push({
      status:
        numericCount(tableResult) === REQUIRED_READINESS_TABLES.length
          ? "pass"
          : "fail",
      code: "tables",
    });
  } catch {
    checks.push({ status: "fail", code: "tables" });
  }

  return {
    ready: checks.every((check) => check.status === "pass"),
    checks,
  };
}
