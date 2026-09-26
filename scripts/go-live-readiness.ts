import { fileURLToPath } from "node:url";
import path from "node:path";

export type ReadinessStatus = "PASS" | "BLOCKED" | "NOT_CONFIGURED";

export type ReadinessCheck = {
  id: string;
  title: string;
  status: ReadinessStatus;
  detail: string;
};

export const REQUIRED_TABLES = [
  "users",
  "pediu_stores",
  "pediu_orders",
  "pediu_payments",
  "pediu_notifications",
  "pediu_push_tokens",
  "pediu_payment_transactions",
  "pediu_financial_ledger",
  "pediu_webhook_events",
] as const;

function configured(env: NodeJS.ProcessEnv, keys: readonly string[]) {
  return keys.every((key) => Boolean(env[key]?.trim()));
}

export function evaluateReadiness(
  env: NodeJS.ProcessEnv,
  input: {
    healthStatus?: number | null;
    tableNames?: readonly string[];
    migrationCount?: number | null;
  } = {},
): ReadinessCheck[] {
  const production = env.NODE_ENV === "production";
  const requiredRuntimeKeys = [
    "VITE_APP_ID",
    "JWT_SECRET",
    "DATABASE_URL",
    "ALLOWED_ORIGINS",
  ] as const;
  const missingRuntimeKeys = requiredRuntimeKeys.filter(
    (key) => !env[key]?.trim(),
  );
  const origins =
    env.ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  const hasWildcardOrigin = origins.includes("*");
  const tables = input.tableNames ?? [];
  const missingTables = REQUIRED_TABLES.filter(
    (table) => !tables.includes(table),
  );

  const checks: ReadinessCheck[] = [
    {
      id: "runtime-config",
      title: "Configuração mínima do runtime",
      status:
        missingRuntimeKeys.length === 0
          ? "PASS"
          : production
            ? "BLOCKED"
            : "NOT_CONFIGURED",
      detail:
        missingRuntimeKeys.length === 0
          ? "VITE_APP_ID, JWT_SECRET, DATABASE_URL e ALLOWED_ORIGINS estão definidos; valores não são exibidos."
          : `${production ? "Produção bloqueada" : "Não configurado neste ambiente"}: ${missingRuntimeKeys.join(", ")}.`,
    },
  ];

  if (production && hasWildcardOrigin) {
    checks[0] = {
      ...checks[0],
      status: "BLOCKED",
      detail: "Produção bloqueada: ALLOWED_ORIGINS não pode usar o wildcard *.",
    };
  }

  checks.push({
    id: "database-config",
    title: "Conexão de banco configurada",
    status: env.DATABASE_URL?.trim() ? "PASS" : "BLOCKED",
    detail: env.DATABASE_URL?.trim()
      ? "DATABASE_URL está presente; o valor permanece oculto."
      : "DATABASE_URL ausente.",
  });

  checks.push({
    id: "migrations",
    title: "Schema migrado e tabelas críticas presentes",
    status:
      input.migrationCount !== null &&
      input.migrationCount !== undefined &&
      missingTables.length === 0
        ? "PASS"
        : "BLOCKED",
    detail:
      input.migrationCount !== null &&
      input.migrationCount !== undefined &&
      missingTables.length === 0
        ? `${input.migrationCount} migration(s) registrada(s); ${REQUIRED_TABLES.length} tabelas críticas encontradas.`
        : `Schema incompleto: ${missingTables.length ? `faltam ${missingTables.join(", ")}` : "journal de migrations indisponível"}.`,
  });

  checks.push({
    id: "api-health",
    title: "API respondeu ao health check",
    status: input.healthStatus === 200 ? "PASS" : "BLOCKED",
    detail:
      input.healthStatus === 200
        ? "Endpoint de saúde respondeu HTTP 200."
        : `Health check não confirmou HTTP 200${input.healthStatus ? ` (HTTP ${input.healthStatus})` : "."}`,
  });

  const integrationChecks = [
    {
      id: "pix",
      title: "PSP PIX configurado",
      keys: ["PIX_API_URL", "PIX_API_KEY"],
      guidance:
        "Configure PIX_API_URL e PIX_API_KEY após escolher e homologar o PSP.",
    },
    {
      id: "payment-webhook",
      title: "Webhook de pagamento configurado",
      keys: ["PAYMENT_WEBHOOK_SECRET"],
      guidance:
        "Configure PAYMENT_WEBHOOK_SECRET e valide assinatura, duplicidade, falha e reconciliação.",
    },
    {
      id: "oauth",
      title: "OAuth externo configurado",
      keys: ["OAUTH_SERVER_URL"],
      guidance:
        "Configure OAUTH_SERVER_URL e homologue redirect URI, state e PKCE.",
    },
    {
      id: "email",
      title: "E-mail de verificação configurado",
      keys: [
        "EMAIL_WEBHOOK_URL",
        "EMAIL_VERIFICATION_BASE_URL",
        "EMAIL_WEBHOOK_SECRET",
      ],
      guidance: "Configure webhook, base URL e segredo do provedor de e-mail.",
    },
    {
      id: "storage",
      title: "Storage de assets configurado",
      keys: ["BUILT_IN_FORGE_API_URL", "BUILT_IN_FORGE_API_KEY"],
      guidance:
        "Configure BUILT_IN_FORGE_API_URL e BUILT_IN_FORGE_API_KEY antes de publicar assets.",
    },
  ];

  for (const integration of integrationChecks) {
    checks.push({
      id: integration.id,
      title: integration.title,
      status: configured(env, integration.keys) ? "PASS" : "NOT_CONFIGURED",
      detail: configured(env, integration.keys)
        ? "Variáveis necessárias presentes; valores permanecem ocultos."
        : integration.guidance,
    });
  }

  checks.push({
    id: "push",
    title: "Push em dispositivos reais",
    status: "NOT_CONFIGURED",
    detail:
      "Depende de credenciais de push e homologação em Android/iOS; não é inferido por variável local.",
  });
  checks.push({
    id: "backup-restore",
    title: "Backup e restore testados",
    status: "NOT_CONFIGURED",
    detail:
      "Exige rotina de backup, cópia conhecida e restauração em ambiente separado.",
  });
  checks.push({
    id: "e2e-devices",
    title: "E2E crítico e dispositivos reais",
    status: "NOT_CONFIGURED",
    detail:
      "O checker não marca E2E, Android ou iOS como concluídos sem evidência versionada e execução real.",
  });
  checks.push({
    id: "observability",
    title: "Observabilidade e alertas",
    status: "NOT_CONFIGURED",
    detail:
      "Exige monitoramento externo de disponibilidade, erros, latência, banco, webhooks e backups.",
  });

  return checks;
}

