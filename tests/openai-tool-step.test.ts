import { afterEach, describe, expect, it, vi } from "vitest";
import { ASSISTANT_MAX_COMPLETION_TOKENS, ASSISTANT_REASONING_EFFORT, openAiToolStep } from "../server/_core/openai";

describe("assistant OpenAI request", () => {
  const previousKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });

  it("asks for a short reasoning pass and enough tokens for the reply", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "Oi", tool_calls: [] } }] }),
    } as Response);
    await openAiToolStep({ model: "gpt-5-mini", messages: [], tools: [] });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.max_completion_tokens).toBe(ASSISTANT_MAX_COMPLETION_TOKENS);
    expect(body.max_completion_tokens).toBeGreaterThanOrEqual(2000);
    expect(body.reasoning_effort).toBe(ASSISTANT_REASONING_EFFORT);
  });

  it("drops reasoning effort when the model rejects it", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "unsupported reasoning_effort",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "Oi", tool_calls: [] } }] }),
      } as Response);
    await openAiToolStep({ model: "gpt-4.1-mini", messages: [], tools: [] });
    const retry = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(retry.reasoning_effort).toBeUndefined();
    expect(retry.max_completion_tokens).toBeGreaterThanOrEqual(2000);
  });
});
