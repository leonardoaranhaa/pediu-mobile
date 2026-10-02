import crypto from "node:crypto";
import type { Express, Request, Response } from "express";

export type OperationOutcome = "ok" | "error";

type OperationMetric = {
  count: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
  latencyBuckets: number[];
};

const MAX_PROCEDURES = 256;
const OTHER_PROCEDURE = "__other__";
const LATENCY_BUCKETS = [
  5,
  25,
  50,
  100,
  250,
  500,
  1_000,
  2_500,
  5_000,
  10_000,
  Number.POSITIVE_INFINITY,
];
const operationMetrics = new Map<string, OperationMetric>();
const startedAt = Date.now();

function createMetric(): OperationMetric {
  return {
    count: 0,
    errors: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    latencyBuckets: Array.from({ length: LATENCY_BUCKETS.length }, () => 0),
  };
}

function metricFor(procedure: string) {
  const existing = operationMetrics.get(procedure);
  if (existing) return existing;
  const key =
    operationMetrics.size < MAX_PROCEDURES - 1 ? procedure : OTHER_PROCEDURE;
  const fallback = operationMetrics.get(key);
  if (fallback) return fallback;
  const metric = createMetric();
  operationMetrics.set(key, metric);
  return metric;
}

function percentile95(metric: OperationMetric) {
  if (metric.count === 0) return 0;
  const target = Math.max(1, Math.ceil(metric.count * 0.95));
  let accumulated = 0;
  for (let index = 0; index < metric.latencyBuckets.length; index += 1) {
    accumulated += metric.latencyBuckets[index] ?? 0;
    if (accumulated >= target) {
      const bucket = LATENCY_BUCKETS[index] ?? metric.maxDurationMs;
      return Number.isFinite(bucket)
        ? bucket
        : Math.round(metric.maxDurationMs * 100) / 100;
    }
  }
  return Math.round(metric.maxDurationMs * 100) / 100;
}

export function recordOperation(input: {
  procedure: string;
  durationMs: number;
  outcome: OperationOutcome;
  code?: string;
}) {
  const durationMs = Math.max(0, input.durationMs);
  const metric = metricFor(input.procedure);
  const bucketIndex = LATENCY_BUCKETS.findIndex(
    (bucket) => durationMs <= bucket,
  );
  metric.count += 1;
  metric.errors += input.outcome === "error" ? 1 : 0;
  metric.totalDurationMs += durationMs;
  metric.maxDurationMs = Math.max(metric.maxDurationMs, durationMs);
  metric.latencyBuckets[
    bucketIndex === -1 ? LATENCY_BUCKETS.length - 1 : bucketIndex
  ] += 1;

  const payload = {
    scope: "pediu",
    event: "trpc_operation",
    procedure: input.procedure,
    durationMs: Math.round(durationMs * 100) / 100,
    outcome: input.outcome,
    ...(input.code ? { code: input.code } : {}),
  };

  if (input.outcome === "error") {
    console.warn("[Pediu][Operation]", JSON.stringify(payload));
    return;
  }

  console.info("[Pediu][Operation]", JSON.stringify(payload));
}

export function getOperationMetricsSnapshot() {
  const operations = [...operationMetrics.entries()]
    .map(([procedure, metric]) => ({
      procedure,
      count: metric.count,
      errors: metric.errors,
      errorRate:
        metric.count === 0
          ? 0
          : Math.round((metric.errors / metric.count) * 10_000) / 10_000,
      averageDurationMs:
        metric.count === 0
          ? 0
          : Math.round((metric.totalDurationMs / metric.count) * 100) / 100,
      p95DurationMs: percentile95(metric),
      maxDurationMs: Math.round(metric.maxDurationMs * 100) / 100,
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.procedure.localeCompare(right.procedure),
    );

  const totals = operations.reduce(
    (summary, operation) => ({
      count: summary.count + operation.count,
      errors: summary.errors + operation.errors,
    }),
    { count: 0, errors: 0 },
  );

  return {
    service: "pediu-api",
    generatedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1_000),
    boundedProcedureCardinality: MAX_PROCEDURES,
    totals: {
      ...totals,
      errorRate:
        totals.count === 0
          ? 0
          : Math.round((totals.errors / totals.count) * 10_000) / 10_000,
    },
    operations,
  };
}

export function resetOperationMetrics() {
  operationMetrics.clear();
}

function tokenMatches(request: Request, configuredToken: string) {
  const authorization = request.header("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const expected = Buffer.from(configuredToken);
  const actual = Buffer.from(provided);
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

export function registerObservabilityMetrics(app: Express) {
  app.get("/api/metrics", (request: Request, response: Response) => {
    const configuredToken = process.env.OBSERVABILITY_TOKEN?.trim();
    if (!configuredToken) {
      response.sendStatus(404);
      return;
    }
    if (!tokenMatches(request, configuredToken)) {
      response.sendStatus(401);
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    response.json(getOperationMetricsSnapshot());
  });
}
