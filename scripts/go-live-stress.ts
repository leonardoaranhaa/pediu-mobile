import assert from "node:assert/strict";
import { URL } from "node:url";

type Result = {
  ok: boolean;
  status: number;
  durationMs: number;
  endpoint: string;
  error?: string;
};

const baseUrl = (
  process.env.STRESS_BASE_URL ??
  process.env.API_BASE_URL ??
  `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const requests = readPositiveInt("STRESS_REQUESTS", 60);
const concurrency = Math.min(
  readPositiveInt("STRESS_CONCURRENCY", 8),
  requests,
);
const timeoutMs = readPositiveInt("STRESS_TIMEOUT_MS", 5_000);
const maxErrorRate = readRatio("STRESS_MAX_ERROR_RATE", 0);
const maxP95Ms = readPositiveInt("STRESS_MAX_P95_MS", 1_000);
const allowRemote = process.env.STRESS_ALLOW_REMOTE === "1";

function readPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`${name} must be a positive integer`);
  return value;
}

function readRatio(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new Error(`${name} must be between 0 and 1`);
  return value;
}

function assertSafeTarget(raw: string) {
  const target = new URL(raw);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(target.hostname);
  if (!isLocal && !allowRemote) {
    throw new Error(
      "Remote stress target refused. Set STRESS_ALLOW_REMOTE=1 only for an authorized environment.",
    );
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("STRESS_BASE_URL must use http or https");
  }
}

async function request(endpoint: string): Promise<Result> {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    const durationMs = performance.now() - started;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        durationMs,
        endpoint,
        error: `HTTP ${response.status}`,
      };
    }
    const body = await response.json();
    if (endpoint === "/api/health")
      assert.equal(body?.ok, true, "health response must contain ok=true");
    return { ok: true, status: response.status, durationMs, endpoint };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: performance.now() - started,
      endpoint,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}

async function main() {
  assertSafeTarget(baseUrl);
  const endpoints = [
    "/api/health",
    "/api/trpc/pediu.marketplace.search?input=" +
      encodeURIComponent(
        JSON.stringify({
          json: { query: "", category: "Tudo", limit: 20, offset: 0 },
        }),
      ),
  ];
  const results: Result[] = [];
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= requests) return;
      results.push(await request(endpoints[index % endpoints.length]));
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const durations = results
    .map((item) => item.durationMs)
    .sort((a, b) => a - b);
  const failures = results.filter((item) => !item.ok);
  const errorRate = failures.length / results.length;
  const p50 = percentile(durations, 0.5);
  const p95 = percentile(durations, 0.95);
  const max = durations.at(-1) ?? 0;
  console.log(`Go-Live stress baseline: target=${new URL(baseUrl).origin}`);
  console.log(
    `requests=${requests} concurrency=${concurrency} timeoutMs=${timeoutMs}`,
  );
  console.log(
    `p50Ms=${p50.toFixed(1)} p95Ms=${p95.toFixed(1)} maxMs=${max.toFixed(1)} errorRate=${errorRate.toFixed(4)}`,
  );
  if (failures.length) {
    const summary = failures
      .slice(0, 5)
      .map((item) => `${item.endpoint} (${item.error ?? item.status})`)
      .join("; ");
    console.log(`failures=${summary}`);
  }

  assert.ok(results.length === requests, "all planned requests must complete");
  assert.ok(
    errorRate <= maxErrorRate,
    `error rate ${errorRate} exceeds ${maxErrorRate}`,
  );
  assert.ok(p95 <= maxP95Ms, `p95 ${p95.toFixed(1)}ms exceeds ${maxP95Ms}ms`);
  console.log(
    "Go-Live stress baseline passed: read-only health and marketplace requests stayed within budget.",
  );
}

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  return values[
    Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)
  ];
}

void main().catch((error) => {
  console.error(
    `Go-Live stress baseline failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
