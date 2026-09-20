export type OperationOutcome = "ok" | "error";

export function recordOperation(input: {
  procedure: string;
  durationMs: number;
  outcome: OperationOutcome;
  code?: string;
}) {
  const payload = {
    scope: "pediu",
    event: "trpc_operation",
    procedure: input.procedure,
    durationMs: Math.round(input.durationMs * 100) / 100,
    outcome: input.outcome,
    ...(input.code ? { code: input.code } : {}),
  };

  if (input.outcome === "error") {
    console.warn("[Pediu][Operation]", JSON.stringify(payload));
    return;
  }

  console.info("[Pediu][Operation]", JSON.stringify(payload));
}
