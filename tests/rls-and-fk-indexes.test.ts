import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "../drizzle/schema";

const drizzleDir = path.resolve("drizzle");

const tables = Object.values(schema).filter((value) => is(value, PgTable));

function columnName(column: { name: string }): string {
  return column.name;
}

function prefixesFor(config: ReturnType<typeof getTableConfig>): string[][] {
  const prefixes: string[][] = [];
  for (const index of config.indexes) {
    prefixes.push(index.config.columns.map((column) => columnName(column as { name: string })));
  }
  for (const unique of config.uniqueConstraints) {
    prefixes.push(unique.columns.map(columnName));
  }
  for (const primaryKey of config.primaryKeys) {
    prefixes.push(primaryKey.columns.map(columnName));
  }
  for (const column of config.columns) {
    if (column.primary) prefixes.push([column.name]);
  }
  return prefixes;
}

describe("public tables stay locked for Supabase", () => {
  it("enables row level security on every Drizzle table", () => {
    const missing = tables
      .map((table) => getTableConfig(table))
      .filter((config) => !config.enableRLS)
      .map((config) => config.name);

    expect(missing).toEqual([]);
    expect(tables.length).toBeGreaterThan(0);
  });

  it("covers every foreign key with a leading index", () => {
    const missing: string[] = [];
    for (const table of tables) {
      const config = getTableConfig(table);
      const prefixes = prefixesFor(config);
      for (const foreignKey of config.foreignKeys) {
        const columns = foreignKey.reference().columns.map(columnName);
        const covered = prefixes.some((prefix) =>
          columns.every((column, index) => prefix[index] === column),
        );
        if (!covered) missing.push(`${config.name}(${columns.join(",")})`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("records RLS in the latest snapshot and in the migrations", () => {
    const journal = JSON.parse(
      readFileSync(path.join(drizzleDir, "meta/_journal.json"), "utf8"),
    ) as { entries: Array<{ idx: number; tag: string }> };
    const latest = journal.entries[journal.entries.length - 1];
    const snapshotPath = path.join(
      drizzleDir,
      "meta",
      `${String(latest.idx).padStart(4, "0")}_snapshot.json`,
    );
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
      tables: Record<string, { name: string; isRLSEnabled?: boolean }>;
    };
    const sql = readdirSync(drizzleDir)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => readFileSync(path.join(drizzleDir, name), "utf8"))
      .join("\n");
    const names = tables.map((table) => getTableConfig(table).name);

    const missingInSnapshot = Object.values(snapshot.tables)
      .filter((table) => table.isRLSEnabled !== true)
      .map((table) => table.name);
    const missingInSql = names.filter(
      (name) => !sql.includes(`ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY;`),
    );

    expect(missingInSnapshot).toEqual([]);
    expect(missingInSql).toEqual([]);
    expect(Object.keys(snapshot.tables)).toHaveLength(names.length);
    expect(sql).not.toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS "pediu_order_items_product_idx"');
  });
});
