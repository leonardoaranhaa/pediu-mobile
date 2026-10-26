import { describe, expect, it } from "vitest";
import { postgresConnectionOptions } from "../server/postgres-url";

describe("Supabase Postgres connection", () => {
  it("uses SSL and disables prepared statements on the transaction pooler", () => {
    const options = postgresConnectionOptions(
      "postgresql://user:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true",
    );

    expect(options.pooled).toBe(true);
    expect(options.prepare).toBe(false);
    expect(options.ssl).toBe("require");
    expect(options.url).not.toContain("sslmode=");
    expect(options.url).not.toContain("pgbouncer=");
    expect(options.url).not.toContain("secret-printed");
  });

  it("keeps a local CI database without SSL", () => {
    const options = postgresConnectionOptions(
      "postgresql://postgres:postgres@127.0.0.1:5432/pediu_test",
    );

    expect(options.pooled).toBe(false);
    expect(options.prepare).toBe(true);
    expect(options.ssl).toBeUndefined();
  });
});
