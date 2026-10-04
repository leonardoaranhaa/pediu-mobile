import assert from "node:assert/strict";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const sourceUrl = process.env.DATABASE_URL?.trim() ?? "";
const required = process.env.BACKUP_RESTORE_REQUIRED === "1";
const enabled = required || process.env.BACKUP_RESTORE_RUN === "1";

function parseDatabaseUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "mysql:")
    throw new Error("Only mysql:// DATABASE_URL is supported");
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database || !/^[A-Za-z0-9_]+$/.test(database))
    throw new Error(
      "Database name must contain only letters, numbers and underscores",
    );
  return {
    host: parsed.hostname || "127.0.0.1",
    port: parsed.port || "3306",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

function safeDatabaseName(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value))
    throw new Error("Backup target database name is invalid");
  return value;
}

function mysqlArgs(
  config: ReturnType<typeof parseDatabaseUrl>,
  extra: string[] = [],
) {
  return [
    "--protocol=tcp",
    "-h",
    config.host,
    "-P",
    config.port,
    "-u",
    config.user,
    ...extra,
  ];
}

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  inputFd?: number,
) {
  const result = spawnSync(command, args, {
    env,
    stdio:
      inputFd === undefined
        ? ["ignore", "pipe", "pipe"]
        : [inputFd, "pipe", "pipe"],
    encoding: "utf8",
  });
  if (result.error || result.status !== 0)
    throw new Error(`${command} failed during backup/restore`);
  return result.stdout.trim();
}

function runDumpToFile(
  config: ReturnType<typeof parseDatabaseUrl>,
  backupPath: string,
) {
  const fd = openSync(backupPath, "w");
  const result = spawnSync(
    "mysqldump",
    mysqlArgs(config, [
      "--single-transaction",
      "--quick",
      "--routines",
      "--events",
      "--triggers",
      "--no-create-db",
      "--skip-add-drop-table",
      config.database,
    ]),
    {
      env: { ...process.env, MYSQL_PWD: config.password },
      stdio: ["ignore", fd, "pipe"],
      encoding: "utf8",
    },
  );
  closeSync(fd);
  if (result.error || result.status !== 0)
    throw new Error("mysqldump failed during backup/restore");
}

function query(
  config: ReturnType<typeof parseDatabaseUrl>,
  sql: string,
  database = config.database,
) {
  return run(
    "mysql",
    mysqlArgs(config, ["-N", "-B", "-D", database, "-e", sql]),
    { ...process.env, MYSQL_PWD: config.password },
  );
}

async function main() {
  if (!enabled) {
    console.log(
      "Go-Live backup/restore smoke skipped: set BACKUP_RESTORE_RUN=1 to execute.",
    );
    return;
  }
  if (!sourceUrl)
    throw new Error("DATABASE_URL is required for the backup/restore smoke");
  const source = parseDatabaseUrl(sourceUrl);
  const admin = parseDatabaseUrl(
    process.env.BACKUP_RESTORE_ADMIN_DATABASE_URL?.trim() || sourceUrl,
  );
  const targetName = safeDatabaseName(
    process.env.BACKUP_RESTORE_TARGET_DATABASE?.trim() ||
      `${source.database}_restore_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
  );
  assert.notEqual(
    targetName,
    source.database,
    "Restore target must differ from source database",
  );
  const backupPath = join(tmpdir(), `pediu-backup-${crypto.randomUUID()}.sql`);
  const quotedTarget = `\`${targetName}\``;
  const criticalTables = [
    "users",
    "pediu_stores",
    "pediu_orders",
    "pediu_payments",
    "pediu_delivery_assignments",
    "pediu_courier_profiles",
    "pediu_delivery_offers",
  ];

  try {
    query(admin, `DROP DATABASE IF EXISTS ${quotedTarget}`, admin.database);
    query(
      admin,
      `CREATE DATABASE ${quotedTarget} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      admin.database,
    );
    runDumpToFile(source, backupPath);
    assert.ok(existsSync(backupPath), "backup artifact was not created");
    assert.ok(readFileSync(backupPath).length > 0, "backup artifact is empty");
    const inputFd = openSync(backupPath, "r");
    try {
      run(
        "mysql",
        mysqlArgs(admin, ["-D", targetName]),
        { ...process.env, MYSQL_PWD: admin.password },
        inputFd,
      );
    } finally {
      closeSync(inputFd);
    }

    const sourceTableCount = Number(
      query(
        source,
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()",
      ),
    );
    const targetTableCount = Number(
      query(
        admin,
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()",
        targetName,
      ),
    );
    assert.equal(
      targetTableCount,
      sourceTableCount,
      "restored table count differs from source",
    );
    const sourceMigrations = Number(
      query(source, "SELECT COUNT(*) FROM __drizzle_migrations"),
    );
    const targetMigrations = Number(
      query(admin, "SELECT COUNT(*) FROM __drizzle_migrations", targetName),
    );
    assert.equal(
      targetMigrations,
      sourceMigrations,
      "restored migration journal differs from source",
    );
    for (const table of criticalTables) {
      const sourceRows = Number(
        query(source, `SELECT COUNT(*) FROM \`${table}\``),
      );
      const targetRows = Number(
        query(admin, `SELECT COUNT(*) FROM \`${table}\``, targetName),
      );
      assert.equal(
        targetRows,
        sourceRows,
        `restored row count differs for ${table}`,
      );
    }
    console.log(
      `Go-Live backup/restore smoke passed: ${sourceTableCount} tables, ${sourceMigrations} migrations and ${criticalTables.length} critical row-count checks.`,
    );
  } finally {
    try {
      query(admin, `DROP DATABASE IF EXISTS ${quotedTarget}`, admin.database);
    } finally {
      if (existsSync(backupPath)) unlinkSync(backupPath);
    }
  }
}

void main().catch((error) => {
  console.error(
    `Go-Live backup/restore smoke failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
