const apiBaseUrl = (
  process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
).replace(/\/$/, "");
const allowedOrigin =
  process.env.CORS_ALLOWED_ORIGIN?.trim() || "http://localhost:8081";

async function main() {
  const oversizedBody = JSON.stringify({
    json: "x".repeat(17 * 1024 * 1024),
  });
  const oversized = await fetch(`${apiBaseUrl}/api/trpc/auth.logout`, {
    method: "POST",
    headers: {
      Origin: allowedOrigin,
      "Content-Type": "application/json",
    },
    body: oversizedBody,
    signal: AbortSignal.timeout(15_000),
  });
  if (oversized.status !== 413) {
    throw new Error(
      `Expected 413 for oversized JSON payload, got HTTP ${oversized.status}`,
    );
  }

  const longVoiceCommand = await fetch(
    `${apiBaseUrl}/api/trpc/pediu.voice.interpret`,
    {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: { mode: "customer", command: "a".repeat(501) },
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (longVoiceCommand.status !== 400) {
    throw new Error(
      `Expected 400 for oversized voice command, got HTTP ${longVoiceCommand.status}`,
    );
  }

  console.log(
    "Go-Live limits security smoke passed: oversized JSON returned 413 and oversized voice command returned 400 before execution.",
  );
}

void main().catch((error) => {
  console.error(
    `Go-Live limits security failed: ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
