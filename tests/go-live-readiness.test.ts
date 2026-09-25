import { describe, expect, it } from "vitest";
import {
  evaluateReadiness,
  REQUIRED_TABLES,
} from "../scripts/go-live-readiness";

const baseEnv = {
  NODE_ENV: "test",
  VITE_APP_ID: "pediu-test",
  JWT_SECRET: "secret-value",
  DATABASE_URL: "mysql://user:password@localhost:3306/pediu_test",
  ALLOWED_ORIGINS: "http://localhost:8081",
  PIX_API_URL: "https://pix.example.test",
  PIX_API_KEY: "pix-secret",
  PAYMENT_WEBHOOK_SECRET: "payment-secret",
  OAUTH_SERVER_URL: "https://oauth.example.test",
  EMAIL_WEBHOOK_URL: "https://email.example.test/webhook",
  EMAIL_VERIFICATION_BASE_URL: "https://pediu.example.test/verify-email",
  EMAIL_WEBHOOK_SECRET: "email-secret",
  BUILT_IN_FORGE_API_URL: "https://storage.example.test",
  BUILT_IN_FORGE_API_KEY: "storage-secret",
} satisfies NodeJS.ProcessEnv;

describe("go-live readiness", () => {
  it("bloqueia produção quando a configuração mínima está incompleta", () => {
    const checks = evaluateReadiness(
      { NODE_ENV: "production", JWT_SECRET: "do-not-print" },
      { healthStatus: 200 },
    );
    const runtime = checks.find((check) => check.id === "runtime-config");

    expect(runtime?.status).toBe("BLOCKED");
    expect(runtime?.detail).toContain("VITE_APP_ID");
    expect(runtime?.detail).not.toContain("do-not-print");
  });

  it("reconhece o núcleo técnico e integrações configuradas sem expor segredos", () => {
    const checks = evaluateReadiness(baseEnv, {
      healthStatus: 200,
      tableNames: [...REQUIRED_TABLES],
      migrationCount: 25,
    });

    expect(
      checks
        .filter((check) => check.status === "PASS")
        .map((check) => check.id),
    ).toEqual(
      expect.arrayContaining([
        "runtime-config",
        "database-config",
        "migrations",
        "api-health",
        "pix",
        "payment-webhook",
        "oauth",
        "email",
        "storage",
      ]),
    );
    expect(
      checks.every(
        (check) =>
          !check.detail.includes("secret-value") &&
          !check.detail.includes("pix-secret"),
      ),
    ).toBe(true);
  });

  it("mantém dependências externas não homologadas como NOT_CONFIGURED", () => {
    const checks = evaluateReadiness(
      { ...baseEnv, PIX_API_KEY: undefined, NODE_ENV: "test" },
      {
        healthStatus: 200,
        tableNames: [...REQUIRED_TABLES],
        migrationCount: 25,
      },
    );

    expect(checks.find((check) => check.id === "pix")?.status).toBe(
      "NOT_CONFIGURED",
    );
    expect(checks.find((check) => check.id === "push")?.status).toBe(
      "NOT_CONFIGURED",
    );
    expect(checks.find((check) => check.id === "backup-restore")?.status).toBe(
      "NOT_CONFIGURED",
    );
    expect(checks.find((check) => check.id === "e2e-devices")?.status).toBe(
      "NOT_CONFIGURED",
    );
  });

  it("rejeita wildcard de origem em produção mesmo com as outras variáveis", () => {
    const checks = evaluateReadiness(
      { ...baseEnv, NODE_ENV: "production", ALLOWED_ORIGINS: "*" },
      { healthStatus: 200 },
    );

    expect(checks.find((check) => check.id === "runtime-config")?.status).toBe(
      "BLOCKED",
    );
    expect(
      checks.find((check) => check.id === "runtime-config")?.detail,
    ).toContain("wildcard");
  });
});
