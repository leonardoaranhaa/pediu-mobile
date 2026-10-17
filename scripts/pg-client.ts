import postgres from "postgres";
import { postgresConnectionOptions } from "../server/postgres-url";

const TABLES_WITHOUT_ID = new Set([
  "pediu_rate_limit_buckets",
  "pediu_account_roles",
]);

export function adaptSql(sql: string): string {
  let text = sql.replace(
    /UTC_TIMESTAMP\(\)/gi,
    "(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')",
  );
  text = text.replace(
    /INTERVAL\s+(\d+)\s+MINUTE/gi,
    "INTERVAL '$1 minutes'",
  );
  let index = 0;
  text = text.replace(/\?/g, () => `$${++index}`);
  text = text.replace(
    /'[^']*'|"[^"]*"|(\b[a-z]+(?:[A-Z][A-Za-z0-9]*)+\b)/g,
    (match, ident) => (ident ? `"${ident}"` : match),
  );
  if (/^\s*insert\s+/i.test(text) && !/\breturning\b/i.test(text)) {
    const table = text
      .match(/insert\s+into\s+("?[\w]+"?)/i)?.[1]
      ?.replace(/"/g, "");
    if (table && !TABLES_WITHOUT_ID.has(table)) text += " RETURNING id";
  }
  return text;
}

type Header = { insertId?: number; affectedRows: number };

function expandArrayPlaceholders(statement: string, params: unknown[]) {
  const values: unknown[] = [];
  let index = 0;
  const text = statement.replace(/\?/g, () => {
    const value = params[index++];
    if (Array.isArray(value)) {
      if (value.length === 0) {
        values.push(null);
        return "NULL";
      }
      return value
        .map((item) => {
          values.push(item);
          return "?";
        })
        .join(", ");
    }
    values.push(value);
    return "?";
  });
  return { text, values };
}

export async function createConnection(databaseUrl: string) {
  const options = postgresConnectionOptions(databaseUrl);
  const sql = postgres(options.url, {
    prepare: options.prepare,
    max: 1,
    ssl: options.ssl,
    connect_timeout: 20,
  });

  async function run(statement: string, params: unknown[] = []) {
    const expanded = expandArrayPlaceholders(statement, params);
    const text = adaptSql(expanded.text);
    const rows = await sql.unsafe(text, expanded.values as never[]);
    const command = /^\s*(\w+)/.exec(statement)?.[1]?.toLowerCase();
    if (command === "select" || command === "with") {
      // postgres.js returns a Result (an Array subclass). Strict equality
      // checks the prototype, so go-live scripts need a plain array of rows.
      return [rows.map((row) => ({ ...row }))];
    }
    const header: Header = {
      affectedRows: rows.count ?? rows.length,
    };
    if (command === "insert" && rows[0] && "id" in rows[0]) {
      header.insertId = Number(rows[0].id);
    }
    return [header];
  }

  const connection: {
    execute: (statement: string, params?: unknown[]) => Promise<any>;
    query: (statement: string, params?: unknown[]) => Promise<any>;
    end: () => Promise<void>;
  } = {
    execute: run,
    query: async (statement: string, params?: unknown[]) => {
      if (/^show\s+tables/i.test(statement.trim())) {
        const rows = await sql<{ name: string }[]>`
          SELECT table_name AS name
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `;
        return [rows.map((row) => ({ name: row.name }))];
      }
      return run(statement, params);
    },
    end: () => sql.end({ timeout: 5 }),
  };
  return connection;
}