function formatChecks(checks: ReadinessCheck[]) {
  const lines = ["Pediu Go-Live Readiness", "========================", ""];
  for (const check of checks)
    lines.push(
      `[${check.status}] ${check.id} — ${check.title}: ${check.detail}`,
    );
  const blocked = checks.filter((check) => check.status === "BLOCKED").length;
  const notConfigured = checks.filter(
    (check) => check.status === "NOT_CONFIGURED",
  ).length;
  lines.push(
    "",
    `Resumo: ${checks.length - blocked - notConfigured} PASS, ${blocked} BLOCKED, ${notConfigured} NOT_CONFIGURED`,
  );
  return lines.join("\n");
}

async function inspectDatabase(databaseUrl: string) {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection(databaseUrl);
  try {
    const [tables] = await connection.query("SHOW TABLES");
    const tableNames = (tables as Array<Record<string, unknown>>).map((row) =>
      String(Object.values(row)[0] ?? ""),
    );
    const [journal] = await connection.query(
      "SELECT COUNT(*) AS count FROM __drizzle_migrations",
    );
    const migrationCount = Number(
      (journal as Array<{ count?: number | string }>)[0]?.count ?? 0,
    );
    return { tableNames, migrationCount };
  } finally {
    await connection.end();
  }
}

export async function runReadiness(env: NodeJS.ProcessEnv = process.env) {
  const apiUrl =
    env.READINESS_API_URL?.trim() ||
    `http://127.0.0.1:${env.PORT?.trim() || "3000"}/api/health`;
  let healthStatus: number | null = null;
  try {
    healthStatus = (await fetch(apiUrl, { signal: AbortSignal.timeout(5_000) }))
      .status;
  } catch {
    healthStatus = null;
  }

  let database = {
    tableNames: [] as string[],
    migrationCount: null as number | null,
  };
  if (env.DATABASE_URL?.trim()) {
    try {
      database = await inspectDatabase(env.DATABASE_URL);
    } catch {
      database = { tableNames: [], migrationCount: null };
    }
  }

  const checks = evaluateReadiness(env, { healthStatus, ...database });
  console.log(formatChecks(checks));
  return checks;
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  void runReadiness()
    .then((checks) => {
      if (checks.some((check) => check.status === "BLOCKED"))
        process.exitCode = 1;
    })
    .catch((error) => {
      console.error("Readiness check failed unexpectedly.");
      process.exitCode = 1;
    });
}
