import { describe, expect, it } from "vitest";

import {
  probeReadiness,
  REQUIRED_READINESS_TABLES,
} from "../server/_core/readiness";

function fakeDatabase(results: unknown[]) {
  let index = 0;
  return {
    execute: async () => results[index++],
  };
}

describe("HTTP readiness probe", () => {
  it("fica pronto quando banco, migrations e tabelas críticas estão disponíveis", async () => {
    const database = fakeDatabase([
      [[{ ok: 1 }], []],
      [[{ count: 28 }], []],
      [[{ count: REQUIRED_READINESS_TABLES.length }], []],
    ]);

    await expect(
      probeReadiness({ getDatabase: async () => database }),
    ).resolves.toEqual({
      ready: true,
      checks: [
        { status: "pass", code: "database" },
        { status: "pass", code: "migrations" },
        { status: "pass", code: "tables" },
      ],
    });
  });

  it("fica não pronto sem conexão de banco e não expõe detalhes sensíveis", async () => {
    const result = await probeReadiness({ getDatabase: async () => null });

    expect(result.ready).toBe(false);
    expect(result.checks).toEqual([
      { status: "fail", code: "database" },
      { status: "fail", code: "migrations" },
      { status: "fail", code: "tables" },
    ]);
    expect(JSON.stringify(result)).not.toContain("mysql://");
  });

  it("rejeita migrations vazias ou conjunto incompleto de tabelas", async () => {
    const database = fakeDatabase([
      [[{ ok: 1 }], []],
      [[{ count: 0 }], []],
      [[{ count: REQUIRED_READINESS_TABLES.length - 1 }], []],
    ]);

    const result = await probeReadiness({ getDatabase: async () => database });

    expect(result.ready).toBe(false);
    expect(result.checks).toEqual([
      { status: "pass", code: "database" },
      { status: "fail", code: "migrations" },
      { status: "fail", code: "tables" },
    ]);
  });

  it("falha fechado quando o probe do banco excede o timeout", async () => {
    const result = await probeReadiness({
      getDatabase: () => new Promise(() => undefined),
      timeoutMs: 100,
    });

    expect(result.ready).toBe(false);
    expect(result.checks[0]).toEqual({ status: "fail", code: "database" });
  });
});
